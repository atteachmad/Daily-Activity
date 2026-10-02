import { DEPTS, STATUS_DISPO, STATUS_MOM, TIPE } from './config'
import type { Rec, SheetKey } from './types'

export type FieldType = 'text' | 'longtext' | 'date' | 'number' | 'idr' | 'select'
export type Field = { key: string; label: string; type: FieldType; options?: string[]; required?: boolean; placeholder?: string; aliases?: string[] }

export const DISPOSISI_FIELDS: Field[] = [
  { key: 'tipe', label: 'ASSET / NON ASSET', type: 'select', options: TIPE, required: true, aliases: ['assetnonasset', 'tipe', 'jenis'] },
  { key: 'dept', label: 'Dept', type: 'select', options: DEPTS, required: true, aliases: ['dept', 'departemen', 'department'] },
  { key: 'pengajuan_user', label: 'Pengajuan User', type: 'date', aliases: ['pengajuanuser', 'disposisiditerima'] },
  { key: 'pengajuan_disposisi', label: 'Pengajuan Disposisi', type: 'date', aliases: ['pengajuandisposisi'] },
  { key: 'approval_bm', label: 'Approval BM', type: 'date', aliases: ['approvalbm'] },
  { key: 'approval_head_regional', label: 'Approval Head Regional', type: 'date', aliases: ['approvalheadregional'] },
  { key: 'approval_vp', label: 'Approval VP', type: 'date', aliases: ['approvalvp'] },
  { key: 'approval_direksi', label: 'Approval Direksi', type: 'date', aliases: ['approvaldireksi'] },
  { key: 'disposisi_selesai', label: 'Disposisi Selesai', type: 'date', aliases: ['disposisiselesai'] },
  { key: 'disposisi_kirim_user', label: 'Disposisi Kirim Ke User', type: 'date', aliases: ['disposisikirimkeuser', 'disposisidikirimkeuser'] },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_DISPO, aliases: ['status'] },
  { key: 'reff', label: 'REFF', type: 'text', aliases: ['reff', 'noreff', 'nomorreff'] },
  { key: 'disposisi', label: 'DISPOSISI', type: 'longtext', required: true, aliases: ['disposisi', 'perihal'] },
  { key: 'qty', label: 'Qty', type: 'number', aliases: ['qty', 'jumlah'] },
  { key: 'idr', label: 'IDR (Rp)', type: 'idr', aliases: ['idr', 'nominal', 'rp'] },
  { key: 'keterangan', label: 'Keterangan', type: 'longtext', aliases: ['keterangan'] },
]

export const SPPD_FIELDS: Field[] = [
  { key: 'pengajuan_user', label: 'Pengajuan User', type: 'date', aliases: ['pengajuanuser'] },
  { key: 'approve_bm', label: 'Approve BM', type: 'date', aliases: ['appovebm', 'approvebm', 'appovebbp', 'approvebbp', 'approvalbm'] },
  { key: 'sppd_dikirim_user', label: 'SPPD Dikirim Ke User', type: 'date', aliases: ['sppddikirimkeuser'] },
  { key: 'nomor_sppd', label: 'Nomor SPPD', type: 'text', required: true, aliases: ['nomorsppd', 'nosppd'] },
  { key: 'mulai_perjalanan', label: 'Mulai Perjalanan Dinas', type: 'date', aliases: ['mulaiperjalanandinas', 'keteranganperjalanandinas', 'mulai'] },
  { key: 'berakhir_perjalanan', label: 'Berakhir Perjalanan Dinas', type: 'date', aliases: ['berakhirperjalanandinas', 'berakhir'] },
  { key: 'karyawan', label: 'Karyawan', type: 'longtext', required: true, aliases: ['karyawan', 'nama'] },
]

