/** 车型名统一归一化：删除所有空白字符，破折号改为下划线 */
export function normalizeVehicleName(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/-/g, '_')
}

/** 按常见分隔符拆分并归一化多车型字符串 */
export function normalizeVehicleList(raw: string): string[] {
  return raw
    .split(/[/、,，;；]/)
    .map((part) => normalizeVehicleName(part))
    .filter(Boolean)
}
