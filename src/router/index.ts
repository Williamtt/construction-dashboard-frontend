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
          path: 'overview',
          redirect: { name: ROUTE_NAME.DASHBOARD },
        },
        {
          path: 'overview/events',
          name: ROUTE_NAME.OVERVIEW_EVENTS,
          component: () => import('@/views/overview/OverviewEventsView.vue'),
        },
        {
          path: 'overview/milestones',
          name: ROUTE_NAME.OVERVIEW_MILESTONES,
          component: () => import('@/views/overview/OverviewMilestonesView.vue'),
        },
        {
          path: 'layout-verify',
          name: ROUTE_NAME.LAYOUT_VERIFY,
          component: () => import('@/views/LayoutVerifyView.vue'),
        },
        {
          path: 'monitoring',
          redirect: { name: ROUTE_NAME.MONITORING_METRICS },
        },
        {
          path: 'monitoring/metrics',
          name: ROUTE_NAME.MONITORING_METRICS,
          component: () => import('@/views/monitoring/MonitoringMetricsView.vue'),
        },
        {
          path: 'monitoring/devices',
          name: ROUTE_NAME.MONITORING_DEVICES,
          component: () => import('@/views/monitoring/MonitoringDevicesView.vue'),
        },
        {
          path: 'monitoring/devices/:deviceId',
          name: ROUTE_NAME.MONITORING_DEVICE_DETAIL,
          component: () => import('@/views/monitoring/MonitoringDeviceDetailView.vue'),
        },
        {
          path: 'monitoring/media',
          name: ROUTE_NAME.MONITORING_MEDIA,
          component: () => import('@/views/monitoring/MonitoringMediaView.vue'),
        },
        {
          path: 'monitoring/reports',
          name: ROUTE_NAME.MONITORING_REPORTS,
          component: () => import('@/views/monitoring/MonitoringReportsView.vue'),
        },
        {
          path: 'monitoring/upload',
          name: ROUTE_NAME.MONITORING_UPLOAD,
          component: () => import('@/views/monitoring/MonitoringUploadView.vue'),
        },
        {
          path: 'contract',
          redirect: { name: ROUTE_NAME.CONTRACT_PROJECT_INFO },
        },
        {
          path: 'contract/project-info',
          name: ROUTE_NAME.CONTRACT_PROJECT_INFO,
          component: () => import('@/views/contract/ContractProjectInfoView.vue'),
        },
        {
          path: 'contract/schedule',
          name: ROUTE_NAME.CONTRACT_SCHEDULE,
          component: () => import('@/views/contract/ContractScheduleView.vue'),
        },
        {
          path: 'contract/management',
          name: ROUTE_NAME.CONTRACT_MANAGEMENT,
          component: () => import('@/views/contract/ContractManagementView.vue'),
        },
        {
          path: 'projects',
          name: ROUTE_NAME.PROJECTS,
          component: () => import('@/views/ProjectsView.vue'),
        },
        {
          path: 'data-table-demo',
          name: ROUTE_NAME.DATA_TABLE_DEMO,
          component: () => import('@/views/DataTableDemoView.vue'),
        },
      ],
    },
  ],
})

export default router
