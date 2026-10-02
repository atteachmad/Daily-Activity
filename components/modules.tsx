import { DEPTS, STATUS_DISPO, STATUS_MOM, TIPE } from '@/lib/config'
import { DISPOSISI_FIELDS, MOM_FIELDS, SPPD_FIELDS, type Field, type ImportKind } from '@/lib/schema'
import { dispoSla, sppdSla } from '@/lib/sla'
import { diffDays, fmtDate, fmtIDR, todayWIB } from '@/lib/date'
import type { Rec } from '@/lib/types'
import { Pill } from './ui'
import { StampCell, StatusPill } from './cells'

export type Col = { label: string; cell: (r: Rec, i: number) => React.ReactNode }
export type Filter = { key: string; label: string; get: (r: Rec) => string; options: (rows: Rec[]) => string[] }
export type ModuleCfg = {
  key: ImportKind; eyebrow: string; title: string; addLabel: string; fields: Field[]; createKeys: string[]; createNote?: string
  defaults: () => Record<string, string>; search: string[]; sort: string; filters: Filter[]; columns: Col[]
  stats: (rows: Rec[]) => { label: string; value: string; hint?: string }[]; validate?: (p: Record<string, unknown>) => string | null; emptyHint: string
}

const pick = (keys: string[]) => keys.map(k => DISPOSISI_FIELDS.find(f => f.key === k) || SPPD_FIELDS.find(f => f.key === k) || MOM_FIELDS.find(f => f.key === k)!)
const year = (v: unknown) => (typeof v === 'string' && /^\d{4}/.test(v) ? v.slice(0, 4) : '')
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))]
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')
const dayTxt = (n: number | null) => (n === null ? '' : `${n} hari`)
const monthNow = () => todayWIB().slice(0, 7)
const years = (key: string) => (rows: Rec[]) => uniq(rows.map(r => year(r[key]))).sort().reverse()
const Sm = ({ children }: { children: React.ReactNode }) => <span className="block text-[11px] mute">{children}</span>

export const DISPOSISI: ModuleCfg = {
  key: 'DISPOSISI', eyebrow: 'Workspace / Disposisi SLA', title: 'Disposisi SLA', addLabel: 'Tambah disposisi',
  fields: DISPOSISI_FIELDS, createKeys: ['tipe', 'dept', 'reff', 'disposisi', 'qty', 'idr', 'status', 'keterangan'],
  createNote: 'Tanggal Pengajuan Disposisi terisi otomatis (hari ini, WIB). Approval BM → Kirim ke User dicatat dari tabel dengan tombol tanggal.',
  defaults: () => ({ status: 'On Progres' }), search: ['reff', 'disposisi', 'keterangan', 'dept'], sort: 'pengajuan_disposisi',
  emptyHint: 'Belum ada data. Klik "Tambah disposisi" atau "Upload rekap" untuk memindahkan data lama.',
  filters: [
    { key: 'tipe', label: 'Semua tipe', get: r => r.tipe || '', options: () => TIPE },
    { key: 'dept', label: 'Semua dept', get: r => r.dept || '', options: rows => uniq([...DEPTS, ...rows.map(r => r.dept)]) },
    { key: 'status', label: 'Semua status', get: r => r.status || '', options: () => STATUS_DISPO },
    { key: 'tahun', label: 'Semua tahun', get: r => year(r.pengajuan_disposisi || r.pengajuan_user), options: years('pengajuan_disposisi') },
  ],
  stats: rows => {
    const s = rows.map(dispoSla)
    const bm = s.filter(x => x.bm !== null), nb = s.filter(x => x.nonBm !== null)
    return [
      { label: 'Total disposisi', value: rows.length.toLocaleString('id-ID') },
      { label: 'On Progres', value: rows.filter(r => r.status !== 'Done').length.toLocaleString('id-ID'), hint: `${rows.filter(r => r.status === 'Done').length} selesai` },
      { label: 'SLA BM (≤ 3 hari)', value: pct(bm.filter(x => x.bm).length, bm.length), hint: `${bm.length} terhitung` },
      { label: 'SLA Non BM (≤ 10 hari)', value: pct(nb.filter(x => x.nonBm).length, nb.length), hint: `${nb.length} terhitung` },
    ]
  },
  columns: [
    { label: 'No', cell: (_, i) => <span className="mute">{i + 1}</span> },
    { label: 'Tipe / Dept', cell: r => <>{r.tipe ? <Pill tone={r.tipe === 'ASSET' ? 'blue' : 'amber'}>{r.tipe}</Pill> : <span className="mute">—</span>}<Sm>{r.dept || '—'}</Sm></> },
    { label: 'REFF & Disposisi', cell: r => <div className="min-w-[260px] max-w-[380px]"><span className="block text-[11px] font-semibold text-slate-500">{r.reff || '—'}</span><span className="block font-medium text-slate-800">{r.disposisi}</span>{r.keterangan && <Sm>{r.keterangan}</Sm>}</div> },
    { label: 'Qty · IDR', cell: r => <span className="whitespace-nowrap">{r.qty ? `${r.qty} ×` : ''} {fmtIDR(r.idr)}</span> },
    { label: 'Pengajuan', cell: r => <span className="whitespace-nowrap">{fmtDate(r.pengajuan_disposisi)}</span> },
    { label: 'Approval BM', cell: r => <StampCell sheet="DISPOSISI" rec={r} field="approval_bm" label="Setujui" /> },
    { label: 'Head Regional', cell: r => <StampCell sheet="DISPOSISI" rec={r} field="approval_head_regional" label="Setujui" /> },
    { label: 'VP', cell: r => <StampCell sheet="DISPOSISI" rec={r} field="approval_vp" label="Setujui" /> },
    { label: 'Direksi', cell: r => <StampCell sheet="DISPOSISI" rec={r} field="approval_direksi" label="Setujui" /> },
    { label: 'Selesai', cell: r => <StampCell sheet="DISPOSISI" rec={r} field="disposisi_selesai" label="Selesai" /> },
    { label: 'Kirim ke User', cell: r => <StampCell sheet="DISPOSISI" rec={r} field="disposisi_kirim_user" label="Kirim" /> },
    { label: 'SLA', cell: r => { const s = dispoSla(r); return <div className="flex flex-col gap-1">
      {s.bm !== null && <Pill tone={s.bm ? 'green' : 'red'}>BM · {dayTxt(s.bmDays)}</Pill>}
      {s.nonBm !== null && <Pill tone={s.nonBm ? 'green' : 'red'}>Non BM · {dayTxt(s.nonBmDays)}</Pill>}
      {s.bm === null && s.nonBm === null && <span className="mute">—</span>}</div> } },
    { label: 'Status', cell: r => <StatusPill sheet="DISPOSISI" rec={r} open="On Progres" done="Done" /> },
  ],
}

