/** Last-write-wins rules shared by the local repositories and the sync engine. */

export interface Versioned {
  updatedAt: string
}

/** Pulls re-read this window before the cursor to catch transactions that committed late. */
export const PULL_OVERLAP_MS = 60_000
export const PULL_PAGE_SIZE = 1000
export const PUSH_BATCH_SIZE = 500

/** Parses an ISO timestamp, dropping sub-millisecond digits (Postgres) that some WebViews reject. */
export const toMillis = (iso: string) => new Date(iso.replace(/(\.\d{3})\d+/, '$1')).getTime()

/** Normalizes any ISO timestamp (e.g. Postgres `+00:00`) to the `…Z` form used locally. */
export function normalizeTimestamp(value: string): string {
  const millis = toMillis(value)
  return Number.isNaN(millis) ? value : new Date(millis).toISOString()
}

/** True when `candidate` should replace `current` (strictly newer, or nothing stored yet). */
export function isNewer(candidate: Versioned, current: Versioned | undefined): boolean {
  return !current || toMillis(candidate.updatedAt) > toMillis(current.updatedAt)
}

/**
 * Timestamp for a new version of a row: the current time, but always after `previous`,
 * so a local edit wins over the version it was based on even if another device's clock runs ahead.
 */
export function nextTimestamp(previous?: string, now = Date.now()): string {
  const floor = previous ? toMillis(previous) + 1 : now
  return new Date(Math.max(now, floor)).toISOString()
}

/** Latest `updatedAt` among `rows`, or `undefined` when empty. */
export function latestTimestamp(rows: Versioned[]): string | undefined {
  let latest: string | undefined
  for (const row of rows) {
    if (!latest || toMillis(row.updatedAt) > toMillis(latest)) latest = row.updatedAt
  }
  return latest
}
