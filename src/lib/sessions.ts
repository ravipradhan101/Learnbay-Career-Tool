// One kind of human session: a free 1:1 for career counselling and mentor guidance (client-safe).

export const SESSION_NAME = '1:1 career counselling & mentor guidance'
export const SESSION_SHORT = '1:1 mentor session'
export const SESSION_TYPE_ID = 'mentor'

export const SESSION_TIMES = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'] as const

export function sessionTypeLabel(_id?: string): string {
  return SESSION_SHORT
}
