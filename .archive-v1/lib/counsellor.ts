export const COUNSELLOR_SLOTS = [
  { id: 'morning', label: 'Morning (9 AM – 12 PM)' },
  { id: 'afternoon', label: 'Afternoon (12 PM – 4 PM)' },
  { id: 'evening', label: 'Evening (4 PM – 8 PM)' },
] as const

export function slotLabel(id: string): string {
  return COUNSELLOR_SLOTS.find((s) => s.id === id)?.label ?? id
}
