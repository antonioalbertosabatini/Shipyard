import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Copy, GripVertical, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DocItem } from '@/domain/schemas'
import { cn } from '@/lib/utils'
import { DOC_ITEM_TYPE_STYLES } from './docStyles'

/** Keeps a click on an action from also opening the edit dialog. */
const contain = (handler: () => void) => (event: { stopPropagation: () => void }) => {
  event.stopPropagation()
  handler()
}

function CopyButton({ content }: { content: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  // The clipboard is unavailable in insecure contexts and can be denied: stay silent then.
  const copy = () => {
    void navigator.clipboard
      ?.writeText(content)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t('doc.copy')}
      title={t(copied ? 'doc.copied' : 'doc.copy')}
      onClick={contain(copy)}
    >
      {copied ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
    </Button>
  )
}

function Content({ item }: { item: DocItem }) {
  const { t } = useTranslation()
  if (item.type === 'link') {
    return (
      <a
        href={item.content}
        target="_blank"
        rel="noreferrer"
        title={t('doc.open')}
        className="font-medium break-all hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {item.content}
      </a>
    )
  }
  return (
    <span className={item.type === 'command' ? 'font-mono text-[0.8125rem]' : 'font-medium'}>
      {item.content}
    </span>
  )
}

/** One documentation item: draggable by its handle, clickable to edit. */
export function DocItemCard({ item, onEdit }: { item: DocItem; onEdit: () => void }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const { icon: Icon, className: tone } = DOC_ITEM_TYPE_STYLES[item.type]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={onEdit}
      className={cn(
        'flex items-start gap-2 rounded-lg bg-card p-2.5 text-sm ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25',
        isDragging && 'relative z-10 shadow-lg ring-foreground/25',
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={t('doc.reorder')}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>

      <Badge variant="secondary" className={cn('mt-1 shrink-0', tone)} title={t('doc.fields.type')}>
        <Icon data-icon="inline-start" />
        {t(`doc.type.${item.type}`)}
      </Badge>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
        <Content item={item} />
        {item.description && (
          <p className="text-xs break-words text-muted-foreground">{item.description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center">
        <CopyButton content={item.content} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('common.edit')}
          onClick={contain(onEdit)}
        >
          <Pencil />
        </Button>
      </div>
    </div>
  )
}
