import { ensureDefaultFlows, processDueEmails } from './flows'

const g = globalThis as unknown as { __emailWorker?: NodeJS.Timeout }

/**
 * Runs the email automation inside the Node server: every minute, send whatever is due.
 * Several instances can run this at once; enrollments are claimed with row locks.
 * Set EMAIL_WORKER=off to disable (e.g. when an external cron calls /api/cron/emails instead).
 */
export function startEmailWorker() {
  if (g.__emailWorker || process.env.EMAIL_WORKER === 'off') return
  const tick = async () => {
    try {
      await ensureDefaultFlows()
      await processDueEmails()
    } catch (err) {
      console.error('[email] worker tick failed', (err as Error).message)
    }
  }
  g.__emailWorker = setInterval(tick, 60_000)
  g.__emailWorker.unref?.()
  setTimeout(tick, 5_000).unref?.()
}