export const SPPD: ModuleCfg = {
  key: 'SPPD', eyebrow: 'Workspace / Rekap SPPD', title: 'Rekap SPPD', addLabel: 'Terbitkan SPPD baru',
  fields: SPPD_FIELDS, createKeys: ['nomor_sppd', 'karyawan', 'mulai_perjalanan', 'berakhir_perjalanan'],
  createNote: 'Tanggal Pengajuan User terisi otomatis (hari ini, WIB). Approve BM & SPPD Dikirim ke User dicatat dari tabel dengan tombol tanggal.',
  defaults: () => ({}), search: ['nomor_sppd', 'karyawan'], sort: 'pengajuan_user', emptyHint: 'Belum ada data. Klik "Terbitkan SPPD baru" atau "Upload rekap".',
  validate: p => (p.mulai_perjalanan && p.berakhir_perjalanan && String(p.berakhir_perjalanan) < String(p.mulai_perjalanan) ? 'Tanggal berakhir tidak boleh sebelum tanggal mulai.' : null),
  filters: [
    { key: 'tahun', label: 'Semua tahun', get: r => year(r.pengajuan_user || r.mulai_perjalanan), options: years('pengajuan_user') },
    { key: 'sla', label: 'Semua SLA', get: r => { const s = sppdSla(r); return s.ok === null ? 'Belum terhitung' : s.ok ? 'Achive' : 'Tidak achive' }, options: () => ['Achive', 'Tidak achive', 'Belum terhitung'] },
  ],
  stats: rows => {
    const s = rows.map(sppdSla).filter(x => x.ok !== null)
    return [
      { label: 'Total SPPD', value: rows.length.toLocaleString('id-ID') },
      { label: 'Bulan ini', value: rows.filter(r => String(r.pengajuan_user || '').startsWith(monthNow())).length.toString(), hint: 'berdasar tanggal pengajuan' },
      { label: 'SLA (≤ 3 hari)', value: pct(s.filter(x => x.ok).length, s.length), hint: `${s.length} terhitung` },
      { label: 'Menunggu approval BM', value: rows.filter(r => r.pengajuan_user && !r.approve_bm).length.toString() },
    ]
  },
  columns: [
    { label: 'No', cell: (_, i) => <span className="mute">{i + 1}</span> },
    { label: 'Nomor SPPD', cell: r => <span className="whitespace-nowrap font-semibold text-slate-800">{r.nomor_sppd}</span> },
    { label: 'Karyawan', cell: r => <span className="block min-w-[200px] max-w-[340px]">{r.karyawan}</span> },
    { label: 'Perjalanan Dinas', cell: r => <span className="whitespace-nowrap">{fmtDate(r.mulai_perjalanan)}{r.berakhir_perjalanan && r.berakhir_perjalanan !== r.mulai_perjalanan ? ` → ${fmtDate(r.berakhir_perjalanan)}` : ''}{(() => { const d = diffDays(r.berakhir_perjalanan, r.mulai_perjalanan); return d !== null && d >= 0 ? <Sm>{d + 1} hari</Sm> : null })()}</span> },
    { label: 'Pengajuan User', cell: r => <span className="whitespace-nowrap">{fmtDate(r.pengajuan_user)}</span> },
    { label: 'Approve BM', cell: r => <StampCell sheet="SPPD" rec={r} field="approve_bm" label="Approve" /> },
    { label: 'Dikirim ke User', cell: r => <StampCell sheet="SPPD" rec={r} field="sppd_dikirim_user" label="Kirim" /> },
    { label: 'SLA', cell: r => { const s = sppdSla(r); return s.ok === null ? <span className="mute">—</span> : <Pill tone={s.ok ? 'green' : 'red'}>{s.ok ? 'Achive' : 'Tidak achive'} · {dayTxt(s.days)}</Pill> } },
  ],
}

