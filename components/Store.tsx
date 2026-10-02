'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { EMPTY_DB, type DB, type Rec, type Role, type SheetKey } from '@/lib/types'

type Toast = { id: number; msg: string; tone: 'ok' | 'err' }
type Status = 'boot' | 'login' | 'ready'
type Patch = Record<string, unknown>

type Store = {
  status: Status; role: Role | null; canEdit: boolean; db: DB; syncing: boolean; lastSync: string
  login: (pin: string, remember: boolean) => Promise<void>; logout: () => void; refresh: () => Promise<void>
  insert: (s: SheetKey, rec: Patch, optimistic?: boolean) => Promise<Rec>
  update: (s: SheetKey, id: string, patch: Patch, optimistic?: boolean) => Promise<Rec>
  stamp: (s: SheetKey, id: string, field: string, clear?: boolean) => Promise<Rec>
  remove: (s: SheetKey, id: string) => Promise<void>
  bulk: (s: SheetKey, records: Patch[]) => Promise<{ inserted: number; skipped: number }>
  toast: (msg: string, tone?: 'ok' | 'err') => void; toasts: Toast[]
}

const Ctx = createContext<Store>(null as unknown as Store)
export const useStore = () => useContext(Ctx)
const KEY = 'da_pin'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('boot')
  const [role, setRole] = useState<Role | null>(null)
  const [db, setDb] = useState<DB>(EMPTY_DB)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const pin = useRef(''); const dbRef = useRef<DB>(EMPTY_DB); const busy = useRef(0)

  const commit = (next: DB) => { dbRef.current = next; setDb(next) }
  const setRows = (s: SheetKey, fn: (r: Rec[]) => Rec[]) => commit({ ...dbRef.current, [s]: fn(dbRef.current[s]) })

  const toast = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === 'err' ? 6000 : 3200)
  }, [])

  const load = useCallback(async () => {
    const res = await api.list(pin.current)
    commit(res.data); setRole(res.role)
    setLastSync(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }))
  }, [])

  const refresh = useCallback(async () => {
    setSyncing(true)
    try { await load() } catch (e: any) { toast(e.message, 'err') } finally { setSyncing(false) }
  }, [load, toast])

  const login = useCallback(async (p: string, remember: boolean) => {
    pin.current = p.trim()
    setSyncing(true)
    try {
      await load()
      ;(remember ? localStorage : sessionStorage).setItem(KEY, pin.current)
      setStatus('ready')
    } catch (e) { pin.current = ''; throw e } finally { setSyncing(false) }
  }, [load])

  const logout = useCallback(() => {
    localStorage.removeItem(KEY); sessionStorage.removeItem(KEY)
    pin.current = ''; commit(EMPTY_DB); setRole(null); setStatus('login')
  }, [])

  // auto-login bila PIN tersimpan
  useEffect(() => {
    const saved = localStorage.getItem(KEY) || sessionStorage.getItem(KEY)
    if (!saved) { setStatus('login'); return }
    pin.current = saved
    load().then(() => setStatus('ready')).catch(() => { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); setStatus('login') })
  }, [load])

  // sinkron otomatis tiap 60 detik (supaya pemantau melihat input terbaru) — ditunda saat ada proses simpan
  useEffect(() => {
    if (status !== 'ready') return
    const t = setInterval(() => { if (!document.hidden && busy.current === 0) load().catch(() => {}) }, 60000)
    return () => clearInterval(t)
  }, [status, load])

  const guard = async <T,>(fn: () => Promise<T>) => {
    busy.current++
    try { return await fn() } catch (e: any) { toast(e.message || 'Gagal menyimpan', 'err'); throw e } finally { busy.current-- }
  }
  const notTmp = (id: string) => { if (id.startsWith('tmp-')) throw new Error('Tunggu sebentar, data sedang disimpan…') }

  const insert: Store['insert'] = (s, rec, optimistic = false) => guard(async () => {
    const tmp = 'tmp-' + Math.random().toString(36).slice(2, 8)
    if (optimistic) setRows(s, r => [{ ...rec, id: tmp } as Rec, ...r])
    try {
      const { record } = await api.insert(pin.current, s, rec)
      setRows(s, r => optimistic ? r.map(x => x.id === tmp ? record : x) : [record, ...r])
      return record
    } catch (e) { if (optimistic) setRows(s, r => r.filter(x => x.id !== tmp)); throw e }
  })

  const update: Store['update'] = (s, id, patch, optimistic = false) => guard(async () => {
    notTmp(id)
    const snap = dbRef.current[s]
    if (optimistic) setRows(s, r => r.map(x => x.id === id ? { ...x, ...patch } : x))
    try {
      const { record } = await api.update(pin.current, s, id, patch)
      setRows(s, r => r.map(x => x.id === id ? record : x)); return record
    } catch (e) { if (optimistic) commit({ ...dbRef.current, [s]: snap }); throw e }
  })

  const stamp: Store['stamp'] = (s, id, field, clear = false) => guard(async () => {
    const { record } = await api.stamp(pin.current, s, id, field, clear)
    setRows(s, r => r.map(x => x.id === id ? record : x)); return record
  })

  const remove: Store['remove'] = (s, id) => guard(async () => {
    notTmp(id)
    const snap = dbRef.current[s]
    setRows(s, r => r.filter(x => x.id !== id))
    try { await api.remove(pin.current, s, id) } catch (e) { commit({ ...dbRef.current, [s]: snap }); throw e }
  })

  const bulk: Store['bulk'] = (s, records) => guard(() => api.bulk(pin.current, s, records))

  const value = useMemo<Store>(() => ({
    status, role, canEdit: role === 'editor', db, syncing, lastSync, login, logout, refresh, insert, update, stamp, remove, bulk, toast, toasts,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [status, role, db, syncing, lastSync, toasts])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
