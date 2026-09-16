import { Info, Link2, Terminal, type LucideIcon } from 'lucide-react'
import type { DocItemType } from '@/domain/constants'

interface Style {
  icon: LucideIcon
  className: string
}

export const DOC_ITEM_TYPE_STYLES: Record<DocItemType, Style> = {
  link: { icon: Link2, className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  command: { icon: Terminal, className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  info: { icon: Info, className: 'bg-muted text-muted-foreground' },
}
