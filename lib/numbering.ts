import { todayWIB } from './date'
import type { Rec } from './types'

export type NumKind = 'DISPOSISI' | 'SPPD'
export const SPPD_UNIT = 'JNEBDO' // ganti bila kode unit berubah (mis. JNEBDO2)

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const pad3 = (n: number) => String(n).padStart(3, '0')
const s = (v: unknown) => String(v ?? '').trim()

const RE_ASSET = /^#?\s*(\d{1,4})\s*\/\s*DISP\s*\/\s*BDO\s*\/\s*ACU\s*\/\s*([IVX]+)\s*\/\s*(\d{4})$/i
const RE_NON = /^(\d{1,4})\s*\/\s*DISP-REGJB\s*\/\s*BDO\s*\/\s*([IVX]+)\s*\/\s*(\d{4})$/i
const RE_SPPD = /^(\d{1,4})\s*\/\s*SPPD\s*\/\s*Sekre\s*\/\s*(JNEBDO\d*)\s*\/\s*([IVX]+)\s*\/\s*(\d{2})$/i

export type Parsed = { group: string; seq: number; year: number }

export function parseNumber(kind: NumKind, value: unknown): Parsed | null {
  const v = s(value)
  if (!v) return null
  if (kind === 'DISPOSISI') {
    let m = RE_ASSET.exec(v)
    if (m) return { group: 'ASSET', seq: +m[1], year: +m[3] }
    m = RE_NON.exec(v)
    if (m) return { group: 'NON ASSET', seq: +m[1], year: +m[3] }
    return null
  }
  const m = RE_SPPD.exec(v)
  return m ? { group: 'SPPD:' + m[2].toUpperCase(), seq: +m[1], year: 2000 + +m[4] } : null
}

const norm = (v: unknown) => s(v).replace(/\s+/g, '').replace(/^#/, '').toLowerCase()

export function numKey(kind: NumKind, value: unknown): string {
  const p = parseNumber(kind, value)
  return p ? `${p.group}|${p.year}|${p.seq}` : 'raw|' + norm(value)
}

export function formatNumber(kind: NumKind, group: string, seq: number, month: number, year: number): string {
  const rom = ROMAN[month - 1]
  if (kind === 'SPPD') return `${pad3(seq)}/SPPD/Sekre/${group.split(':')[1] || SPPD_UNIT}/${rom}/${String(year).slice(2)}`
  return group === 'ASSET' ? `#${pad3(seq)}/DISP/BDO/ACU/${rom}/${year}` : `${pad3(seq)}/DISP-REGJB/BDO/${rom}/${year}`
}

export function groupFor(kind: NumKind, tipe?: string): string | null {
  if (kind === 'SPPD') return 'SPPD:' + SPPD_UNIT
  const t = s(tipe).toUpperCase()
  return t === 'ASSET' ? 'ASSET' : t === 'NON ASSET' ? 'NON ASSET' : null
}

export type NumberCheck = {
  suggestion: string
  last: string
  gaps: number[]
  duplicate?: Rec
  skipTo?: number
  badFormat: boolean
}

export function checkNumber(
  kind: NumKind, rows: Rec[], field: string,
  opts: { value?: string; tipe?: string; excludeId?: string; today?: string },
): NumberCheck | null {
  const group = groupFor(kind, opts.tipe)
  if (!group) return null
  const today = opts.today || todayWIB()
  const year = +today.slice(0, 4), month = +today.slice(5, 7)

  let max = 0, last = ''
  const used = new Set<number>()
  for (const r of rows) {
    if (r.id === opts.excludeId) continue
    const p = parseNumber(kind, r[field])
    if (!p || p.group !== group || p.year !== year) continue
    used.add(p.seq)
    if (p.seq > max) { max = p.seq; last = s(r[field]) }
  }
  const gaps: number[] = []
  for (let i = 1; i < max; i++) if (!used.has(i)) gaps.push(i)

  const value = s(opts.value)
  const typed = parseNumber(kind, value)
  const duplicate = value
    ? rows.find(r => r.id !== opts.excludeId && numKey(kind, r[field]) === numKey(kind, value))
    : undefined
  const skipTo = typed && typed.group === group && typed.year === year && !duplicate && typed.seq > max + 1 ? max + 1 : undefined

  return {
    suggestion: formatNumber(kind, group, max + 1, month, year),
    last, gaps, duplicate, skipTo,
    badFormat: !!value && !typed,
  }
}

export const EXAMPLE: Record<NumKind, Record<string, string>> = {
  DISPOSISI: { ASSET: '#078/DISP/BDO/ACU/XII/2025', 'NON ASSET': '149/DISP-REGJB/BDO/X/2026' },
  SPPD: { 'SPPD:JNEBDO': '001/SPPD/Sekre/JNEBDO/I/26' },
}