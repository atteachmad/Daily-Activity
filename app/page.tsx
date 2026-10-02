'use client'
import { StoreProvider, useStore } from '@/components/Store'
import { Login } from '@/components/Login'
import { Shell } from '@/components/Shell'
import { Spinner } from '@/components/ui'

function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map(t => <div key={t.id} className={`pop rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xl ${t.tone === 'err' ? 'bg-[#b5352f] text-white' : 'bg-[#111d33] text-white'}`}>{t.msg}</div>)}
    </div>
  )
}

function Gate() {
  const { status } = useStore()
  return (
    <>
      {status === 'boot' ? <div className="flex min-h-screen items-center justify-center text-slate-500"><Spinner size={24} /></div> : status === 'login' ? <Login /> : <Shell />}
      <Toasts />
    </>
  )
}

export default function Page() { return <StoreProvider><Gate /></StoreProvider> }
