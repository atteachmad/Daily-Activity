'use client'
import { useRef, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-react'
import { Modal, Spinner } from './ui'
import { useStore } from './Store'
import { downloadTemplate, parseWorkbook, type ParseResult } from '@/lib/excel'
import { keyOf, MODULE_LABEL, type ImportKind } from '@/lib/schema'
import { fmtDate } from '@/lib/date'
import type { Rec } from '@/lib/types'

const PREVIEW: Record<ImportKind, { k: string; l: string; date?: boolean }[]> = {
  DISPOSISI: [{ k: 'reff', l: 'REFF' }, { k: 'dept', l: 'Dept' }, { k: 'disposisi', l: 'Disposisi' }],
  SPPD: [{ k: 'nomor_sppd', l: 'Nomor SPPD' }, { k: 'karyawan', l: 'Karyawan' }, { k: 'pengajuan_user', l: 'Pengajuan', date: true }],
  MOM: [{ k: 'tanggal', l: 'Tanggal', date: true }, { k: 'judul_rapat', l: 'Judul' }, { k: 'pic', l: 'PIC' }],
}
const CHUNK = 120

export function ImportDialog({ kind, onClose }: { kind: ImportKind; onClose: () => void }) {
  const { db, bulk, refresh, toast } = useStore()
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState(''); const [parsing, setParsing] = useState(false); const [err, setErr] = useState('')
  const [parsed, setParsed] = useState<ParseResult | null>(null); const [fresh, setFresh] = useState<Rec[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [drag, setDrag] = useState(false)

  const onFile = async (file?: File) => {
    if (!file) return
    setErr(''); setParsed(null); setResult(null); setFileName(file.name); setParsing(true)
    try {
      const p = await parseWorkbook(file, kind)
      const existing = new Set(db[kind].map(r => keyOf(kind, r)))
      setFresh(p.records.filter(r => !existing.has(keyOf(kind, r)))); setParsed(p)
      if (!p.records.length) setErr('Tidak ada baris data yang dikenali. Pastikan memakai template dari tombol "Unduh template" (judul kolom di baris 1).')
    } catch (e: any) { setErr('File tidak bisa dibaca: ' + (e.message || e)) } finally { setParsing(false) }
  }

  const run = async () => {
    setProgress({ done: 0, total: fresh.length }); setErr('')
    let inserted = 0, skipped = 0
    try {
      for (let i = 0; i < fresh.length; i += CHUNK) {
        const r = await bulk(kind, fresh.slice(i, i + CHUNK))
        inserted += r.inserted; skipped += r.skipped
        setProgress({ done: Math.min(i + CHUNK, fresh.length), total: fresh.length })
      }
      setResult({ inserted, skipped }); toast(`${inserted} data berhasil diimpor`)
    } catch (e: any) { setErr(`Terhenti: ${e.message}. ${inserted} baris sudah masuk — ulangi upload, baris yang sudah ada otomatis dilewati.`) }
    finally { setProgress(null); await refresh() }
  }

  const already = parsed ? parsed.records.length - fresh.length : 0
  return (
    <Modal title={`Upload Rekap — ${MODULE_LABEL[kind]}`} subtitle="Pindahkan riwayat rekap manual ke dashboard. Aman diulang: data yang sudah ada tidak digandakan." onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/60 px-4 py-3 text-xs text-slate-600">
          <span>1. Unduh template → 2. isi / tempel data lama → 3. upload di bawah.</span>
          <button className="btn btn-soft" onClick={() => downloadTemplate(kind)}><Download size={14} />Unduh template</button>
        </div>

        {!result && (
          <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]) }}
            onClick={() => input.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${drag ? 'border-[#111d33] bg-white/80' : 'border-slate-300 bg-white/40 hover:bg-white/60'}`}>
            {parsing ? <Spinner size={26} /> : <UploadCloud size={28} className="text-slate-500" />}
            <p className="text-sm font-semibold">{fileName || 'Klik atau seret file .xlsx / .xls / .csv ke sini'}</p>
            <p className="text-xs mute">Format rekap lama (beberapa sheet per tahun) juga dikenali otomatis.</p>
            <input ref={input} type="file" hidden accept=".xlsx,.xls,.csv" onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        )}

        {err && <p className="rounded-xl bg-[#fde1df] px-3 py-2 text-xs font-semibold text-[#b5352f]">{err}</p>}

        {parsed && parsed.records.length > 0 && !result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[['Terbaca', parsed.records.length], ['Data baru', fresh.length], ['Sudah ada', already], ['Baris kosong/ringkasan', parsed.emptyRows]].map(([l, v]) => (
                <div key={l as string} className="card p-3"><p className="text-[10px] font-bold uppercase tracking-wide mute">{l}</p><p className="mt-1 text-xl font-extrabold">{(v as number).toLocaleString('id-ID')}</p></div>
              ))}
            </div>
            <p className="text-xs text-slate-600"><FileSpreadsheet size={13} className="mr-1 inline" />Sheet dipakai: {parsed.sheets.map(s => `${s.name} (${s.rows})`).join(', ')}{parsed.ignoredSheets.length > 0 && <span className="mute"> · dilewati: {parsed.ignoredSheets.join(', ')}</span>}</p>
            {fresh.length > 0 && (
              <div className="scroll-thin overflow-x-auto rounded-2xl bg-white/60">
                <table className="tbl"><thead><tr>{PREVIEW[kind].map(c => <th key={c.k}>{c.l}</th>)}</tr></thead>
                  <tbody>{fresh.slice(0, 5).map((r, i) => <tr key={i}>{PREVIEW[kind].map(c => <td key={c.k} className="max-w-[260px] truncate">{c.date ? fmtDate(r[c.k]) : String(r[c.k] ?? '—')}</td>)}</tr>)}</tbody></table>
                {fresh.length > 5 && <p className="px-3 py-2 text-[11px] mute">…dan {fresh.length - 5} baris lainnya</p>}
              </div>
            )}
          </div>
        )}

        {progress && (
          <div><div className="h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full bg-[#111d33] transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
            <p className="mt-1 text-xs mute">Mengimpor {progress.done} / {progress.total}… jangan tutup jendela ini.</p></div>
        )}

        {result && (
          <div className="flex items-start gap-3 rounded-2xl bg-[#dcf3e8] px-4 py-3 text-sm text-[#23805a]">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div><p className="font-bold">{result.inserted} data berhasil diimpor</p>{result.skipped > 0 && <p className="text-xs">{result.skipped} baris dilewati (sudah ada).</p>}<p className="mt-1 text-xs">Dashboard sudah diperbarui.</p></div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn btn-soft" onClick={onClose} disabled={!!progress}>{result ? 'Tutup' : 'Batal'}</button>
          {!result && <button className="btn btn-dark" disabled={!fresh.length || !!progress} onClick={run}>{progress && <Spinner />}Impor {fresh.length ? fresh.length.toLocaleString('id-ID') + ' data' : ''}</button>}
        </div>
      </div>
    </Modal>
  )
}
