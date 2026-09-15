import { describe, expect, it } from 'vitest'
import { isNewer, latestTimestamp, nextTimestamp, normalizeTimestamp } from './sync'

describe('isNewer', () => {
  it('accepts any version when nothing is stored', () => {
    expect(isNewer({ updatedAt: '2026-09-15T10:00:00.000Z' }, undefined)).toBe(true)
  })

  it('compares instants, not strings', () => {
    // 09:00 at UTC-2 is 11:00Z: newer, although it sorts first as a string.
    expect(
      isNewer(
        { updatedAt: '2026-09-15T09:00:00.000-02:00' },
        { updatedAt: '2026-09-15T10:00:00.000Z' },
      ),
    ).toBe(true)
  })

  it('treats equal timestamps as not newer', () => {
    expect(
      isNewer(
        { updatedAt: '2026-09-15T10:00:00.000+00:00' },
        { updatedAt: '2026-09-15T10:00:00.000Z' },
      ),
    ).toBe(false)
  })
})

describe('nextTimestamp', () => {
  const now = Date.parse('2026-09-15T10:00:00.000Z')

  it('uses the current time for new rows or older versions', () => {
    expect(nextTimestamp(undefined, now)).toBe('2026-09-15T10:00:00.000Z')
    expect(nextTimestamp('2026-09-15T09:00:00.000Z', now)).toBe('2026-09-15T10:00:00.000Z')
  })

  it('stays after a version written by a clock that runs ahead', () => {
    expect(nextTimestamp('2026-09-15T12:00:00.000Z', now)).toBe('2026-09-15T12:00:00.001Z')
  })
})

describe('latestTimestamp', () => {
  it('returns the most recent value, or undefined for no rows', () => {
    expect(latestTimestamp([])).toBeUndefined()
    expect(
      latestTimestamp([
        { updatedAt: '2026-09-15T10:00:00.000Z' },
        { updatedAt: '2026-09-15T09:30:00.000-01:00' },
        { updatedAt: '2026-09-15T08:00:00.000Z' },
      ]),
    ).toBe('2026-09-15T09:30:00.000-01:00')
  })
})

describe('normalizeTimestamp', () => {
  it('converts Postgres timestamps to UTC milliseconds', () => {
    expect(normalizeTimestamp('2026-09-15T12:00:00.123456+02:00')).toBe('2026-09-15T10:00:00.123Z')
  })

  it('leaves unparsable values untouched so validation can reject them', () => {
    expect(normalizeTimestamp('yesterday')).toBe('yesterday')
  })
})
