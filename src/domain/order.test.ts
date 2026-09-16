import { describe, expect, it } from 'vitest'
import { ORDER_STEP } from './constants'
import { applyReorder, placeAt, type Ordered } from './order'

const orders = (...values: number[]) => values.map((order) => ({ order }))

const item = (id: string, order: number): Ordered => ({
  id,
  order,
  updatedAt: '2026-09-01T00:00:00.000Z',
})

describe('placeAt', () => {
  it('starts an empty list at ORDER_STEP', () => {
    expect(placeAt([], 0)).toEqual({ kind: 'order', order: ORDER_STEP })
  })

  it('places before the first item', () => {
    expect(placeAt(orders(1000, 2000), 0)).toEqual({ kind: 'order', order: 0 })
  })

  it('places after the last item, clamping large indexes', () => {
    expect(placeAt(orders(1000, 2000), 99)).toEqual({ kind: 'order', order: 3000 })
  })

  it('places between neighbours', () => {
    expect(placeAt(orders(1000, 2000), 1)).toEqual({ kind: 'order', order: 1500 })
  })

  it('asks for a rebalance when neighbours are too close', () => {
    expect(placeAt(orders(1, 1 + 1e-9), 1)).toEqual({ kind: 'rebalance' })
  })
})

describe('applyReorder', () => {
  const now = '2026-09-15T10:00:00.000Z'
  const ids = (items: Ordered[]) => [...items].sort((a, b) => a.order - b.order).map((i) => i.id)

  it('moves an item to the given index', () => {
    const items = [item('a', 1000), item('b', 2000), item('c', 3000)]
    const result = applyReorder(items, 'c', 1, now)
    expect(ids(result)).toEqual(['a', 'c', 'b'])
    expect(result[2]).toMatchObject({ id: 'c', order: 1500, updatedAt: now })
    expect(result[0]).toBe(items[0])
  })

  it('renumbers the list when there is no room left', () => {
    const items = [item('a', 1), item('b', 1 + 1e-9), item('c', 5)]
    const result = applyReorder(items, 'c', 1, now)
    expect(ids(result)).toEqual(['a', 'c', 'b'])
    expect(result.map((i) => i.order)).toEqual([1000, 3000, 2000])
  })

  it('returns the same array for unknown items', () => {
    const items = [item('a', 1000)]
    expect(applyReorder(items, 'nope', 0, now)).toBe(items)
  })
})
