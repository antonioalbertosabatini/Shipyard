import {
  Download,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { ResponsiveDialog } from '@/components/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { parseBackup, type Backup, type ImportMode } from '@/domain/backup'
import { useAuth } from '@/features/auth/context'
import { SyncStatusIcon } from '@/features/sync/SyncStatusIcon'
import { useSyncState } from '@/features/sync/context'
import { syncStatusKey } from '@/features/sync/syncStatus'
import { formatDate, todayISO } from '@/lib/dates'
import { useTheme } from '@/hooks/use-theme'
import { downloadFile } from '@/lib/download'
import { cn } from '@/lib/utils'
import { useClearData, useExportBackup, useImportBackup } from './hooks'

const ignore = () => {}

function SettingRow({
  title,
  description,
  action,
}: {
  title: ReactNode
  description: ReactNode
  action: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function AccountSection() {
  const { t } = useTranslation()
  const { isConfigured, isReady, user } = useAuth()
  const syncState = useSyncState()
  const status = syncState ? syncStatusKey(syncState) : null

  const description = !isConfigured
    ? t('settings.account.notConfigured')
    : user
      ? t('settings.account.signedIn', { email: user.email })
      : t('settings.account.signedOut')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.account.title')}</CardTitle>
        <CardDescription className="break-all">{description}</CardDescription>
      </CardHeader>
      {isConfigured && isReady && (
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {user ? (
            <>
              {status && (
                <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <SyncStatusIcon status={status} className="size-4" />
                  {t(`sync.status.${status}`)}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/account">
                    <UserRound data-icon="inline-start" />
                    {t('settings.account.manage')}
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/logout">
                    <LogOut data-icon="inline-start" />
                    {t('auth.logout.action')}
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/login">
                  <LogIn data-icon="inline-start" />
                  {t('auth.login.action')}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/signup">{t('settings.account.signUp')}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const synced = !!user
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [clearOpen, setClearOpen] = useState(false)
  const exportBackup = useExportBackup()
  const importBackup = useImportBackup()
  const clearData = useClearData()

  const handleExport = () =>
    exportBackup
      .mutateAsync()
      .then((backup) => {
        downloadFile(`shipyard-backup-${todayISO()}.json`, JSON.stringify(backup, null, 2))
        toast.success(t('settings.data.exported'))
      })
      .catch(ignore)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = parseBackup(await file.text())
    if (!result.success) {
      toast.error(t('settings.data.invalidFile'), { description: result.error })
      return
    }
    setImportMode('merge')
    setPendingImport(result.data)
  }

  const confirmImport = () => {
    if (!pendingImport) return
    importBackup
      .mutateAsync({ data: pendingImport, mode: importMode })
      .then((result) => {
        toast.success(
          t('settings.data.imported', { projects: result.projects, tasks: result.tasks }),
        )
        setPendingImport(null)
      })
      .catch(ignore)
  }

  const confirmClear = () =>
    clearData
      .mutateAsync()
      .then(() => toast.success(t('settings.danger.cleared')))
      .catch(ignore)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t('nav.settings')} description={t('settings.description')} />

      <AccountSection />

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance.title')}</CardTitle>
          <CardDescription>{t('settings.appearance.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={theme}
            onValueChange={(value) => value && setTheme(value)}
            aria-label={t('settings.appearance.title')}
          >
            <ToggleGroupItem value="system">
              <Monitor data-icon="inline-start" />
              {t('settings.appearance.system')}
            </ToggleGroupItem>
            <ToggleGroupItem value="light">
              <Sun data-icon="inline-start" />
              {t('settings.appearance.light')}
            </ToggleGroupItem>
            <ToggleGroupItem value="dark">
              <Moon data-icon="inline-start" />
              {t('settings.appearance.dark')}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.data.title')}</CardTitle>
          <CardDescription>
            {t(synced ? 'settings.data.descriptionSynced' : 'settings.data.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            title={t('settings.data.export')}
            description={t('settings.data.exportDescription')}
            action={
              <Button variant="outline" onClick={handleExport} disabled={exportBackup.isPending}>
                <Download data-icon="inline-start" />
                {t('settings.data.export')}
              </Button>
            }
          />
          <Separator />
          <SettingRow
            title={t('settings.data.import')}
            description={t('settings.data.importDescription')}
            action={
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleFile}
                />
                <Button variant="outline" onClick={() => fileInput.current?.click()}>
                  <Upload data-icon="inline-start" />
                  {t('settings.data.import')}
                </Button>
              </>
            }
          />
        </CardContent>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t('settings.danger.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow
            title={t('settings.danger.clear')}
            description={t(
              synced ? 'settings.danger.descriptionSynced' : 'settings.danger.description',
            )}
            action={
              <Button variant="destructive" onClick={() => setClearOpen(true)}>
                <Trash2 data-icon="inline-start" />
                {t('settings.danger.clear')}
              </Button>
            }
          />
        </CardContent>
      </Card>

      <ResponsiveDialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
        title={t('settings.data.importTitle')}
        description={
          pendingImport &&
          t('settings.data.importSummary', {
            projects: pendingImport.projects.length,
            tasks: pendingImport.tasks.length,
            date: formatDate(pendingImport.exportedAt, i18n.language, { dateStyle: 'medium' }),
          })
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={importMode === 'replace' ? 'destructive' : 'default'}
              onClick={confirmImport}
              disabled={importBackup.isPending}
            >
              {t('settings.data.importConfirm')}
            </Button>
          </>
        }
      >
        <div role="radiogroup" className="grid gap-2">
          {(['merge', 'replace'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={importMode === mode}
              onClick={() => setImportMode(mode)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                importMode === mode ? 'border-primary bg-primary/5' : 'hover:bg-muted',
              )}
            >
              <span className="font-medium">{t(`settings.data.${mode}`)}</span>
              <span className="text-xs text-muted-foreground">
                {t(`settings.data.${mode}Description`)}
              </span>
            </button>
          ))}
        </div>
      </ResponsiveDialog>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title={t('settings.danger.clearTitle')}
        description={t(
          synced ? 'settings.danger.clearDescriptionSynced' : 'settings.danger.clearDescription',
        )}
        confirmLabel={t('settings.danger.clear')}
        onConfirm={confirmClear}
      />
    </div>
  )
}
