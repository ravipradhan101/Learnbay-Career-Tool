export async function register() {
  // Background email automation runs in the Node.js server only (not the Edge runtime or the build).
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
    const { startEmailWorker } = await import('./lib/email/worker')
    startEmailWorker()
  }
}
