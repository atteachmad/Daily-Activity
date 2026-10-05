import { addDays, ymd } from './date'
import type { Ev } from './events'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTH_ALIAS: Record<string, number> = {
  januari: 0, jan: 0, februari: 1, feb: 1, maret: 2, mar: 2, april: 3, apr: 3, mei: 4, juni: 5, jun: 5, juli: 6, jul: 6,
  agustus: 7, agust: 7, agu: 7, agt: 7, ags: 7, september: 8, sept: 8, sep: 8, oktober: 9, okt: 9, november: 10, nov: 10, desember: 11, des: 11,
}
const MON = Object.keys(MONTH_ALIAS).sort((a, b) => b.length - a.length).join('|')
const RE_A = new RegExp(`(?:tanggal|tgl)\\s+(\\d{1,2})(?:\\s+(?:bulan\\s+)?(${MON})\\b|\\s+bulan\\s+(\\d{1,2})\\b)?(?:\\s+(?:tahun\\s+)?(\\d{4}))?`)
const RE_B = new RegExp(`\\b(\\d{1,2})\\s+(${MON})\\b(?:\\s+(?:tahun\\s+)?(\\d{4}))?`)
const RE_C = /\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/

export const MSG_NONE = 'Tidak ada agenda pada tanggal tersebut.'
export const MSG_NO_DATE = 'Maaf, saya belum menangkap tanggalnya. Coba katakan, misalnya: agenda tanggal 5 Oktober, atau hari ini ada agenda apa.'
export const MSG_INVALID = 'Maaf, tanggal yang Anda sebut tidak valid.'
export const MSG_UNKNOWN = 'Maaf, saya belum mengerti. Coba tanyakan agenda, misalnya: agenda tanggal 5 Oktober.'

const UNIT: Record<string, number> = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 }

/** "dua puluh lima" -> "25", "lima belas" -> "15", "sebelas" -> "11" */
function wordsToDigits(s: string) {
  const t = s.split(' '); const out: string[] = []
  for (let i = 0; i < t.length; i++) {
    const w = t[i]
    if (w === 'sepuluh') { out.push('10'); continue }
    if (w === 'sebelas') { out.push('11'); continue }
    if (UNIT[w]) {
      if (t[i + 1] === 'belas') { out.push(String(10 + UNIT[w])); i += 1; continue }
      if (t[i + 1] === 'puluh') { let v = UNIT[w] * 10; i += 1; if (UNIT[t[i + 1]]) { v += UNIT[t[i + 1]]; i += 1 } out.push(String(v)); continue }
      out.push(String(UNIT[w])); continue
    }
    out.push(w)
  }
  return out.join(' ')
}

const normalize = (s: string) => wordsToDigits(s.toLowerCase().replace(/[,;:!?"“”]/g, ' ').replace(/\s+/g, ' ').trim())

function mk(y: number, m0: number, d: number): string | null {
  if (y < 2000 || y > 2100) return null
  const dt = new Date(Date.UTC(y, m0, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m0 && dt.getUTCDate() === d ? ymd(y, m0, d) : null
}

export type Parsed = { kind: 'date'; date: string } | { kind: 'invalid' } | null

/** Tangkap tanggal dari ucapan: "tanggal 5 oktober", "tanggal 6", "5/10/2026", "hari ini", "besok", "lusa", "kemarin". */
export function parseSpokenDate(text: string, today: string): Parsed {
  const t = normalize(text); const Y = +today.slice(0, 4), M = +today.slice(5, 7) - 1
  const year = (v?: string) => (v ? (v.length === 2 ? 2000 + +v : +v) : Y)
  const done = (s: string | null): Parsed => (s ? { kind: 'date', date: s } : { kind: 'invalid' })
  let m = t.match(RE_A)
  if (m) return done(mk(year(m[4]), m[2] ? MONTH_ALIAS[m[2]] : m[3] ? +m[3] - 1 : M, +m[1]))
  m = t.match(RE_B); if (m) return done(mk(year(m[3]), MONTH_ALIAS[m[2]], +m[1]))
  m = t.match(RE_C); if (m) return done(mk(year(m[3]), +m[2] - 1, +m[1]))
  if (/\blusa\b/.test(t)) return { kind: 'date', date: addDays(today, 2) }
  if (/\bbesok\b/.test(t)) return { kind: 'date', date: addDays(today, 1) }
  if (/\bkemarin\b/.test(t)) return { kind: 'date', date: addDays(today, -1) }
  if (/\bhari ini\b|\bsekarang\b/.test(t)) return { kind: 'date', date: today }
  return null
}

const clean = (s: unknown, n = 80) => { const t = String(s ?? '').replace(/[#\/\\|]+/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t }
const label = (date: string, today: string) => `${+date.slice(8, 10)} ${MONTHS[+date.slice(5, 7) - 1]}${date.slice(0, 4) !== today.slice(0, 4) ? ' ' + date.slice(0, 4) : ''}`

/** Susun kalimat agenda untuk satu tanggal dari indeks acara dashboard (buildEvents). */
export function agendaText(date: string, events: Map<string, Ev[]>, today: string): string {
  const list = events.get(date) || []
  if (!list.length) return MSG_NONE
  const named: string[] = []; let dispo = 0, sppd = 0
  for (const e of list) {
    let s = ''
    if (e.kind === 'TODO') s = clean(e.title) + (String(e.sub || '').startsWith('Done') ? ' (sudah selesai)' : '')
    else if (e.kind === 'MOM') s = `${e.title.startsWith('Rapat') ? 'rapat' : 'tindak lanjut rapat'} ${clean(e.sub)}`
    else if (e.kind === 'SPPD' && e.title === 'Perjalanan dinas') s = `perjalanan dinas ${clean(String(e.sub || '').split(' · ')[0], 50)}`
    else if (e.kind === 'SPPD') sppd++
    else dispo++
    if (s && !named.includes(s)) named.push(s)
  }
  const tail = [dispo && `${dispo} aktivitas disposisi SLA`, sppd && `${sppd} proses SPPD`].filter(Boolean).join(' dan ')
  let text = `Pada tanggal ${label(date, today)}, `
  if (named.length) {
    const more = named.length - 5
    text += `agenda Anda adalah ${named.slice(0, 5).join(', ')}${more > 0 ? `, dan ${more} agenda lainnya` : ''}`
    if (tail) text += `. Selain itu terdapat ${tail}`
  } else text += `terdapat ${tail}`
  return text + '.'
}

/** Jawaban lengkap untuk hasil pengenalan suara (boleh beberapa alternatif transkrip). */
export function answerFor(alts: string[], events: Map<string, Ev[]>, today: string): { text: string; date?: string } {
  const parsed = alts.map(a => parseSpokenDate(a, today))
  const hit = parsed.find(p => p?.kind === 'date')
  if (hit && hit.kind === 'date') return { text: agendaText(hit.date, events, today), date: hit.date }
  if (parsed.some(p => p?.kind === 'invalid')) return { text: MSG_INVALID }
  return { text: /agenda|jadwal|acara|kegiatan|to ?do|rapat/i.test(alts[0] || '') ? MSG_NO_DATE : MSG_UNKNOWN }
}

/** Ejaan singkatan supaya dibaca benar oleh suara TTS. */
export const forSpeech = (t: string) => t.replace(/\bSLA\b/g, 'S L A').replace(/\bSPPD\b/g, 'S P P D').replace(/\bMOM\b/g, 'M O M').replace(/\bBM\b/g, 'B M')
