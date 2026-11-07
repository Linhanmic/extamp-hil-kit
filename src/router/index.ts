import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { NAV_ITEMS } from '@/config/navigation'
import HomeView from '../views/HomeView.vue'

// 已接入真实功能的导航项：其余项仍走占位页
const NAV_VIEWS: Record<string, () => Promise<unknown>> = {
  config: () => import('../views/ConfigView.vue'),
  'slot-map': () => import('../views/SlotMapView.vue'),
  output: () => import('../views/OutputView.vue'),
  meter: () => import('../views/MeterView.vue'),
  snapshot: () => import('../views/SnapshotView.vue'),
  spec: () => import('../views/SpecView.vue'),
  concept: () => import('../views/ConceptView.vue'),
  requirement: () => import('../views/RequirementView.vue'),
}

// 桌面端生产构建由 Electron 通过 file:// 加载，history 模式在 file 协议下无法匹配路由，
// 因此 file 协议下改用 hash history；开发服务器与 Web 预览仍保持 history 模式
const isFileProtocol = location.protocol === 'file:'

const router = createRouter({
  history: isFileProtocol
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: '首页' },
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
      meta: { title: '关于' },
    },
    // 侧栏导航项：未接入功能的共用占位页，标题取自 meta
    ...NAV_ITEMS.map((item) => ({
      path: item.path,
      name: item.name,
      component: NAV_VIEWS[item.name] ?? (() => import('../views/FeatureView.vue')),
      meta: { title: item.label },
    })),
  ],
})

export default router
