import { normalizeEmail } from './security'

/** Login is by email only: a 6-digit code is sent to the address entered. */
export async function resolveLoginEmail(input: unknown): Promise<{ email: string } | { error: string }> {
  const email = normalizeEmail(input)
  return email ? { email } : { error: 'Please enter a valid email address.' }
}
