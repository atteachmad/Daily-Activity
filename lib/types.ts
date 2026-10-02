export type Role = 'editor' | 'viewer'
export type Rec = Record<string, any> & { id: string }
export type SheetKey = 'DISPOSISI' | 'SPPD' | 'MOM' | 'TODO'
export type DB = Record<SheetKey, Rec[]>
export const EMPTY_DB: DB = { DISPOSISI: [], SPPD: [], MOM: [], TODO: [] }
