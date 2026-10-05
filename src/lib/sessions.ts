// One kind of human session: a free 1:1 call with a Learnbay Senior Career Counsellor (client-safe).

export const SESSION_NAME = '1:1 call with a Senior Career Counsellor'
export const SESSION_SHORT = 'counselling call'
export const SESSION_TYPE_ID = 'mentor'

/** Senior Counsellors call between 10 AM and 8 PM IST; each slot is an hour, so the last one starts at 7 PM. */
export const SESSION_TIMES = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'] as const
export type SessionTime = (typeof SESSION_TIMES)[number]
/** How many learners can book the same slot; after that it shows as full. */
export const SLOT_CAPACITY = 10
/** Bookings open for today and tomorrow only. */
export const BOOKING_DAYS = 2
export const CALL_HOURS = '10 AM to 8 PM IST'
/** What a "call me" request promises (the earliest available Senior Counsellor, within one working day). */
export const CALL_PROMISE = `A Senior Counsellor will call you at the earliest available time, within 1 working day, between ${CALL_HOURS}.`

export function sessionTypeLabel(_id?: string): string {
  return SESSION_SHORT
}

/** Today's date in India (YYYY-MM-DD), whatever the server's or browser's time zone. */
export function istDate(offsetDays = 0, now = new Date()): string {
  const d = new Date(now.getTime() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Minutes past midnight in India now. */
export function istMinutes(now = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now).split(':').map(Number)
  return (h % 24) * 60 + m
}

/** "5:00 PM" → 17 * 60. */
export function slotMinutes(time: string): number {
  const m = time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/)
  if (!m) return -1
  const h = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)
  return h * 60 + Number(m[2])
}

/** A slot today needs at least an hour's notice, so a counsellor can prepare. */
export function slotOpen(date: string, time: string, now = new Date()): boolean {
  if (date !== istDate(0, now)) return true
  return slotMinutes(time) >= istMinutes(now) + 60
}

/** "Tue, 1 Oct at 5:00 PM". */
export function whenLabel(date: string, time: string): string {
  return `${new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at ${time}`
}

export type Booking = { id: string; date: string; time: string; when: string; status: string; rescheduled: number }
export type DaySlots = { date: string; label: string; slots: { time: string; left: number; open: boolean }[] }