export const MOM: ModuleCfg = {
  key: 'MOM', eyebrow: 'Workspace / MOM', title: 'Minutes of Meeting', addLabel: 'Buat MOM',
  fields: MOM_FIELDS, createKeys: ['tanggal', 'judul_rapat', 'peserta', 'pembahasan', 'keputusan', 'action_items', 'pic', 'deadline', 'status'],
  defaults: () => ({ tanggal: todayWIB(), status: 'Open' }), search: ['judul_rapat', 'peserta', 'pembahasan', 'keputusan', 'action_items', 'pic'], sort: 'tanggal',
  emptyHint: 'Belum ada MOM. Klik "Buat MOM" atau "Upload rekap".',
  filters: [
    { key: 'status', label: 'Semua status', get: r => r.status || '', options: () => STATUS_MOM },
    { key: 'tahun', label: 'Semua tahun', get: r => year(r.tanggal), options: years('tanggal') },
  ],
  stats: rows => [
    { label: 'Total MOM', value: rows.length.toLocaleString('id-ID') },
    { label: 'Action item open', value: rows.filter(r => r.status !== 'Done').length.toString() },
    { label: 'Selesai', value: rows.filter(r => r.status === 'Done').length.toString() },
    { label: 'Lewat deadline', value: rows.filter(r => r.status !== 'Done' && r.deadline && r.deadline < todayWIB()).length.toString() },
  ],
  columns: [
    { label: 'Tanggal', cell: r => <span className="whitespace-nowrap">{fmtDate(r.tanggal)}</span> },
    { label: 'Judul & Peserta', cell: r => <div className="min-w-[220px] max-w-[320px]"><span className="block font-semibold text-slate-800">{r.judul_rapat}</span>{r.peserta && <Sm>{r.peserta}</Sm>}</div> },
    { label: 'Pembahasan & Keputusan', cell: r => <div className="min-w-[240px] max-w-[360px] whitespace-pre-line">{r.pembahasan}{r.keputusan && <Sm>Keputusan: {r.keputusan}</Sm>}</div> },
    { label: 'Action Items', cell: r => <div className="min-w-[200px] max-w-[300px] whitespace-pre-line">{r.action_items || '—'}{r.pic && <Sm>PIC: {r.pic}</Sm>}</div> },
    { label: 'Deadline', cell: r => <span className={`whitespace-nowrap ${r.status !== 'Done' && r.deadline && r.deadline < todayWIB() ? 'font-semibold text-[#b5352f]' : ''}`}>{fmtDate(r.deadline)}</span> },
    { label: 'Status', cell: r => <StatusPill sheet="MOM" rec={r} open="Open" done="Done" /> },
  ],
}

export const MODULES = { DISPOSISI, SPPD, MOM }
export const createFields = (cfg: ModuleCfg) => pick(cfg.createKeys)
