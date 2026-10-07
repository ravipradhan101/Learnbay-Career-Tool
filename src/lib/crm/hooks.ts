import { background } from '../background'

/**
 * The only line between the learner app and the sales team side. It runs after the learner's response is sent and
 * swallows every error, so the CRM can be slow, down or misconfigured without a learner ever noticing.
 */
export function crmNewLead(userId: string): void {
  try {
    background('crm:new-lead', async () => {
      const { allocateNewLead } = await import('./allocate')
      await allocateNewLead(userId)
    })
  } catch (err) {
    console.error('[crm] new-lead hook failed', (err as Error).message)
  }
}
