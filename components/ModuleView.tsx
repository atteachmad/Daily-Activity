'use client'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileDown, Pencil, Plus, Search, Trash2, UploadCloud } from 'lucide-react'
import { useStore } from './Store'
import { Empty } from './ui'
import { FormModal } from './FormModal'
import { ImportDialog } from './ImportDialog'
import { createFields, type ModuleCfg } from './modules'
import { downloadTemplate, exportRows } from '@/lib/excel'
import type { Rec } from '@/lib/types'

const PAGE = 25

export function ModuleView({ cfg }: { cfg: ModuleCfg }) {
  const { db, canEdit, insert, update, remove, toast } = useStore()
  const rows = db[cfg.key]
  const [q, setQ] = useState(''); const [flt, setFlt] = useState<Record<string, string>>({}); const [page, setPage] = useState(0)
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; rec: Rec }>(null); const [imp, setImp] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = rows.filter(r =>
      cfg.filters.every(f => !flt[f.key] || f.get(r) === flt[f.key]) &&
      (!needle || cfg.search.some(k => String(r[k] ?? '').toLowerCase().includes(needle))))
    return out.sort((a, b) => String(b[cfg.sort] || '').localeCompare(String(a[cfg.sort] || '')) || String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.reff || b.nomor_sppd || '').localeCompare(String(a.reff || a.nomor_sppd || '')))
  }, [rows, q, flt, cfg])

  const options = useMemo(() => cfg.filters.map(f => f.options(rows)), [rows, cfg])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE)); const cur = Math.min(page, pages - 1)
  const view = filtered.slice(cur * PAGE, cur * PAGE + PAGE)
  const stats = useMemo(() => cfg.stats(rows), [rows, cfg])

  const check = (p: Record<string, unknown>) => { const m = cfg.validate?.(p); if (m) throw new Error(m) }
  const del = async (r: Rec) => { if (!confirm('Hapus data ini? Tindakan tidak bisa dibatalkan.')) return; try { await remove(cfg.key, r.id); toast('Data dihapus') } catch { /* toast */ } }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] mute">{cfg.eyebrow}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight">{cfg.title}</h2></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-soft" onClick={() => downloadTemplate(cfg.key)}><FileDown size={14} />Template</button>
          <button className="btn btn-soft" onClick={() => exportRows(cfg.key, filtered)} disabled={!filtered.length}><Download size={14} />Export</button>
          {canEdit && <button className="btn btn-soft" onClick={() => setImp(true)}><UploadCloud size={14} />Upload rekap</button>}
          {canEdit && <button className="btn btn-dark" onClick={() => setModal({ mode: 'create' })}><Plus size={14} />{cfg.addLabel}</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(s => <div key={s.label} className="card p-4"><p className="text-[10px] font-bold uppercase tracking-wide mute">{s.label}</p><p className="mt-1.5 text-2xl font-extrabold">{s.value}</p>{s.hint && <p className="mt-0.5 text-[11px] mute">{s.hint}</p>}</div>)}
      </div>

      <div className="panel p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
            <input className="field pl-9" placeholder="Cari…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} /></div>
          {cfg.filters.map((f, i) => (
            <select key={f.key} className="field !w-auto" value={flt[f.key] || ''} onChange={e => { setFlt(s => ({ ...s, [f.key]: e.target.value })); setPage(0) }}>
              <option value="">{f.label}</option>{options[i].map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>

        <div className="card scroll-thin max-h-[62vh] overflow-auto !rounded-2xl">
          {view.length === 0 ? <Empty title={rows.length ? 'Tidak ada data yang cocok' : 'Belum ada data'} hint={rows.length ? 'Ubah kata kunci atau filter.' : cfg.emptyHint} /> : (
            <table className="grid">
              <thead><tr>{cfg.columns.map(c => <th key={c.label}>{c.label}</th>)}{canEdit && <th>Aksi</th>}</tr></thead>
              <tbody>{view.map((r, i) => (
                <tr key={r.id}>
                  {cfg.columns.map(c => <td key={c.label}>{c.cell(r, cur * PAGE + i)}</td>)}
                  {canEdit && <td><div className="flex gap-1">
                    <button title="Ubah" className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5" onClick={() => setModal({ mode: 'edit', rec: r })}><Pencil size={14} /></button>
                    <button title="Hapus" className="rounded-lg p-1.5 text-slate-500 hover:bg-[#fde1df] hover:text-[#b5352f]" onClick={() => del(r)}><Trash2 size={14} /></button></div></td>}
                </tr>))}</tbody>
            </table>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs mute">
          <span>{filtered.length ? `${cur * PAGE + 1}–${Math.min((cur + 1) * PAGE, filtered.length)} dari ${filtered.length.toLocaleString('id-ID')}` : '0 data'}{filtered.length !== rows.length && ` (total ${rows.length.toLocaleString('id-ID')})`}</span>
          <div className="flex items-center gap-1">
            <button className="btn btn-soft btn-xs" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Sebelumnya"><ChevronLeft size={13} /></button>
            <span className="px-2">{cur + 1} / {pages}</span>
            <button className="btn btn-soft btn-xs" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Berikutnya"><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      {modal?.mode === 'create' && <FormModal wide title={cfg.addLabel} fields={createFields(cfg)} initial={cfg.defaults()} note={cfg.createNote}
        onClose={() => setModal(null)} onSubmit={async p => { check(p); await insert(cfg.key, p); toast('Data tersimpan') }} />}
      {modal?.mode === 'edit' && <FormModal wide title={`Ubah data — ${cfg.title}`} subtitle="Semua kolom, termasuk tanggal, dapat dikoreksi di sini." fields={cfg.fields} initial={modal.rec}
        onClose={() => setModal(null)} onSubmit={async p => { check(p); await update(cfg.key, modal.rec.id, p); toast('Perubahan tersimpan') }} />}
      {imp && <ImportDialog kind={cfg.key} onClose={() => setImp(false)} />}
    </div>
  )
}
