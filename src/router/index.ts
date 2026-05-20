import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Canvas',
    component: () => import('../pages/Canvas.vue')
  },
  {
    path: '/prototype',
    name: 'Prototype',
    component: () => import('../pages/Prototype.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
