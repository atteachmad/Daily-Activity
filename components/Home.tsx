'use client'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Layers, ListChecks, Pencil, Plus, Trash2, CornerDownLeft, Inbox } from 'lucide-react'
import { useStore } from './Store'
import { Pill, Spinner, cx } from './ui'
import { FormModal } from './FormModal'
import { addDays, fmtDate, fmtLong, nowWIB, todayWIB, ymd } from '@/lib/date'
import { buildEvents, KIND_COLOR, KIND_LABEL, recentUpdates, type EvKind } from '@/lib/events'
import { dispoSla, sppdSla } from '@/lib/sla'
import type { Field } from '@/lib/schema'
import type { Rec } from '@/lib/types'

/* ------------------------------------------------------------------ jam analog */
function Clock() {
  const [t, setT] = useState<Date | null>(null)
  useEffect(() => { const f = () => setT(nowWIB()); f(); const i = setInterval(f, 1000); return () => clearInterval(i) }, [])
  const s = t?.getSeconds() ?? 0, m = (t?.getMinutes() ?? 0) + s / 60, h = ((t?.getHours() ?? 0) % 12) + m / 60
  return (
    <div className="card flex items-center gap-7 p-5">
      <div className="clock-wall shrink-0"><div className="clock-dial"><svg viewBox="0 0 200 200" className="block size-32" role="img" aria-label="Jam analog">
        <circle cx="100" cy="100" r="78" fill="none" stroke="#c9d5e2" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1="100" y1="12" x2="100" y2={i % 3 ? 22 : 26} stroke="#46556b" strokeWidth={i % 3 ? 4 : 5} strokeLinecap="round" transform={`rotate(${i * 30} 100 100)`} />)}
        <line className="clock-hand" x1="100" y1="108" x2="100" y2="54" stroke="#16264a" strokeWidth="7" strokeLinecap="round" transform={`rotate(${h * 30} 100 100)`} />
        <line className="clock-hand" x1="100" y1="112" x2="100" y2="26" stroke="#4f7cf0" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${m * 6} 100 100)`} />
        <line className="clock-hand" x1="100" y1="116" x2="100" y2="22" stroke="#e5604f" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${s * 6} 100 100)`} />
        <circle cx="100" cy="100" r="6.5" fill="#4f7cf0" stroke="#e9eff5" strokeWidth="2" />
      </svg></div></div>
      <div>
        <p className="flex items-baseline gap-1.5 text-3xl font-extrabold tracking-tight">{t ? t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--.--'}<span className="text-xs font-bold tracking-widest text-slate-400">WIB</span></p>
        <p className="mt-1 text-sm mute">{t ? t.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : ' '}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ kalender mini */
const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
function MiniCalendar({ events, selected, onSelect }: { events: ReturnType<typeof buildEvents>; selected: string; onSelect: (d: string) => void }) {
  const today = todayWIB()
  const [cur, setCur] = useState({ y: +selected.slice(0, 4), m: +selected.slice(5, 7) - 1 })
  const dow = (new Date(Date.UTC(cur.y, cur.m, 1)).getUTCDay() + 6) % 7
  const dim = new Date(Date.UTC(cur.y, cur.m + 1, 0)).getUTCDate()
  const start = Date.UTC(cur.y, cur.m, 1 - dow)
  const cells = Array.from({ length: Math.ceil((dow + dim) / 7) * 7 }, (_, i) => {
    const d = new Date(start + i * 86400000)
    return { iso: ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), day: d.getUTCDate(), inMonth: d.getUTCMonth() === cur.m }
  })
  const move = (n: number) => setCur(c => { const d = new Date(Date.UTC(c.y, c.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() } })
  const label = new Date(Date.UTC(cur.y, cur.m, 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const pick = (c: typeof cells[number]) => { onSelect(c.iso); if (!c.inMonth) setCur({ y: +c.iso.slice(0, 4), m: +c.iso.slice(5, 7) - 1 }) }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-sm font-semibold capitalize text-slate-600">{label}</p>
        <div className="flex items-center gap-1">
          <button className="btn btn-soft btn-xs" onClick={() => { setCur({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }); onSelect(today) }}>Hari ini</button>
          <button aria-label="Bulan sebelumnya" className="rounded-lg p-1.5 hover:bg-white/70" onClick={() => move(-1)}><ChevronLeft size={16} /></button>
          <button aria-label="Bulan berikutnya" className="rounded-lg p-1.5 hover:bg-white/70" onClick={() => move(1)}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="card p-3">
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold mute">{DOW.map(d => <span key={d} className="py-1.5">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center">
          {cells.map(c => {
            const kinds = [...new Set((events.get(c.iso) || []).map(e => e.kind))].slice(0, 4)
            const isToday = c.iso === today, isSel = c.iso === selected
            return (
              <button key={c.iso} onClick={() => pick(c)} aria-label={fmtLong(c.iso)} aria-pressed={isSel}
                className={cx('mx-auto flex h-11 w-full max-w-[44px] flex-col items-center justify-center rounded-xl text-[14px] transition',
                  isToday ? 'bg-[#111d33] font-semibold text-white' : isSel ? 'bg-slate-300/70 font-semibold' : 'hover:bg-white/80',
                  !c.inMonth && !isToday && 'text-slate-400/80')}>
                {c.day}
                <span className="mt-0.5 flex h-1 gap-0.5">{kinds.map(k => <i key={k} className="size-1 rounded-full" style={{ background: KIND_COLOR[k] }} />)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DayActivities({ date, events }: { date: string; events: ReturnType<typeof buildEvents> }) {
  const list = events.get(date) || []
  const counts = (Object.keys(KIND_LABEL) as EvKind[]).map(k => [k, list.filter(e => e.kind === k).length] as const).filter(([, n]) => n)
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mute">Aktivitas tanggal</p>
      <p className="mt-0.5 text-sm font-bold">{fmtLong(date)}</p>
      {counts.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{counts.map(([k, n]) => <span key={k} className="pill pill-gray gap-1.5"><i className="size-1.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{KIND_LABEL[k]} · {n}</span>)}</div>}
      {list.length === 0 ? <p className="py-6 text-center text-xs mute">Tidak ada aktivitas tercatat pada tanggal ini.</p> : (
        <ul className="scroll-thin mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {list.map((e, i) => (
            <li key={i} className="flex gap-2.5 rounded-xl bg-white/55 px-3 py-2">
              <i className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[e.kind] }} />
              <div className="min-w-0"><p className="text-[12.5px] font-semibold text-slate-800">{e.title}</p>{e.sub && <p className="truncate text-[11.5px] mute" title={e.sub}>{e.sub}</p>}</div>
            </li>))}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ To-Do */
const GROUPS = ['Unplanned', 'Without Project', 'Scheduled', 'Done'] as const
const TABS = { Unplanned: ['Unplanned', 'Without Project'], Planned: ['Scheduled', 'Done'], All: [...GROUPS] } as const
type Tab = keyof typeof TABS
const STATUS_NEXT: Record<string, string> = { 'To Do': 'On Progress', 'On Progress': 'Done', Done: 'To Do' }
const TODO_FIELDS: Field[] = [
  { key: 'judul', label: 'Judul', type: 'text', required: true },
  { key: 'project', label: 'Project (opsional)', type: 'text' },
  { key: 'tanggal', label: 'Tanggal (opsional)', type: 'date' },
  { key: 'grup', label: 'Kategori', type: 'select', options: [...GROUPS] },
  { key: 'status', label: 'Status', type: 'select', options: ['To Do', 'On Progress', 'Done'] },
]
/** Jaga konsistensi kategori <-> status <-> tanggal. */
function normalizeTodo(p: Record<string, unknown>) {
  const o = { ...p } as Record<string, any>
  if (o.status === 'Done') o.grup = 'Done'
  else if (o.grup === 'Done') o.grup = o.tanggal ? 'Scheduled' : 'Unplanned'
  else if (o.tanggal && (o.grup === 'Unplanned' || o.grup === 'Without Project' || !o.grup)) o.grup = 'Scheduled'
  if (!o.grup) o.grup = 'Unplanned'
  return o
}
const tone = (s: string) => (s === 'Done' ? 'green' : s === 'On Progress' ? 'blue' : 'gray') as 'green' | 'blue' | 'gray'

function TodoPanel({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { db, canEdit, insert, update, remove } = useStore()
  const [text, setText] = useState(''); const [date, setDate] = useState(''); const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({ Unplanned: true, 'Without Project': true, Scheduled: true, Done: false })
  const [edit, setEdit] = useState<Rec | null>(null)
  const todos = db.TODO
  const today = todayWIB()

  const add = async () => {
    const judul = text.trim(); if (!judul || adding) return
    setAdding(true); setText('')
    try { await insert('TODO', { judul, grup: date ? 'Scheduled' : 'Unplanned', status: 'To Do', tanggal: date }, true); setDate('') } catch { setText(judul) } finally { setAdding(false) }
  }
  const act = (fn: () => Promise<unknown>) => fn().catch(() => {})
  const setStatus = (t: Rec, status: string) => act(() => update('TODO', t.id, normalizeTodo({ ...t, status, grup: t.grup }), true))

  const groups = TABS[tab]
  return (
    <section className="panel flex min-h-[420px] flex-col p-5 sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight">Todo’s</h2>
      <div className="mt-5 flex items-center gap-2.5 text-[15px] font-medium text-slate-600"><ListChecks size={20} />ToDo <b className="text-slate-900">{tab}</b></div>

      <div className="card mt-4 flex items-center gap-3 !rounded-2xl px-4 py-3">
        <Plus size={20} className="shrink-0 text-slate-500" />
        <input className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-slate-500 disabled:cursor-not-allowed" placeholder={canEdit ? 'Add todo, press ENTER to save' : 'Mode monitoring — hanya lihat'}
          value={text} disabled={!canEdit} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        {canEdit && <>
          <input type="date" title="Jadwalkan (opsional)" className="pressed w-[118px] rounded-lg px-2 py-1 text-[11px] text-slate-600 outline-none" value={date} onChange={e => setDate(e.target.value)} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} />
          <button onClick={add} aria-label="Simpan todo" className="pressed flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white">{adding ? <Spinner size={12} /> : <CornerDownLeft size={12} />}ENTER</button></>}
      </div>

      <div className="mt-4 space-y-1">
        {groups.map(g => {
          const items = todos.filter(t => (t.grup || 'Unplanned') === g)
          return (
            <div key={g}>
              <button onClick={() => setOpen(o => ({ ...o, [g]: !o[g] }))} className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left text-[15px] font-medium text-slate-600 hover:text-slate-900" aria-expanded={!!open[g]}>
                <ChevronDown size={18} className={cx('transition-transform', !open[g] && '-rotate-90')} />{g}
                <span className="rounded-md bg-slate-300/50 px-1.5 text-xs font-semibold text-slate-600">{items.length}</span>
              </button>
              {open[g] && (items.length === 0 ? <p className="pb-2 pl-8 text-xs mute">Kosong</p> : (
                <ul className="mb-2 space-y-2">
                  {items.map(t => {
                    const done = t.status === 'Done', late = !done && t.tanggal && t.tanggal < today
                    return (
                      <li key={t.id} className={cx('card hatch group flex items-center gap-3 !rounded-xl px-3 py-2.5', String(t.id).startsWith('tmp-') && 'opacity-60')}>
                        <button disabled={!canEdit} aria-label={done ? 'Tandai belum selesai' : 'Tandai selesai'} onClick={() => act(() => update('TODO', t.id, done ? { status: 'To Do', grup: t.tanggal ? 'Scheduled' : 'Unplanned' } : { status: 'Done', grup: 'Done' }, true))}
                          className={cx('flex size-6 shrink-0 items-center justify-center rounded-full border transition', done ? 'border-[#111d33] bg-[#111d33] text-white' : 'border-slate-400 bg-white/70 hover:border-[#111d33]')}>{done && <CircleCheck size={14} />}</button>
                        <div className="min-w-0 flex-1">
                          <p className={cx('truncate text-[14px] font-medium', done && 'text-slate-400 line-through')} title={t.judul}>{t.judul}</p>
                          {(t.project || t.tanggal) && <p className={cx('truncate text-[11px]', late ? 'font-semibold text-[#b5352f]' : 'mute')}>{t.project}{t.project && t.tanggal ? ' · ' : ''}{t.tanggal ? fmtDate(t.tanggal) : ''}{late ? ' · terlambat' : ''}</p>}
                        </div>
                        <Pill tone={tone(t.status)} onClick={canEdit ? () => setStatus(t, STATUS_NEXT[t.status] || 'To Do') : undefined} title={canEdit ? 'Klik untuk ganti status' : undefined}>{t.status}</Pill>
                        {canEdit && <div className="flex opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                          <button aria-label="Ubah" className="rounded-lg p-1.5 text-slate-500 hover:bg-white" onClick={() => setEdit(t)}><Pencil size={13} /></button>
                          <button aria-label="Hapus" className="rounded-lg p-1.5 text-slate-500 hover:bg-[#fde1df] hover:text-[#b5352f]" onClick={() => confirm('Hapus to-do ini?') && act(() => remove('TODO', t.id))}><Trash2 size={13} /></button></div>}
                      </li>)
                  })}
                </ul>))}
            </div>)
        })}
      </div>

      {edit && <FormModal title="Ubah to-do" fields={TODO_FIELDS} initial={edit} onClose={() => setEdit(null)} onSubmit={p => update('TODO', edit.id, normalizeTodo(p))} />}
    </section>
  )
}

/* ------------------------------------------------------------------ KPI pemantauan */
function Kpis({ go }: { go: (id: string) => void }) {
  const { db } = useStore(); const today = todayWIB(); const month = today.slice(0, 7)
  const k = useMemo(() => {
    const d = db.DISPOSISI.map(dispoSla), bm = d.filter(x => x.bm !== null), nb = d.filter(x => x.nonBm !== null)
    const sp = db.SPPD.map(sppdSla).filter(x => x.ok !== null)
    const open = db.TODO.filter(t => t.status !== 'Done')
    const p = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}%` : '—')
    return [
      { id: 'dispo', label: 'Disposisi On Progres', value: db.DISPOSISI.filter(r => r.status !== 'Done').length, hint: `dari ${db.DISPOSISI.length.toLocaleString('id-ID')} disposisi` },
      { id: 'dispo', label: 'SLA Disposisi', value: p(bm.filter(x => x.bm).length, bm.length), hint: `Non BM ${p(nb.filter(x => x.nonBm).length, nb.length)}` },
      { id: 'sppd', label: 'SPPD bulan ini', value: db.SPPD.filter(r => String(r.pengajuan_user || '').startsWith(month)).length, hint: `SLA ${p(sp.filter(x => x.ok).length, sp.length)}` },
      { id: 'home', label: 'To-Do terbuka', value: open.length, hint: `${open.filter(t => t.tanggal && t.tanggal < today).length} terlambat` },
    ]
  }, [db, today, month])
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {k.map((x, i) => <button key={i} onClick={() => go(x.id)} className="card p-4 text-left transition hover:-translate-y-0.5"><p className="text-[10px] font-bold uppercase tracking-wide mute">{x.label}</p><p className="mt-1.5 text-2xl font-extrabold">{x.value}</p><p className="mt-0.5 text-[11px] mute">{x.hint}</p></button>)}
    </div>
  )
}

function Recent() {
  const { db } = useStore(); const list = useMemo(() => recentUpdates(db, 6), [db])
  if (!list.length) return null
  return (
    <div className="card mt-4 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mute">Update terbaru</p>
      <ul className="mt-2 space-y-2">{list.map((u, i) => (
        <li key={i} className="flex items-center gap-2.5 text-[12.5px]"><i className="size-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[u.kind] }} />
          <span className="min-w-0 flex-1 truncate" title={u.text}><b className="font-semibold">{KIND_LABEL[u.kind]}</b> · {u.text}</span><span className="shrink-0 text-[11px] mute">{new Date(u.at.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', timeZone: 'UTC' })}</span></li>))}</ul>
    </div>
  )
}

/* ------------------------------------------------------------------ Home */
export function Home({ go }: { go: (id: string) => void }) {
  const { db } = useStore()
  const events = useMemo(() => buildEvents(db), [db])
  const [selected, setSelected] = useState(todayWIB()); const [tab, setTab] = useState<Tab>('Unplanned')
  const open = db.TODO.filter(t => t.status !== 'Done')
  const counts: Record<Tab, number> = { Unplanned: open.filter(t => t.grup === 'Unplanned' || t.grup === 'Without Project' || !t.grup).length, Planned: open.filter(t => t.grup === 'Scheduled').length, All: open.length }
  const icons = { Unplanned: Inbox, Planned: CircleCheck, All: Layers }

  return (
    <div className="flex flex-col gap-5">
      <Kpis go={go} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Planner</h2>
          <div className="mt-5 space-y-1">
            {(Object.keys(TABS) as Tab[]).map(t => { const I = icons[t]; return (
              <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={cx('hatch flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] transition', tab === t ? 'card !rounded-2xl font-medium text-slate-900' : 'text-slate-600 hover:bg-white/40')}>
                <I size={22} className="text-slate-600" />{t}
                {counts[t] > 0 && <span className="ml-auto rounded-md bg-slate-300/60 px-2 py-0.5 text-xs font-semibold">{counts[t]}</span>}
                {tab === t && <ChevronRight size={16} className={counts[t] > 0 ? '' : 'ml-auto'} />}
              </button>) })}
          </div>
          <div className="mt-5 space-y-4"><Clock /><MiniCalendar events={events} selected={selected} onSelect={setSelected} /><DayActivities date={selected} events={events} /></div>
        </section>
        <div><TodoPanel tab={tab} setTab={setTab} /><Recent /></div>
      </div>
    </div>
  )
}
