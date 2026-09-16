import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ICON_REGISTRY } from './icons'

/** Renders the icon stored on a project or task, or nothing when unset or unknown. */
export function EntityIcon({ name, ...props }: { name?: string } & ComponentProps<LucideIcon>) {
  const Icon = name ? ICON_REGISTRY[name] : undefined
  if (!Icon) return null
  return <Icon aria-hidden {...props} />
}
