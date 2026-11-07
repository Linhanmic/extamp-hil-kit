export interface SpecTreeNode {
  type: 'directory' | 'file'
  name: string
  path: string
  children: SpecTreeNode[]
}

/**
 * 从 specs 下的相对文件路径构建层级树。
 * 根就是 specs 的下一层，不显示 specs 自身；空目录因没有文件自然不会出现。
 */
export function buildSpecTree(files: { name: string; path: string }[]): SpecTreeNode[] {
  const root: SpecTreeNode = { type: 'directory', name: '', path: '', children: [] }
  for (const file of files) {
    const parts = file.name.split('/').filter(Boolean)
    if (!parts.length) continue
    let current = root
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      const path = parts.slice(0, index + 1).join('/')
      let child = current.children.find((node) => node.name === part && node.type === (isFile ? 'file' : 'directory'))
      if (!child) {
        child = {
          type: isFile ? 'file' : 'directory',
          name: part,
          path: isFile ? file.path : path,
          children: [],
        }
        current.children.push(child)
      }
      current = child
    })
  }

  const sort = (nodes: SpecTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })
    for (const node of nodes) sort(node.children)
  }
  sort(root.children)
  return root.children
}

export function specDisplayName(fileName: string): string {
  return fileName.replace(/\.spec$/i, '')
}
