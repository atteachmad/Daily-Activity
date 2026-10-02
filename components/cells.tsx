'use client'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useStore } from './Store'
import { Pill, Spinner } from './ui'
import { fmtDate } from '@/lib/date'
import type { Rec, SheetKey } from '@/lib/types'

/** Sel tanggal otomatis: klik tombol -> server mencatat tanggal hari ini (WIB). */
export function StampCell({ sheet, rec, field, label = 'Catat' }: { sheet: SheetKey; rec: Rec; field: string; label?: string }) {
  const { canEdit, stamp } = useStore(); const [busy, setBusy] = useState(false)
  const run = async (clear = false) => { setBusy(true); try { await stamp(sheet, rec.id, field, clear) } catch { /* toast ditangani store */ } finally { setBusy(false) } }
  const v = rec[field]
  if (v) return (
    <span className="group inline-flex items-center gap-1 whitespace-nowrap font-medium text-slate-700">{fmtDate(v)}
      {canEdit && <button title="Hapus tanggal ini" disabled={busy} onClick={() => confirm('Hapus tanggal ini?') && run(true)} className="rounded p-0.5 text-slate-400 opacity-0 transition hover:bg-black/5 hover:text-[#d9534f] group-hover:opacity-100">{busy ? <Spinner size={11} /> : <X size={11} />}</button>}
    </span>
  )
  if (!canEdit) return <span className="mute">—</span>
  return <button className="btn btn-soft btn-xs" disabled={busy} onClick={() => run()} title="Catat tanggal hari ini">{busy ? <Spinner size={11} /> : <Check size={11} />}{label}</button>
}

/** Pill status yang bisa diklik (editor) untuk berpindah antara dua nilai. */
export function StatusPill({ sheet, rec, open, done }: { sheet: SheetKey; rec: Rec; open: string; done: string }) {
  const { canEdit, update } = useStore(); const [busy, setBusy] = useState(false)
  const isDone = rec.status === done
  const toggle = async () => { setBusy(true); try { await update(sheet, rec.id, { status: isDone ? open : done }) } catch { /* toast */ } finally { setBusy(false) } }
  return <Pill tone={isDone ? 'green' : 'amber'} onClick={canEdit && !busy ? toggle : undefined} title={canEdit ? 'Klik untuk mengubah status' : undefined}>{busy && <Spinner size={10} />}{isDone ? done : open}</Pill>
}
