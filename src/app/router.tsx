import { createBrowserRouter, createHashRouter, type RouteObject } from 'react-router'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProjectPage } from '@/features/projects/ProjectPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './NotFoundPage'
import { RouteError } from './RouteError'

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'projects', Component: ProjectsPage },
      { path: 'projects/:projectId', Component: ProjectPage },
      { path: 'settings', Component: SettingsPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router =
  import.meta.env.VITE_ROUTER_MODE === 'hash' ? createHashRouter(routes) : createBrowserRouter(routes)
