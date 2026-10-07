export const GREETING_NAME = 'Anty'

/** Jam (0-23) menurut WIB, tidak bergantung zona waktu perangkat. */
export function hourWIB(d = new Date()): number {
  return +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(d) % 24
}

/** Kalimat sapaan sesuai jam WIB. Batas: 05-12 pagi, 12-13, 13-15, 15-18, 18-21, 21-05. */
export function greetingFor(hour: number, name = GREETING_NAME): string {
  if (hour >= 5 && hour < 12) return `Good morning! ${name}`
  if (hour >= 12 && hour < 13) return `Happy lunchtime! ${name}, Istirahat sejenak dari rutinitas`
  if (hour >= 13 && hour < 15) return `Selamat siang! ${name}, Tetap semangat ya buat sisa harimu`
  if (hour >= 15 && hour < 18) return `Good afternoon! ${name}, Tetap semangat, sebentar lagi jam pulang. Gimana harimu sejauh ini?`
  if (hour >= 18 && hour < 21) return `Good night! ${name}, Terima kasih ya sudah bertahan dan berjuang hari ini. Kamu hebat!`
  return 'Wah, belum tidur? Jangan begadang ya, kesehatanmu berharga!'
}