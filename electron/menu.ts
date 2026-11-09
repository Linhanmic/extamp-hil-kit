import { Menu, app, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'

/** 菜单 → 渲染层事件（preload 转发后由 App.vue 处理） */
export type MenuAction =
  | 'open-project'
  | 'open-settings'
  | 'toggle-sidebar'
  | 'toggle-panel'
  | 'toggle-second-sidebar'
  | 'toggle-design-grid'
  | 'go-home'
  | 'go-queue'
  | 'run-queue'
  | 'clear-queue'
  | 'reload'

function send(win: BrowserWindow | null, action: MenuAction) {
  win?.webContents.send('menu:action', action)
}

function isMac() {
  return process.platform === 'darwin'
}

/**
 * 应用菜单：命令均可从菜单到达，快捷键与渲染层一致。
 * 无边框窗口下 Windows 用 Alt 呼出（autoHideMenuBar）。
 */
export function buildApplicationMenu(getWindow: () => BrowserWindow | null) {
  const mac = isMac()
  const mod = mac ? 'Cmd' : 'Ctrl'

  const template: MenuItemConstructorOptions[] = []

  if (mac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about', label: '关于' },
        { type: 'separator' },
        {
          label: '项目设置…',
          accelerator: 'Cmd+,',
          click: () => send(getWindow(), 'open-settings'),
        },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    })
  }

  template.push(
    {
      label: '文件',
      submenu: [
        {
          label: '打开项目…',
          accelerator: `${mod}+O`,
          click: () => send(getWindow(), 'open-project'),
        },
        { type: 'separator' },
        {
          label: '项目设置…',
          accelerator: `${mod}+,`,
          click: () => send(getWindow(), 'open-settings'),
          visible: !mac,
        },
        ...(mac
          ? []
          : ([
              { type: 'separator' },
              { role: 'quit', label: '退出', accelerator: `${mod}+Q` },
            ] as MenuItemConstructorOptions[])),
        ...(mac
          ? ([{ type: 'separator' }, { role: 'close', label: '关闭窗口' }] as MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '首页',
          accelerator: `${mod}+Shift+H`,
          click: () => send(getWindow(), 'go-home'),
        },
        {
          label: '测试队列',
          accelerator: `${mod}+Shift+Q`,
          click: () => send(getWindow(), 'go-queue'),
        },
        { type: 'separator' },
        {
          label: '显示/隐藏左栏',
          accelerator: `${mod}+B`,
          click: () => send(getWindow(), 'toggle-sidebar'),
        },
        {
          label: '显示/隐藏底部面板',
          accelerator: `${mod}+J`,
          click: () => send(getWindow(), 'toggle-panel'),
        },
        {
          label: '显示/隐藏右栏',
          accelerator: `${mod}+Shift+B`,
          click: () => send(getWindow(), 'toggle-second-sidebar'),
        },
        { type: 'separator' },
        {
          label: '设计网格',
          accelerator: `${mod}+Shift+G`,
          click: () => send(getWindow(), 'toggle-design-grid'),
        },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
        { role: 'toggleDevTools', label: '开发者工具' },
        {
          label: '重新加载',
          accelerator: mac ? 'Cmd+R' : 'Ctrl+R',
          click: () => send(getWindow(), 'reload'),
        },
      ],
    },
    {
      label: '运行',
      submenu: [
        {
          label: '执行测试队列',
          accelerator: `${mod}+Enter`,
          click: () => send(getWindow(), 'run-queue'),
        },
        {
          label: '清空队列',
          click: () => send(getWindow(), 'clear-queue'),
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '项目文档',
          click: () => {
            void shell.openExternal('https://github.com/Linhanmic/extamp-hil-kit#readme')
          },
        },
        {
          label: '用户与开发参考',
          click: () => {
            void shell.openExternal(
              'https://github.com/Linhanmic/extamp-hil-kit/blob/main/docs/reference.md',
            )
          },
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => send(getWindow(), 'go-home'),
        },
      ],
    },
  )

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  return menu
}
