import { addDays, format, parseISO } from 'date-fns'

/** Local calendar date as `YYYY-MM-DD`. */
export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd')

export const todayISO = () => toISODate(new Date())

export const addDaysISO = (date: string, days: number) => toISODate(addDays(parseISO(date), days))

export function formatDate(date: string, locale: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options ?? { month: 'short', day: 'numeric' }).format(
    parseISO(date),
  )
}
