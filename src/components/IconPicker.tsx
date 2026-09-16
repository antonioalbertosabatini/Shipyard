import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ENTITY_ICONS, ICON_NAMES } from './icons'

/** `penTool` → `pen tool`, so screen readers announce something pronounceable. */
const humanize = (name: string) => name.replace(/([A-Z])/g, ' $1').toLowerCase()

const option =
  'flex size-8 items-center justify-center rounded-md text-muted-foreground ring-offset-2 ring-offset-background transition outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
const selected = 'bg-accent text-foreground ring-2 ring-foreground'

/** Radiogroup of curated icons; the first option clears the selection (empty value). */
export function IconPicker({
  labelId,
  value,
  onChange,
}: {
  labelId: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="flex max-h-44 flex-wrap gap-1 overflow-y-auto rounded-md border p-2"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        aria-label={t('icon.none')}
        title={t('icon.none')}
        onClick={() => onChange('')}
        className={cn(option, !value && selected)}
      >
        <Ban className="size-4" />
      </button>
      {ICON_NAMES.map((name) => {
        const Icon = ENTITY_ICONS[name]
        const label = t('icon.label', { name: humanize(name) })
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === name}
            aria-label={label}
            title={label}
            onClick={() => onChange(name)}
            className={cn(option, value === name && selected)}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
