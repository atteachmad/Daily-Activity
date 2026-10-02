import { diffDays } from './date'
import { SLA_BM_MAX, SLA_NONBM_MAX, SLA_SPPD_MAX } from './config'
import type { Rec } from './types'

/** Rumus identik dengan Excel lama: BM <= 3 hari, Non BM <= 10 hari (sejak Pengajuan Disposisi). */
export function dispoSla(r: Rec) {
  const base = r.pengajuan_disposisi
  const bmDays = diffDays(r.approval_bm, base)
  const last = r.approval_direksi || r.approval_vp || r.approval_head_regional || r.approval_bm
  const nonBmDays = diffDays(last, base)
  return {
    bmDays, nonBmDays,
    bm: bmDays === null ? null : bmDays <= SLA_BM_MAX,
    nonBm: nonBmDays === null ? null : nonBmDays <= SLA_NONBM_MAX,
  }
}

/** SPPD: selisih Approve BM -> SPPD dikirim ke user, H <= 3 */
export function sppdSla(r: Rec) {
  const d = diffDays(r.sppd_dikirim_user, r.approve_bm)
  const days = d === null ? null : Math.abs(d)
  return { days, ok: days === null ? null : days <= SLA_SPPD_MAX }
}
