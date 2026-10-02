'use client'
import { useState } from 'react'
import { CalendarCheck2, Lock } from 'lucide-react'
import { useStore } from './Store'
import { Spinner } from './ui'

export function Login() {
  const { login } = useStore()
  const [pin, setPin] = useState(''); const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!pin.trim()) return
    setBusy(true); setErr('')
    try { await login(pin, remember) } catch (ex: any) { setErr(ex.message || 'Gagal masuk') } finally { setBusy(false) }
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card pop w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#111d33] text-white"><CalendarCheck2 size={22} /></div>
          <div><h1 className="text-lg font-extrabold leading-tight">Daily Activity</h1><p className="text-xs mute">Masuk dengan PIN</p></div>
        </div>
        <label className="label" htmlFor="pin">PIN</label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
          <input id="pin" type="password" autoFocus autoComplete="current-password" className="field pl-9" value={pin} onChange={e => setPin(e.target.value)} placeholder="Masukkan PIN" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Ingat di perangkat ini</label>
        {err && <p className="mt-4 rounded-xl bg-[#fde1df] px-3 py-2 text-xs font-semibold text-[#b5352f]">{err}</p>}
        <button className="btn btn-dark mt-5 w-full justify-center py-2.5" disabled={busy || !pin.trim()}>{busy && <Spinner />}Masuk</button>
        <p className="mt-4 text-center text-[11px] mute">PIN Editor untuk input data · PIN Monitor hanya untuk melihat</p>
      </form>
    </main>
  )
}
