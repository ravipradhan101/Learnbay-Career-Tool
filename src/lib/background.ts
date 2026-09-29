import { after } from 'next/server'

/**
 * Work that must not slow the response but must still finish (emails, enrolments). Inside a request it runs through
 * `after()`, which keeps a serverless function alive until the work is done; elsewhere (the in-process email worker)
 * it simply runs in the background.
 */
export function background(label: string, work: () => Promise<unknown>): void {
  const run = () => work().catch((err) => console.error(`[${label}] failed`, (err as Error).message))
  try {
    after(run)
  } catch {
    void run()
  }
}
