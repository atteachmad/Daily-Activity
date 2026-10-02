'use client'
import { useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import type { Field } from '@/lib/schema'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export function Pill({ tone = 'gray', children, onClick, title }: { tone?: 'blue' | 'green' | 'amber' | 'gray' | 'red'; children: React.ReactNode; onClick?: () => void; title?: string }) {
  const c = cx('pill', `pill-${tone}`, onClick && 'cursor-pointer hover:brightness-95')
  return onClick ? <button type="button" title={title} onClick={onClick} className={c}>{children}</button> : <span title={title} className={c}>{children}</span>
}

export const Spinner = ({ size = 14 }: { size?: number }) => <Loader2 size={size} className="spin" />

export function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e1a2b]/35 p-3 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={cx('card pop flex max-h-[92vh] w-full flex-col overflow-hidden', wide ? 'max-w-3xl' : 'max-w-xl')}>
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-4">
          <div><h3 className="text-base font-bold">{title}</h3>{subtitle && <p className="mt-0.5 text-xs mute">{subtitle}</p>}</div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5"><X size={18} /></button>
        </div>
        <div className="scroll-thin overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/** Satu kontrol form berdasarkan tipe field. Nilai selalu string; idr disimpan sebagai digit saja. */
export function FieldInput({ f, value, onChange, disabled }: { f: Field; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const common = { disabled, id: `f-${f.key}` }
  if (f.type === 'select') {
    const opts = f.options || []
    const list = value && !opts.includes(value) ? [value, ...opts] : opts // nilai impor di luar daftar tetap tampil
    return <select {...common} className="field" value={value} onChange={e => onChange(e.target.value)}><option value="">— pilih —</option>{list.map(o => <option key={o}>{o}</option>)}</select>
  }
  if (f.type === 'longtext') return <textarea {...common} rows={3} className="field resize-y" value={value} placeholder={f.placeholder} onChange={e => onChange(e.target.value)} />
  if (f.type === 'date') return <input {...common} type="date" className="field" value={value} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={e => onChange(e.target.value)} />
  if (f.type === 'number') return <input {...common} type="number" min={0} inputMode="numeric" className="field" value={value} onChange={e => onChange(e.target.value)} />
  if (f.type === 'idr') {
    const shown = value ? Number(value).toLocaleString('id-ID') : ''
    return (
      <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold mute">Rp</span>
        <input {...common} inputMode="numeric" className="field pl-9" value={shown} placeholder="0" onChange={e => onChange(e.target.value.replace(/\D/g, ''))} /></div>
    )
  }
  return <input {...common} className="field" value={value} placeholder={f.placeholder} onChange={e => onChange(e.target.value)} />
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return <div className="px-6 py-14 text-center"><p className="text-sm font-semibold text-slate-600">{title}</p>{hint && <p className="mt-1 text-xs mute">{hint}</p>}</div>
}
