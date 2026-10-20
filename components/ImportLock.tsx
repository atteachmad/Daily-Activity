'use client'
import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { useStore } from './Store'
import { Pill } from './ui'
import type { SheetKey } from '@/lib/types'

/** Kontrol admin: buka/kunci fitur Upload rekap per menu (otomatis terkunci lagi saat waktu habis). */
export function ImportLock({ sheet }: { sheet: SheetKey }) {
  const { imports, setImport, toast } = useStore()
  const [busy, setBusy] = useState(false)
  const st = imports[sheet]
  const act = async (hours: number) => {
    setBusy(true)
    try { await setImport(sheet, hours); toast(hours ? `Upload rekap dibuka ${hours} jam` : 'Upload rekap dikunci') } catch { /* toast ditangani store */ } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-2">
      <Pill tone={st?.open ? 'amber' : 'gray'}>{st?.open ? <><LockOpen size={11} />Upload terbuka s/d {st.until}</> : <><Lock size={11} />Upload terkunci</>}</Pill>
      <select className="field !w-auto" disabled={busy} value="" onChange={e => e.target.value !== '' && act(Number(e.target.value))} aria-label="Atur upload rekap">
        <option value="">Atur upload…</option>
        <option value="1">Buka 1 jam</option>
        <option value="4">Buka 4 jam</option>
        <option value="24">Buka 24 jam</option>
        <option value="0">Kunci sekarang</option>
      </select>
    </div>
  )
}