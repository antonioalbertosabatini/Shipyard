import { ORDER_STEP } from './constants'

/** Anything positioned inside a list (or a kanban column) by a float `order`. */
export interface Ordered {
  id: string
  order: number
  updatedAt: string
}

/** Minimum distance between neighbours before a list gets renumbered. */
const MIN_GAP = 1e-6

export function sortByOrder<T extends Pick<Ordered, 'order'>>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order)
}

export const clampIndex = (index: number, length: number) => Math.max(0, Math.min(index, length))

export type OrderPlacement =
  | { kind: 'order'; order: number }
  /** Neighbours are too close: renumber the whole list. */
  | { kind: 'rebalance' }

/**
 * Computes the `order` for an item inserted at `index` into `siblings`
 * (already sorted, not containing the moved item).
 */
export function placeAt(siblings: Pick<Ordered, 'order'>[], index: number): OrderPlacement {
  const clamped = clampIndex(index, siblings.length)
  const before = siblings[clamped - 1]?.order
  const after = siblings[clamped]?.order

  if (before === undefined && after === undefined) return { kind: 'order', order: ORDER_STEP }
  if (before === undefined) return { kind: 'order', order: after! - ORDER_STEP }
  if (after === undefined) return { kind: 'order', order: before + ORDER_STEP }
  if (after - before < MIN_GAP) return { kind: 'rebalance' }
  return { kind: 'order', order: (before + after) / 2 }
}

/**
 * Puts `moved` at `index` among `siblings` (sorted, without `moved`) and returns the rows to
 * persist, keyed by id: just `moved`, or the whole renumbered list when the gap collapses.
 */
export function positionIn<T extends Ordered>(
  siblings: T[],
  moved: T,
  index: number,
  now: string,
): Map<string, T> {
  const placement = placeAt(siblings, index)
  if (placement.kind === 'order') return new Map([[moved.id, { ...moved, order: placement.order }]])

  const list = [...siblings]
  list.splice(clampIndex(index, siblings.length), 0, moved)
  const changed = new Map<string, T>()
  list.forEach((item, i) => {
    const order = (i + 1) * ORDER_STEP
    if (item === moved || item.order !== order)
      changed.set(item.id, { ...item, order, updatedAt: now })
  })
  return changed
}

/**
 * Moves an item to position `index` of a flat list (index counted without the moved item).
 * Returns a new array in the same order as `items`; only rows that changed are new objects,
 * so callers can detect which ones to persist by reference.
 */
export function applyReorder<T extends Ordered>(
  items: T[],
  id: string,
  index: number,
  now: string,
): T[] {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) return items

  const siblings = sortByOrder(items.filter((candidate) => candidate.id !== id))
  const replacements = positionIn(siblings, { ...item, updatedAt: now }, index, now)
  return items.map((candidate) => replacements.get(candidate.id) ?? candidate)
}
