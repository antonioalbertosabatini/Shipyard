import { ICON_REGISTRY } from '@/components/icons'
import type { Project } from '@/domain/schemas'
import { cn } from '@/lib/utils'

/** The project icon tinted with its color, falling back to the plain color dot when unset. */
export function ProjectGlyph({
  project,
  className,
  dotClassName,
}: {
  project: Pick<Project, 'color' | 'icon'>
  className?: string
  dotClassName?: string
}) {
  const Icon = project.icon ? ICON_REGISTRY[project.icon] : undefined
  if (!Icon)
    return (
      <span
        className={cn('shrink-0 rounded-full', dotClassName)}
        style={{ backgroundColor: project.color }}
      />
    )
  return <Icon aria-hidden className={cn('shrink-0', className)} style={{ color: project.color }} />
}
