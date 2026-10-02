import * as XLSX from 'xlsx'
import { DEPT_ALIAS } from './config'
import { FIELDS, MODULE_LABEL, ROW_KEY, TEMPLATE_EXAMPLE, keyOf, type Field, type ImportKind } from './schema'
import { ymd } from './date'
import type { Rec } from './types'

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/* ---------------------------------------------------------------- parsing nilai */

function toISO(v: unknown): string {
  if (v === null || v === undefined || v === '') return ''
  if (v instanceof Date) return ymd(v.getFullYear(), v.getMonth(), v.getDate())
  if (typeof v === 'number') {
    if (v < 20000 || v > 80000) return ''
    const d = new Date(Math.round((v - 25569) * 86400000)) // serial Excel -> UTC
    return ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  }
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/) // dd/mm/yyyy (format Indonesia)
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return ymd(y, +m[2] - 1, +m[1]) }
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)
  if (m) return ymd(+m[1], +m[2] - 1, +m[3])
  const t = Date.parse(s)
  return isNaN(t) ? '' : (d => ymd(d.getFullYear(), d.getMonth(), d.getDate()))(new Date(t))
}

export function parseIDR(v: unknown): number | '' {
  if (typeof v === 'number') return v
  let s = String(v ?? '').toLowerCase().replace(/rp\.?|\s|,-|-/g, '')
  if (!s) return ''
  s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? '' : n
}

function coerce(f: Field, v: unknown): string | number {
  if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return ''
  if (f.type === 'date') return toISO(v)
  if (f.type === 'idr') return parseIDR(v)
  if (f.type === 'number') { const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')); return isNaN(n) ? '' : n }
  return String(v).replace(/\s+/g, ' ').trim()
}

function normalize(kind: ImportKind, r: Rec) {
  if (kind === 'DISPOSISI') {
    if (r.dept) r.dept = DEPT_ALIAS[String(r.dept).toLowerCase().trim()] || r.dept
    r.status = /done|selesai/i.test(String(r.status || '')) ? 'Done' : 'On Progres'
    if (r.tipe) r.tipe = /non/i.test(String(r.tipe)) ? 'NON ASSET' : 'ASSET'
  }
  if (kind === 'MOM') r.status = /done|selesai|closed/i.test(String(r.status || '')) ? 'Done' : 'Open'
  return r
}

/* ---------------------------------------------------------------- deteksi header */

type Mapping = Map<number, Field>

function mapHeaders(kind: ImportKind, cells: unknown[]): Mapping {
  const m: Mapping = new Map(); const used = new Set<string>()
  cells.forEach((c, i) => {
    const key = norm(c); if (!key) return
    const f = FIELDS[kind].find(x => !used.has(x.key) && (x.aliases || []).includes(key))
    if (f) { m.set(i, f); used.add(f.key) } // kemunculan pertama saja (abaikan kolom hitung di kanan)
  })
  return m
}

function findHeader(kind: ImportKind, rows: unknown[][]) {
  let best = { score: 0, row: -1, span: 1, map: new Map() as Mapping }
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const single = mapHeaders(kind, rows[r] || [])
    if (single.size > best.score) best = { score: single.size, row: r, span: 1, map: single }
    // header dua baris (mis. "Pengajuan" + "Disposisi")
    const a = rows[r] || [], b = rows[r + 1] || []
    const len = Math.max(a.length, b.length)
    const combo = Array.from({ length: len }, (_, i) => `${a[i] ?? ''} ${b[i] ?? ''}`.trim())
    const dbl = mapHeaders(kind, combo)
    if (dbl.size > best.score) best = { score: dbl.size, row: r, span: 2, map: dbl }
  }
  const keyField = kind === 'DISPOSISI' ? ['reff', 'disposisi'] : kind === 'SPPD' ? ['nomor_sppd'] : ['judul_rapat']
  const hasKey = [...best.map.values()].some(f => keyField.includes(f.key))
  return best.score >= 3 && hasKey ? best : null
}

/* ---------------------------------------------------------------- import */

export type ParseResult = {
  records: Rec[]; sheets: { name: string; rows: number }[]; ignoredSheets: string[]; duplicatesInFile: number; emptyRows: number
}

