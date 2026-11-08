/** 把选择器返回的绝对路径转成相对项目根的写法；项目路径为空或目标在项目外时保留原值 */
export function toProjectRelativePath(projectPath: string, pickedPath: string): string {
  if (!projectPath || !pickedPath) return pickedPath
  const base = projectPath.replace(/\\/g, '/').replace(/\/+$/, '')
  const target = pickedPath.replace(/\\/g, '/')
  if (target.toLowerCase() === base.toLowerCase()) return '.'
  if (!target.toLowerCase().startsWith(`${base.toLowerCase()}/`)) return pickedPath
  return target.slice(base.length + 1)
}
