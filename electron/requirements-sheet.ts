/**
 * 需求分析表读取：用 SheetJS 把工作表的已用区域读成二维单元格矩阵。
 *
 * 单独成文件是为了让解析链路能在单元测试里跑真实表格——本模块不依赖 Electron。
 * 文件字节由 Node 的 fs 读入再交给 SheetJS：SheetJS 的 ESM 构建里 `readFile` 依赖的
 * 文件系统钩子不会自动接上（打包后调用会直接失败），用 buffer 入口最稳。
 */
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'
import type { SheetCell, SheetTable } from './requirements-parse'

function readWorkbook(filePath: string, options: XLSX.ParsingOptions = {}): WorkBook {
  try {
    return XLSX.read(readFileSync(filePath), { type: 'buffer', ...options })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`无法读取这个文件，请确认是 .xlsx / .xlsm / .xls 格式（${reason}）`)
  }
}

/**
 * 读工作表为二维矩阵。
 *
 * 行列从 0 起算并与 Excel 的行号列号严格对齐（即使工作表的已用区域从 B3 开始，
 * 也补出前面的空行空列），单元格取格式化文本 `w`——用户在 Excel 里看到什么就解析什么。
 */
export function readSheetTable(filePath: string, sheetName: string): SheetTable {
  const workbook = readWorkbook(filePath)

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error(`工作簿里没有工作表「${sheetName}」`)
  if (!sheet['!ref']) return { sheetName, rows: [] }

  const range = XLSX.utils.decode_range(sheet['!ref'])
  const rows: SheetCell[][] = []
  for (let rowIndex = 0; rowIndex <= range.e.r; rowIndex++) {
    const row: SheetCell[] = []
    for (let columnIndex = 0; columnIndex <= range.e.c; columnIndex++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })]
      row.push(cell ? (cell.w ?? cell.v ?? null) : null)
    }
    rows.push(row)
  }

  // 尾部整行空白（Excel 已用区域常见）不计入数据行，避免统计虚高
  while (rows.length && isBlankRow(rows[rows.length - 1] ?? [])) rows.pop()

  return { sheetName, rows }
}

/** 只列工作表名，不解析单元格（选文件后马上要用） */
export function listSheets(filePath: string): string[] {
  return readWorkbook(filePath, { bookSheets: true }).SheetNames
}

function isBlankRow(row: SheetCell[]): boolean {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')
}
