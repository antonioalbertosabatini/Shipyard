import { describe, expect, it } from 'vitest'
import { syncStatusKey } from './syncStatus'

describe('syncStatusKey', () => {
  it('distinguishes synced from pending when idle', () => {
    expect(syncStatusKey({ status: 'idle', pending: 0 })).toBe('synced')
    expect(syncStatusKey({ status: 'idle', pending: 3 })).toBe('pending')
  })

  it('passes through active and failure states', () => {
    expect(syncStatusKey({ status: 'syncing', pending: 1 })).toBe('syncing')
    expect(syncStatusKey({ status: 'offline', pending: 1 })).toBe('offline')
    expect(syncStatusKey({ status: 'error', pending: 0 })).toBe('error')
  })
})
