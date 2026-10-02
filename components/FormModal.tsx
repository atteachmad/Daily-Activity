'use client'
import { useState } from 'react'
import { Modal, FieldInput, Spinner } from './ui'
import type { Field } from '@/lib/schema'
import type { Rec } from '@/lib/types'

/** Form generik untuk tambah / ubah data. Mengembalikan payload siap kirim (idr/qty sudah numerik). */
export function FormModal({ title, subtitle, fields, initial, note, submitLabel = 'Simpan', onClose, onSubmit, wide }: {
  title: string; subtitle?: string; fields: Field[]; initial: Rec | Record<string, any>; note?: string; submitLabel?: string
  onClose: () => void; onSubmit: (payload: Record<string, unknown>) => Promise<unknown>; wide?: boolean
}) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(f => [f.key, String(initial[f.key] ?? '')])))
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const missing = fields.find(f => f.required && !v[f.key]?.trim())
    if (missing) { setErr(`"${missing.label}" wajib diisi.`); return }
    const payload: Record<string, unknown> = {}
    for (const f of fields) payload[f.key] = f.type === 'number' || f.type === 'idr' ? (v[f.key] === '' ? '' : Number(v[f.key])) : v[f.key].trim()
    setBusy(true); setErr('')
    try { await onSubmit(payload); onClose() } catch (ex: any) { setErr(ex.message || 'Gagal menyimpan') } finally { setBusy(false) }
  }

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} wide={wide}>
      <form onSubmit={submit} className="space-y-4">
        {note && <p className="rounded-xl bg-[#e2eaff]/70 px-3 py-2 text-xs text-[#3b62d1]">{note}</p>}
        <div className={wide ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
          {fields.map(f => (
            <div key={f.key} className={f.type === 'longtext' && wide ? 'sm:col-span-2' : ''}>
              <label className="label" htmlFor={`f-${f.key}`}>{f.label}{f.required && <span className="text-[#d9534f]"> *</span>}</label>
              <FieldInput f={f} value={v[f.key]} onChange={x => setV(s => ({ ...s, [f.key]: x }))} disabled={busy} />
            </div>
          ))}
        </div>
        {err && <p className="rounded-xl bg-[#fde1df] px-3 py-2 text-xs font-semibold text-[#b5352f]">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-soft" onClick={onClose} disabled={busy}>Batal</button>
          <button type="submit" className="btn btn-dark" disabled={busy}>{busy && <Spinner />}{submitLabel}</button>
        </div>
      </form>
    </Modal>
  )
}
