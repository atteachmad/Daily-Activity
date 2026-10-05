'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Square, Volume2, X } from 'lucide-react'
import { useStore } from './Store'
import { cx } from './ui'
import { buildEvents } from '@/lib/events'
import { todayWIB } from '@/lib/date'
import { answerFor, forSpeech } from '@/lib/voice'

type Phase = 'idle' | 'listening' | 'speaking'
const getSR = (): any => (typeof window === 'undefined' ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null)
const ERR: Record<string, string> = {
  'not-allowed': 'Izin mikrofon ditolak. Klik ikon gembok di address bar, izinkan Mikrofon, lalu coba lagi.',
  'service-not-allowed': 'Izin mikrofon ditolak. Klik ikon gembok di address bar, izinkan Mikrofon, lalu coba lagi.',
  'audio-capture': 'Mikrofon tidak ditemukan. Pastikan mikrofon terpasang.',
  'no-speech': 'Tidak ada suara terdeteksi. Klik mikrofon dan coba lagi.',
  network: 'Pengenalan suara butuh koneksi internet. Periksa jaringan Anda.',
}

export function VoiceAssistant() {
  const { db } = useStore()
  const events = useMemo(() => buildEvents(db), [db])
  const eventsRef = useRef(events); eventsRef.current = events
  const recRef = useRef<any>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [open, setOpen] = useState(false)
  const [heard, setHeard] = useState(''); const [reply, setReply] = useState(''); const [error, setError] = useState(''); const [note, setNote] = useState('')

  const speak = useCallback((text: string) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) { setPhase('idle'); return }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(forSpeech(text))
    u.lang = 'id-ID'; u.rate = 0.95
    const voices = synth.getVoices()
    const v = voices.find(x => /^id[-_]/i.test(x.lang))
    if (v) u.voice = v
    setNote(voices.length && !v ? 'Suara Bahasa Indonesia belum terpasang di perangkat ini, jadi suara jawaban mungkin terdengar kurang tepat. Teks jawaban tetap tampil di sini.' : '')
    u.onend = () => setPhase('idle'); u.onerror = () => setPhase('idle')
    setPhase('speaking'); synth.speak(u)
  }, [])

  const stopAll = useCallback(() => {
    try { recRef.current?.abort() } catch { /* sudah berhenti */ }
    recRef.current = null
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setPhase('idle')
  }, [])

  const start = useCallback(() => {
    const SR = getSR(); setOpen(true)
    if (!SR) { setHeard(''); setReply(''); setError('Browser ini belum mendukung pengenalan suara. Gunakan Google Chrome, Microsoft Edge, atau Safari terbaru.'); return }
    window.speechSynthesis?.cancel()
    const rec = new SR(); recRef.current = rec
    rec.lang = 'id-ID'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 3
    let alts: string[] = []; let failed = false
    rec.onstart = () => { setPhase('listening'); setHeard(''); setReply(''); setError(''); setNote('') }
    rec.onresult = (e: any) => {
      const r = e.results[e.results.length - 1]
      setHeard(r[0].transcript)
      if (r.isFinal) alts = Array.from({ length: r.length }, (_: unknown, i: number) => r[i].transcript)
    }
    rec.onerror = (e: any) => { failed = true; if (e.error !== 'aborted') setError(ERR[e.error] || `Pengenalan suara gagal (${e.error}).`); setPhase('idle') }
    rec.onend = () => {
      recRef.current = null
      if (alts.length) {
        const r = answerFor(alts, eventsRef.current, todayWIB())
        setHeard(alts[0]); setReply(r.text); speak(r.text)
      } else if (!failed) { setPhase('idle'); setError(ERR['no-speech']) }
    }
    try { rec.start() } catch { setError('Mikrofon sedang dipakai. Coba lagi sebentar.') }
  }, [speak])

  const toggle = () => { if (phase === 'listening') recRef.current?.stop(); else if (phase === 'speaking') stopAll(); else start() }
  const close = () => { stopAll(); setOpen(false) }
  useEffect(() => () => { try { recRef.current?.abort() } catch { /* */ } window.speechSynthesis?.cancel() }, [])

  const status = phase === 'listening' ? 'Mendengarkan… silakan bicara' : phase === 'speaking' ? 'Membacakan jawaban…' : 'Siap'
  return (
    <>
      <button type="button" onClick={toggle} aria-label="Voice Assistant" aria-pressed={phase !== 'idle'}
        title="Voice Assistant — klik lalu ucapkan, mis. “hari ini ada agenda apa”"
        className={cx('btn', phase === 'listening' ? 'bg-[#d9534f] text-white animate-pulse' : phase === 'speaking' ? 'btn-dark' : 'btn-soft')}>
        {phase === 'listening' ? <Mic size={14} /> : phase === 'speaking' ? <Square size={14} /> : <Mic size={14} />}
      </button>

      {open && (
        <div role="status" aria-live="polite" className="card pop fixed inset-x-3 bottom-4 z-[55] mx-auto max-w-[520px] bg-[#f3f7fa] p-4 shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center gap-2">
            <span className={cx('flex size-8 items-center justify-center rounded-full', phase === 'listening' ? 'bg-[#d9534f] text-white animate-pulse' : 'bg-[#111d33] text-white')}><Mic size={15} /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold leading-tight">Voice Assistant</p><p className="text-[11px] mute">{status}</p></div>
            <button onClick={close} aria-label="Tutup Voice Assistant" className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5"><X size={16} /></button>
          </div>

          {!heard && !reply && !error && <p className="mt-3 text-xs mute">Coba katakan: “hari ini ada agenda apa”, “agenda tanggal 5 Oktober”, atau “apa jadwal saya tanggal 6”.</p>}
          {heard && <p className="mt-3 text-xs mute">Anda: <span className="font-semibold text-slate-700">“{heard}”</span></p>}
          {reply && <p className="mt-2 rounded-xl bg-white/70 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-slate-800">{reply}</p>}
          {error && <p className="mt-3 rounded-xl bg-[#fde1df] px-3 py-2 text-xs font-semibold text-[#b5352f]">{error}</p>}
          {note && <p className="mt-2 text-[11px] text-[#a8690b]">{note}</p>}

          <div className="mt-3 flex justify-end gap-2">
            {reply && phase !== 'speaking' && <button className="btn btn-soft btn-xs" onClick={() => speak(reply)}><Volume2 size={12} />Ulangi jawaban</button>}
            <button className="btn btn-dark btn-xs" onClick={toggle}>{phase === 'listening' ? 'Selesai bicara' : phase === 'speaking' ? 'Hentikan suara' : <><Mic size={12} />Tanya lagi</>}</button>
          </div>
        </div>
      )}
    </>
  )
}
