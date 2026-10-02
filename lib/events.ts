import { addDays, diffDays, isISO } from './date'
import type { DB, Rec } from './types'

export type EvKind = 'DISPOSISI' | 'SPPD' | 'MOM' | 'TODO'
export type Ev = { kind: EvKind; title: string; sub?: string }
export const KIND_COLOR: Record<EvKind, string> = { DISPOSISI: '#4f7cf0', SPPD: '#2f9e6e', MOM: '#d68a1f', TODO: '#111d33' }
export const KIND_LABEL: Record<EvKind, string> = { DISPOSISI: 'Disposisi SLA', SPPD: 'Rekap SPPD', MOM: 'MOM', TODO: 'To-Do' }

const DISPO_DATES: [string, string][] = [
  ['pengajuan_disposisi', 'Pengajuan disposisi'], ['approval_bm', 'Approval BM'], ['approval_head_regional', 'Approval Head Regional'],
  ['approval_vp', 'Approval VP'], ['approval_direksi', 'Approval Direksi'], ['disposisi_selesai', 'Disposisi selesai'], ['disposisi_kirim_user', 'Disposisi dikirim ke user'],
]
const SPPD_DATES: [string, string][] = [['pengajuan_user', 'Pengajuan SPPD'], ['approve_bm', 'Approve BM'], ['sppd_dikirim_user', 'SPPD dikirim ke user']]
const clip = (s: unknown, n = 70) => { const t = String(s ?? ''); return t.length > n ? t.slice(0, n - 1) + '…' : t }

/** Gabungkan semua tanggal dari semua menu menjadi indeks tanggal -> daftar aktivitas. */
export function buildEvents(db: DB): Map<string, Ev[]> {
  const m = new Map<string, Ev[]>()
  const add = (d: unknown, e: Ev) => { if (!isISO(d)) return; const a = m.get(d); a ? a.push(e) : m.set(d, [e]) }

  for (const r of db.DISPOSISI) for (const [k, label] of DISPO_DATES)
    add(r[k], { kind: 'DISPOSISI', title: label, sub: `${r.dept || '—'} · ${clip(r.reff ? `${r.reff} — ${r.disposisi}` : r.disposisi)}` })

  for (const r of db.SPPD) {
    for (const [k, label] of SPPD_DATES) add(r[k], { kind: 'SPPD', title: label, sub: `${r.nomor_sppd || ''} · ${clip(r.karyawan, 50)}` })
    const a = r.mulai_perjalanan, b = isISO(r.berakhir_perjalanan) ? r.berakhir_perjalanan : a
    const span = diffDays(b, a)
    if (isISO(a) && span !== null && span >= 0) for (let i = 0; i <= Math.min(span, 30); i++)
      add(addDays(a, i), { kind: 'SPPD', title: 'Perjalanan dinas', sub: `${clip(r.karyawan, 50)} · ${r.nomor_sppd || ''}` })
  }

  for (const r of db.MOM) {
    add(r.tanggal, { kind: 'MOM', title: 'Rapat (MOM)', sub: clip(r.judul_rapat) })
    add(r.deadline, { kind: 'MOM', title: 'Deadline action item', sub: `${clip(r.judul_rapat, 50)}${r.pic ? ' · PIC ' + r.pic : ''}` })
  }
  for (const r of db.TODO) add(r.tanggal, { kind: 'TODO', title: clip(r.judul), sub: `${r.status}${r.project ? ' · ' + r.project : ''}` })
  return m
}

/** Update terbaru lintas menu (untuk pemantauan). */
export function recentUpdates(db: DB, n = 6) {
  const label = (k: EvKind, r: Rec) => k === 'DISPOSISI' ? clip(r.disposisi, 60) : k === 'SPPD' ? `${r.nomor_sppd} · ${clip(r.karyawan, 36)}` : k === 'MOM' ? clip(r.judul_rapat, 60) : clip(r.judul, 60)
  const all: { kind: EvKind; text: string; at: string }[] = []
  ;(['DISPOSISI', 'SPPD', 'MOM', 'TODO'] as EvKind[]).forEach(k => db[k].forEach(r => { if (r.updated_at) all.push({ kind: k, text: label(k, r), at: String(r.updated_at) }) }))
  return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, n)
}
