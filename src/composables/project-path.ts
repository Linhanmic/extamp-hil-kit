/** 统一使用 /，并把项目内绝对路径或相对路径写成 ./-前缀的项目相对写法 */
export function toProjectRelativePath(projectPath: string, pickedPath: string): string {
  if (!pickedPath) return pickedPath
  const target = pickedPath.replace(/\\/g, '/')
  const isAbsolute = /^[A-Za-z]:\//.test(target) || target.startsWith('//') || target.startsWith('/')
  const base = projectPath.replace(/\\/g, '/').replace(/\/+$/, '')

  if (isAbsolute) {
    if (!base) return pickedPath
    if (target.toLowerCase() === base.toLowerCase()) return './'
    if (!target.toLowerCase().startsWith(`${base.toLowerCase()}/`)) return pickedPath
    return `./${target.slice(base.length + 1)}`
  }

  const relative = target.replace(/^\.\//, '').replace(/^\/+/, '')
  return relative ? `./${relative}` : pickedPath
}
