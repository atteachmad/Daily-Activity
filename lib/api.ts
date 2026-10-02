import { API_URL } from './config'
import type { DB, Rec, Role, SheetKey } from './types'

async function post<T = any>(body: Record<string, unknown>): Promise<T> {
  // text/plain => "simple request", tidak memicu preflight CORS pada Apps Script
  const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  let json: any
  try { json = await res.json() } catch { throw new Error('Respons server tidak valid. Pastikan Apps Script sudah di-deploy ulang (New version).') }
  if (!json.ok) throw new Error(json.error || 'Permintaan gagal')
  return json as T
}

export const api = {
  list: (pin: string) => post<{ role: Role; data: DB; server_time: string }>({ action: 'list', pin }),
  insert: (pin: string, sheet: SheetKey, record: Record<string, unknown>) => post<{ record: Rec }>({ action: 'insert', pin, sheet, record }),
  update: (pin: string, sheet: SheetKey, id: string, record: Record<string, unknown>) => post<{ record: Rec }>({ action: 'update', pin, sheet, id, record }),
  stamp: (pin: string, sheet: SheetKey, id: string, field: string, clear = false) => post<{ record: Rec }>({ action: 'stamp', pin, sheet, id, field, clear }),
  remove: (pin: string, sheet: SheetKey, id: string) => post({ action: 'remove', pin, sheet, id }),
  bulk: (pin: string, sheet: SheetKey, records: Record<string, unknown>[]) => post<{ inserted: number; skipped: number }>({ action: 'bulk', pin, sheet, records }),
}
