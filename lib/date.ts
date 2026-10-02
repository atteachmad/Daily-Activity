const pad = (n: number) => String(n).padStart(2, '0')
const ISO = /^\d{4}-\d{2}-\d{2}$/

export const isISO = (s: unknown): s is string => typeof s === 'string' && ISO.test(s)
const utc = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))

/** Tanggal hari ini menurut WIB (yyyy-MM-dd), tidak bergantung zona waktu perangkat. */
export const todayWIB = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export const nowWIB = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))

export const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`

export function diffDays(a?: unknown, b?: unknown): number | null {
  if (!isISO(a) || !isISO(b)) return null
  return Math.round((utc(a) - utc(b)) / 86400000)
}

export function addDays(s: string, n: number) {
  const d = new Date(utc(s) + n * 86400000)
  return ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function fmtDate(s?: unknown) {
  if (!isISO(s)) return '—'
  return new Date(utc(s)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function fmtLong(s: string) {
  return new Date(utc(s)).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export const fmtIDR = (n: unknown) => {
  const v = Number(n)
  return n === '' || n === null || n === undefined || isNaN(v) ? '—' : 'Rp ' + v.toLocaleString('id-ID')
}
