import type { Metadata } from 'next'
import { Logo } from '@/components/Logo'
import { queryOne } from '@/lib/db'
import { validUnsubscribe } from '@/lib/email/flows'

export const metadata: Metadata = { title: 'Email preferences', robots: { index: false, follow: false } }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

/** Opening the link never unsubscribes by itself (mail scanners open links); the learner confirms with a button. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams
  const u = one(p.u), t = one(p.t), done = one(p.done)
  const valid = validUnsubscribe(u, t)
  const user = valid ? await queryOne<{ email: string; opted_out: boolean }>(`SELECT email, marketing_opt_out_at IS NOT NULL AS opted_out FROM users WHERE id = $1`, [u]) : null

  return (
    <main className="admin-shell" style={{ display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <div className="stack" style={{ alignItems: 'center', width: '100%' }}>
        <Logo />
        <div className="auth-card">
          {!user ? (
            <>
              <h1>This link is not valid</h1>
              <p className="muted small">Please use the unsubscribe link from the latest email we sent you.</p>
            </>
          ) : user.opted_out ? (
            <>
              <h1>{done === 'unsubscribed' ? 'You are unsubscribed' : 'You are not receiving updates'}</h1>
              <p className="muted small">We won&apos;t send Career Studio tips and reminders to <b>{user.email}</b>. You&apos;ll still get login codes and any report you ask us to email.</p>
              <form method="post" action="/api/unsubscribe">
                <input type="hidden" name="u" value={u} /><input type="hidden" name="t" value={t} />
                <input type="hidden" name="from" value="page" /><input type="hidden" name="action" value="resubscribe" />
                <button className="btn btn-outline btn-block">Changed your mind? Resubscribe</button>
              </form>
            </>
          ) : (
            <>
              <h1>{done === 'resubscribed' ? 'Welcome back' : 'Unsubscribe from Career Studio emails?'}</h1>
              <p className="muted small">
                {done === 'resubscribed'
                  ? `You'll get occasional tips and reminders at ${user.email} again.`
                  : `We send occasional tips and reminders to ${user.email} to help you finish your plan. You can stop them here. Login codes and reports you request will still arrive.`}
              </p>
              {done !== 'resubscribed' && (
                <form method="post" action="/api/unsubscribe">
                  <input type="hidden" name="u" value={u} /><input type="hidden" name="t" value={t} /><input type="hidden" name="from" value="page" />
                  <button className="btn btn-primary btn-block">Unsubscribe</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
