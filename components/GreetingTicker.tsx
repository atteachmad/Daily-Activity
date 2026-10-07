'use client'
import { useEffect, useState } from 'react'
import { greetingFor, hourWIB } from '@/lib/greeting'

/** Teks sapaan berjalan (marquee). Hanya dirender untuk Editor dari Shell. */
export function GreetingTicker() {
  const [text, setText] = useState('')
  useEffect(() => {
    const tick = () => setText(greetingFor(hourWIB()))
    tick()
    const id = setInterval(tick, 60000) // perbarui tiap menit agar ikut berganti saat jam berubah
    return () => clearInterval(id)
  }, [])
  if (!text) return null

  // Ulangi teks secukupnya agar selalu memenuhi lebar, kecepatan tetap ~50px/detik
  const unit = text.length * 7.2 + 64
  const copies = Math.max(2, Math.ceil(1100 / unit))
  const duration = Math.round((copies * unit) / 50)
  const group = (hidden: boolean) => (
    <div className="flex shrink-0" aria-hidden={hidden || undefined}>
      {Array.from({ length: copies }, (_, i) => <span key={i}>{text}</span>)}
    </div>
  )

  return (
    <div className="ticker order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1" role="marquee" aria-label={text} title={text}>
      <div className="ticker-track" key={text} style={{ animationDuration: `${duration}s` }}>
        {group(false)}{group(true)}
      </div>
    </div>
  )
}