export const MOM_FIELDS: Field[] = [
  { key: 'tanggal', label: 'Tanggal Rapat', type: 'date', aliases: ['tanggal', 'tanggalrapat'] },
  { key: 'judul_rapat', label: 'Judul Rapat', type: 'text', required: true, aliases: ['judulrapat', 'judul', 'agenda'] },
  { key: 'peserta', label: 'Peserta', type: 'longtext', aliases: ['peserta'] },
  { key: 'pembahasan', label: 'Pembahasan', type: 'longtext', aliases: ['pembahasan', 'pokokbahasan'] },
  { key: 'keputusan', label: 'Keputusan', type: 'longtext', aliases: ['keputusan', 'hasil'] },
  { key: 'action_items', label: 'Action Items', type: 'longtext', aliases: ['actionitems', 'actionitem', 'tindaklanjut'] },
  { key: 'pic', label: 'PIC', type: 'text', aliases: ['pic', 'penanggungjawab'] },
  { key: 'deadline', label: 'Deadline', type: 'date', aliases: ['deadline', 'tenggat'] },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_MOM, aliases: ['status'] },
]

export type ImportKind = 'DISPOSISI' | 'SPPD' | 'MOM'
export const FIELDS: Record<ImportKind, Field[]> = { DISPOSISI: DISPOSISI_FIELDS, SPPD: SPPD_FIELDS, MOM: MOM_FIELDS }

/** Kolom yang wajib terisi agar sebuah baris Excel dianggap data (bukan baris kosong / ringkasan). */
export const ROW_KEY: Record<ImportKind, (r: Rec) => boolean> = {
  DISPOSISI: r => !!(r.reff || r.disposisi),
  SPPD: r => !!r.nomor_sppd,
  MOM: r => !!r.judul_rapat,
}

/** Kunci duplikat — harus sama dengan keyOf() di kode.gs */
export function keyOf(kind: SheetKey, r: Rec): string {
  const s = (v: unknown) => String(v ?? '').trim().toLowerCase()
  if (kind === 'DISPOSISI') return s(r.reff) || `${s(r.disposisi)}|${s(r.pengajuan_disposisi)}`
  if (kind === 'SPPD') return s(r.nomor_sppd)
  if (kind === 'MOM') return `${s(r.judul_rapat)}|${s(r.tanggal)}`
  return ''
}

export const TEMPLATE_EXAMPLE: Record<ImportKind, Record<string, string | number>> = {
  DISPOSISI: {
    tipe: 'NON ASSET', dept: 'Retail', pengajuan_user: '2026-01-06', pengajuan_disposisi: '2026-01-07', approval_bm: '2026-01-07',
    approval_head_regional: '2026-01-09', approval_vp: '', approval_direksi: '', disposisi_selesai: '2026-01-12', disposisi_kirim_user: '2026-01-12',
    status: 'Done', reff: '001/DISP-REGJB/BDO/I/2026', disposisi: 'Contoh: Disposisi Pengajuan Flat Tarif Kiriman Dokumen', qty: 1, idr: 48500000, keterangan: 'Contoh baris — hapus sebelum upload',
  },
  SPPD: {
    pengajuan_user: '2026-01-05', approve_bm: '2026-01-05', sppd_dikirim_user: '2026-01-06', nomor_sppd: '001/SPPD/Sekre/JNEBDO/I/26',
    mulai_perjalanan: '2026-01-08', berakhir_perjalanan: '2026-01-09', karyawan: 'Contoh Nama (Dept)',
  },
  MOM: {
    tanggal: '2026-01-10', judul_rapat: 'Contoh: Rapat Koordinasi Regional', peserta: 'A, B, C', pembahasan: 'Ringkasan pembahasan', keputusan: 'Keputusan rapat',
    action_items: 'Daftar tindak lanjut', pic: 'Nama PIC', deadline: '2026-01-20', status: 'Open',
  },
}

export const MODULE_LABEL: Record<ImportKind, string> = { DISPOSISI: 'Disposisi SLA', SPPD: 'Rekap SPPD', MOM: 'MOM' }
