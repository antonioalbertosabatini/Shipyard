import { FolderKanban, LayoutDashboard, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import { Brand } from '@/components/Brand'
import { cn } from '@/lib/utils'
import { useProjects } from '@/features/projects/hooks'
import { SyncStatusIndicator } from '@/features/sync/SyncStatusIndicator'

const NAV_ITEMS = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/projects', end: false, icon: FolderKanban, label: 'nav.projects' },
  { to: '/settings', end: false, icon: Settings, label: 'nav.settings' },
] as const

const sidebarLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
  )

export function AppLayout() {
  const { t } = useTranslation()
  const { data: projects } = useProjects()
  const activeProjects = projects?.filter((p) => !p.archived) ?? []

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center px-4">
          <Brand />
        </div>
        <nav aria-label={t('nav.main')} className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={sidebarLink}>
              <Icon className="size-4" />
              {t(label)}
            </NavLink>
          ))}
        </nav>
        {activeProjects.length > 0 && (
          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <p className="px-4 pb-1 text-xs font-medium text-muted-foreground">
              {t('nav.activeProjects')}
            </p>
            <nav
              aria-label={t('nav.activeProjects')}
              className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 pb-4"
            >
              {activeProjects.map((project) => (
                <NavLink key={project.id} to={`/projects/${project.id}`} className={sidebarLink}>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
        <div className="mt-auto px-2 pb-3 empty:hidden">
          <SyncStatusIndicator variant="sidebar" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <Brand />
        <SyncStatusIndicator variant="header" />
      </header>

      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-24 md:px-8 md:pb-10">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground',
                isActive && 'font-medium text-foreground',
              )
            }
          >
            <Icon className="size-5" />
            {t(label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
