// The virtual guide and counsellors (client-safe). Before sign-up everyone talks to Lumi, the career guide;
// after sign-up one of these counsellors is allocated round robin. They are virtual (AI-driven): the chat says
// "virtual" in the status line, and they answer truthfully if asked whether they are a person.

export type CounsellorId = 'tanya' | 'siya' | 'mangesh' | 'elanor' | 'kshitij' | 'riya' | 'imran'
export type Look = { skin: string; hair: string; top: string; style: 'long' | 'bun' | 'short' | 'curly' | 'wavy'; beard?: boolean }
export type Counsellor = { id: CounsellorId; name: string; gender: 'female' | 'male'; look: Look }

/**
 * Stock photos in /public/counsellors (free-licence Unsplash images, see CREDITS.txt there). List a counsellor here once their file is added;
 * anyone not listed shows the illustration instead.
 */
export const PHOTOS: Partial<Record<CounsellorId, string>> = {
  tanya: '/counsellors/tanya.jpg',
  siya: '/counsellors/siya.jpg',
  mangesh: '/counsellors/mangesh.jpg',
  elanor: '/counsellors/elanor.jpg',
  kshitij: '/counsellors/kshitij.jpg',
  riya: '/counsellors/riya.jpg',
  imran: '/counsellors/imran.jpg',
}
export const photoOf = (id: CounsellorId): string | null => PHOTOS[id] ?? null

export const COUNSELLORS: Counsellor[] = [
  { id: 'tanya', name: 'Tanya', gender: 'female', look: { skin: '#e0a482', hair: '#2b1d1a', top: '#5b3fe0', style: 'long' } },
  { id: 'siya', name: 'Siya', gender: 'female', look: { skin: '#c98a66', hair: '#1f1512', top: '#0e9f8e', style: 'bun' } },
  { id: 'mangesh', name: 'Mangesh', gender: 'male', look: { skin: '#b97a56', hair: '#1c1412', top: '#4338ca', style: 'short', beard: true } },
  { id: 'elanor', name: 'Elanor', gender: 'female', look: { skin: '#f1c7a8', hair: '#8a5a2b', top: '#db2777', style: 'wavy' } },
  { id: 'kshitij', name: 'Kshitij', gender: 'male', look: { skin: '#d59a74', hair: '#231815', top: '#ea580c', style: 'short' } },
  { id: 'riya', name: 'Riya', gender: 'female', look: { skin: '#d8a07c', hair: '#3a2419', top: '#7c3aed', style: 'curly' } },
  { id: 'imran', name: 'Imran', gender: 'male', look: { skin: '#c68960', hair: '#161010', top: '#0f766e', style: 'short', beard: true } },
]

/** The guide before sign-up. Internally still called 'bot'. */
export const BOT_NAME = 'Lumi'
/** Lumi is drawn (a smiling illustration in Avatar.tsx), not a photo. */
export const GUIDE_PHOTO: string | null = null
export const GUIDE_TITLE = 'Career Guide'
export const COUNSELLOR_TITLE = 'Senior Career Counsellor'

export function getCounsellor(id: string | null | undefined): Counsellor {
  return COUNSELLORS.find((c) => c.id === id) ?? COUNSELLORS[0]
}

/** "Can I talk to Tanya again?" / "same counsellor please": which counsellor, if any, the learner is asking for. */
export function askedFor(text: string, previous: string | null): CounsellorId | null {
  const t = text.toLowerCase()
  const named = COUNSELLORS.find((c) => new RegExp(`\\b${c.id}\\b`).test(t))
  const wantsBack = /\b(same|previous|old|earlier|last|my)\s+(counsell?or|counsel+er|mentor|advisor|bot)\b/.test(t) || /\b(connect|talk|speak|chat|switch)\b.*\b(back|again)\b/.test(t)
  if (named && /\b(talk|speak|chat|connect|want|with|back|again|switch|bring)\b/.test(t)) return named.id
  if (wantsBack && previous) return getCounsellor(previous).id
  return null
}
