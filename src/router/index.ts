import { createRouter, createWebHistory } from 'vue-router'
import { DefaultLayout } from '@/layouts'
import { ROUTE_NAME, ROUTE_PATH } from '@/constants'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: ROUTE_PATH.HOME,
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: ROUTE_NAME.HOME,
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'dashboard',
          name: ROUTE_NAME.DASHBOARD,
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'layout-verify',
          name: ROUTE_NAME.LAYOUT_VERIFY,
          component: () => import('@/views/LayoutVerifyView.vue'),
        },
        {
          path: 'projects',
          name: ROUTE_NAME.PROJECTS,
          component: () => import('@/views/ProjectsView.vue'),
        },
      ],
    },
  ],
})

export default router
