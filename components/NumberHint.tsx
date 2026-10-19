'use client'
import { CircleCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { fmtDate } from '@/lib/date'
import { EXAMPLE, type NumberCheck, type NumKind } from '@/lib/numbering'

export function NumberHint({ kind, chk, value, tipe, onUse }: {
  kind: NumKind; chk: NumberCheck | null; value: string; tipe?: string; onUse: (v: string) => void
}) {
  if (!chk) return <p className="mt-1.5 text-[11px] mute">Pilih ASSET / NON ASSET terlebih dulu — saran nomor muncul otomatis.</p>

  const same = value.trim() === chk.suggestion
  const d = chk.duplicate
  const example = Object.values(EXAMPLE[kind])[kind === 'DISPOSISI' && tipe === 'ASSET' ? 0 : kind === 'DISPOSISI' ? 1 : 0]

  return (
    <div className="mt-1.5 space-y-1.5 text-[11px]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {same
          ? <span className="inline-flex items-center gap-1 font-semibold text-[#2f7d58]"><CircleCheck size={12} />Memakai nomor berikutnya</span>
          : <>
              <span className="mute">Nomor berikutnya:</span>
              <button type="button" onClick={() => onUse(chk.suggestion)}
                className="inline-flex items-center gap-1 rounded-full bg-[#e2eaff] px-2.5 py-0.5 font-bold text-[#3b62d1] transition hover:brightness-95" title="Klik untuk memakai nomor ini">
                <Sparkles size={11} />{chk.suggestion}
              </button>
            </>}
      </div>
      <p className="mute">Terakhir terbit tahun ini: {chk.last || 'belum ada'}{chk.gaps.length > 0 && <> · Nomor terlewat: {chk.gaps.slice(0, 6).map(n => String(n).padStart(3, '0')).join(', ')}{chk.gaps.length > 6 ? '…' : ''}</>}</p>

      {d && (
        <p className="flex items-start gap-1.5 rounded-xl bg-[#fde1df] px-3 py-2 font-semibold text-[#b5352f]">
          <TriangleAlert size={13} className="mt-px shrink-0" />
          <span>Nomor duplikat! Sudah dipakai oleh “{String(d.disposisi || d.karyawan || '—').slice(0, 70)}” ({fmtDate(d.pengajuan_disposisi || d.pengajuan_user)}). Gunakan {chk.suggestion}.</span>
        </p>
      )}
      {!d && chk.skipTo && (
        <p className="flex items-start gap-1.5 rounded-xl bg-[#fff1d6] px-3 py-2 font-semibold text-[#9a6200]">
          <TriangleAlert size={13} className="mt-px shrink-0" />
          <span>Nomor melompat — urutan berikutnya seharusnya {String(chk.skipTo).padStart(3, '0')}.</span>
        </p>
      )}
      {chk.badFormat && (
        <p className="flex items-start gap-1.5 rounded-xl bg-[#fff1d6] px-3 py-2 font-semibold text-[#9a6200]">
          <TriangleAlert size={13} className="mt-px shrink-0" />
          <span>Format tidak sesuai pola baku, contoh: {example}</span>
        </p>
      )}
    </div>
  )
}