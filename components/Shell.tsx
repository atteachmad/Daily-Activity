'use client'
import { useState } from 'react'
import { CalendarCheck2, Eye, FileCheck2, LogOut, Menu, NotebookPen, PanelLeftClose, PanelLeftOpen, Plane, RefreshCw, X } from 'lucide-react'
import { useStore } from './Store'
import { Home } from './Home'
import { ModuleView } from './ModuleView'
import { DISPOSISI, MOM, SPPD } from './modules'
import { Spinner, cx } from './ui'

const NAV = [
  { id: 'home', label: 'Home', icon: CalendarCheck2 },
  { id: 'dispo', label: 'Disposisi SLA', icon: FileCheck2 },
  { id: 'sppd', label: 'Rekap SPPD', icon: Plane },
  { id: 'mom', label: 'MOM', icon: NotebookPen },
] as const
type Id = (typeof NAV)[number]['id']

export function Shell() {
  const { role, canEdit, syncing, lastSync, refresh, logout } = useStore()
  const [active, setActive] = useState<Id>('home')
  // Shell hanya dirender di klien setelah login, jadi aman membaca localStorage langsung (tanpa kedip)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('da_nav') === '1'); const [drawer, setDrawer] = useState(false)

  const toggle = () => setCollapsed(c => { localStorage.setItem('da_nav', c ? '0' : '1'); return !c })
  const go = (id: string) => { setActive(id as Id); setDrawer(false) }
  const mini = collapsed && !drawer // di drawer mobile selalu tampil penuh

  const rail = (
    <nav className={cx('rail flex h-full flex-col gap-2 p-3 transition-[width] duration-200', mini ? 'w-[76px]' : 'w-[224px]')} aria-label="Navigasi utama">
      <div className="flex flex-1 flex-col gap-2">
        {NAV.map(n => { const I = n.icon, on = active === n.id; return (
          <button key={n.id} onClick={() => go(n.id)} title={n.label} aria-current={on ? 'page' : undefined}
            className={cx('flex h-[52px] items-center gap-3 rounded-2xl px-[15px] text-[14px] font-medium transition', on ? 'bg-[#111d33] text-white shadow-lg shadow-[#111d33]/25' : 'text-slate-600 hover:bg-slate-200/60')}>
            <I size={22} className="shrink-0" />{!mini && <span className="truncate">{n.label}</span>}
          </button>) })}
      </div>
      <button onClick={toggle} title={collapsed ? 'Perluas navigasi' : 'Ciutkan navigasi'} className="hidden h-11 items-center gap-3 rounded-2xl px-[15px] text-[13px] font-medium text-slate-500 hover:bg-slate-200/60 md:flex">
        {collapsed ? <PanelLeftOpen size={20} /> : <><PanelLeftClose size={20} />Ciutkan</>}
      </button>
    </nav>
  )

  return (
    <div className="mx-auto max-w-[1600px] p-2 sm:p-4 lg:p-6">
      <div className="frame flex min-h-[calc(100vh-1rem)] overflow-hidden sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)]">
        <div className="hidden md:block">{rail}</div>
        {drawer && <div className="fixed inset-0 z-40 md:hidden"><div className="absolute inset-0 bg-[#0e1a2b]/35" onClick={() => setDrawer(false)} /><div className="absolute inset-y-0 left-0 pop shadow-2xl">{rail}</div></div>}

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-5 sm:px-8">
            <button className="rounded-xl p-2 hover:bg-white/70 md:hidden" aria-label="Buka menu" onClick={() => setDrawer(d => !d)}>{drawer ? <X size={20} /> : <Menu size={20} />}</button>
            <p className="text-lg text-slate-500">Daily <b className="font-bold text-slate-900">Activity</b></p>
            <span className={cx('pill', canEdit ? 'pill-green' : 'pill-amber')}>{canEdit ? 'Editor' : <><Eye size={12} />Monitoring (hanya lihat)</>}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[11px] mute sm:inline">{lastSync && `Sinkron ${lastSync}`}</span>
              <button className="btn btn-soft" onClick={refresh} disabled={syncing} title="Muat ulang data dari Google Sheets">{syncing ? <Spinner /> : <RefreshCw size={14} />}<span className="hidden sm:inline">Refresh</span></button>
              <button className="btn btn-soft" onClick={logout} title={`Keluar (${role})`}><LogOut size={14} /><span className="hidden sm:inline">Keluar</span></button>
            </div>
          </header>
          <main className="px-3 pb-6 sm:px-6">
            {active === 'home' && <Home go={go} />}
            {active === 'dispo' && <ModuleView cfg={DISPOSISI} />}
            {active === 'sppd' && <ModuleView cfg={SPPD} />}
            {active === 'mom' && <ModuleView cfg={MOM} />}
          </main>
        </div>
      </div>
    </div>
  )
}
