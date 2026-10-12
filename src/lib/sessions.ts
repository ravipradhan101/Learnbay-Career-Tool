// One kind of human session: a free 1:1 call with a Learnbay Senior Career Counsellor (client-safe).

export const SESSION_NAME = '1:1 call with a Senior Career Counsellor'
export const SESSION_SHORT = 'counselling call'
export const SESSION_TYPE_ID = 'mentor'

/** Calls are 20 minutes long, every 30 minutes from 10:00 AM to 7:30 PM IST (the last one ends by 7:50 PM). */
export const CALL_MINUTES = 20
export const SESSION_TIMES = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'] as const
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

/**
 * A booked call is over once its slot today is more than an hour past (it has happened, or was missed). Times are the
 * 12-hour slot labels ("7:00 PM"): read with slotMinutes, never by splitting on ":" (that read 7 PM as 7 AM and hid
 * evening bookings made the same day).
 */
export function slotPassed(date: string, time: string, now = new Date()): boolean {
  if (date !== istDate(0, now)) return false
  const t = slotMinutes(time)
  return t >= 0 && t + 60 < istMinutes(now)
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
