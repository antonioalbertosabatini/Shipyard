import { createBrowserRouter, createHashRouter, type RouteObject } from 'react-router'
import { AccountPage } from '@/features/auth/AccountPage'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { GuestOnly } from '@/features/auth/GuestOnly'
import { LoginPage } from '@/features/auth/LoginPage'
import { LogoutPage } from '@/features/auth/LogoutPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { SignupPage } from '@/features/auth/SignupPage'
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
      { Component: RequireAuth, children: [{ path: 'account', Component: AccountPage }] },
      { path: '*', Component: NotFoundPage },
    ],
  },
  {
    // Full-screen auth pages, outside the app shell.
    Component: AuthLayout,
    ErrorBoundary: RouteError,
    children: [
      {
        Component: GuestOnly,
        children: [
          { path: 'login', Component: LoginPage },
          { path: 'signup', Component: SignupPage },
          { path: 'forgot-password', Component: ForgotPasswordPage },
        ],
      },
      { path: 'reset-password', Component: ResetPasswordPage },
      { path: 'logout', Component: LogoutPage },
    ],
  },
]

export const router =
  import.meta.env.VITE_ROUTER_MODE === 'hash'
    ? createHashRouter(routes)
    : createBrowserRouter(routes)