export async function parseWorkbook(file: File, kind: ImportKind): Promise<ParseResult> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
  const records: Rec[] = []; const sheets: { name: string; rows: number }[] = []; const ignoredSheets: string[] = []
  const seen = new Map<string, Rec>(); let duplicatesInFile = 0; let emptyRows = 0

  for (const name of wb.SheetNames) {
    if (/^(petunjuk|contoh|panduan)$/i.test(name.trim())) continue
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: null })
    const h = findHeader(kind, rows)
    if (!h) { ignoredSheets.push(name); continue }

    let count = 0
    for (let r = h.row + h.span; r < rows.length; r++) {
      const rec: Rec = { id: '' }
      h.map.forEach((f, col) => { const v = coerce(f, rows[r]?.[col]); if (v !== '') rec[f.key] = v })
      if (kind === 'DISPOSISI' && !rec.tipe && /^asset$/i.test(name.trim())) rec.tipe = 'ASSET'
      if (kind === 'DISPOSISI' && !rec.tipe && /non/i.test(name)) rec.tipe = 'NON ASSET'
      if (!ROW_KEY[kind](rec)) { emptyRows++; continue }
      normalize(kind, rec)
      const k = keyOf(kind, rec)
      const prev = seen.get(k)
      if (prev) { // duplikat antar-sheet: lengkapi field yang masih kosong, jangan timpa
        duplicatesInFile++
        for (const key of Object.keys(rec)) if (key !== 'id' && (prev[key] === undefined || prev[key] === '')) prev[key] = rec[key]
        continue
      }
      seen.set(k, rec); records.push(rec); count++
    }
    sheets.push({ name, rows: count })
  }
  return { records, sheets, ignoredSheets, duplicatesInFile, emptyRows }
}

/* ---------------------------------------------------------------- template & export */

function save(wb: XLSX.WorkBook, name: string) { XLSX.writeFile(wb, name) }

export function downloadTemplate(kind: ImportKind) {
  const fields = FIELDS[kind]
  const wb = XLSX.utils.book_new()

  const tpl = XLSX.utils.aoa_to_sheet([fields.map(f => f.label)])
  tpl['!cols'] = fields.map(f => ({ wch: Math.max(f.label.length + 4, f.type === 'longtext' ? 40 : 16) }))
  XLSX.utils.book_append_sheet(wb, tpl, 'Template')

  const ex = TEMPLATE_EXAMPLE[kind]
  const sample = XLSX.utils.aoa_to_sheet([fields.map(f => f.label), fields.map(f => ex[f.key] ?? '')])
  sample['!cols'] = tpl['!cols']
  XLSX.utils.book_append_sheet(wb, sample, 'Contoh')

  const guide: (string | number)[][] = [
    [`PETUNJUK PENGISIAN — ${MODULE_LABEL[kind]}`], [],
    ['1. Isi data pada sheet "Template" mulai baris 2. Jangan mengubah / menghapus judul kolom (baris 1).'],
    ['2. Format tanggal: yyyy-mm-dd (mis. 2026-01-07) atau dd/mm/yyyy (mis. 07/01/2026). Sel bertipe tanggal Excel juga dikenali.'],
    ['3. Kolom IDR boleh ditulis "Rp. 21.450.000,-" atau 21450000.'],
    ['4. Baris yang REFF / Nomor SPPD-nya sudah ada di dashboard otomatis dilewati — aman meng-upload file yang sama berulang kali.'],
    ['5. Tanggal pada file TIDAK diubah menjadi hari ini; riwayat tetap utuh seperti yang tertulis.'],
    ['6. Sheet "Contoh" hanya contoh dan tidak ikut diimpor.'], [],
    ['Nilai yang dikenali:'],
  ]
  fields.filter(f => f.type === 'select' && f.options).forEach(f => guide.push([`${f.label}:`, f.options!.join(' | ')]))
  const g = XLSX.utils.aoa_to_sheet(guide); g['!cols'] = [{ wch: 28 }, { wch: 110 }]
  XLSX.utils.book_append_sheet(wb, g, 'Petunjuk')
  save(wb, `Template-${MODULE_LABEL[kind].replace(/\s+/g, '-')}.xlsx`)
}

export function exportRows(kind: ImportKind, rows: Rec[]) {
  const fields = FIELDS[kind]
  const aoa = [fields.map(f => f.label), ...rows.map(r => fields.map(f => r[f.key] ?? ''))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = fields.map(f => ({ wch: Math.max(f.label.length + 2, f.type === 'longtext' ? 40 : 16) }))
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data')
  save(wb, `${MODULE_LABEL[kind].replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
