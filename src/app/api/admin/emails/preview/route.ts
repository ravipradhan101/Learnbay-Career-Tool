import { adminGuard, body, parseStep } from '@/lib/email/admin'
import { buildMail } from '@/lib/email/flows'
import { SAMPLE_VARS } from '@/lib/email/render'
import { renderHtml } from '@/lib/mailer'
import { jsonError, jsonOk } from '@/lib/security'

/** Renders an email draft with sample learner details, exactly as it will look in the inbox. */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { value: s, error } = parseStep(await body(request))
  if (!s) return jsonError(400, error ?? 'Invalid email.')
  const mail = buildMail(
    { subject: s.subject, preheader: s.preheader, heading: s.heading, body: s.body, cta_label: s.ctaLabel || null, cta_path: s.ctaPath || null, position: 0 },
    'preview', SAMPLE_VARS, 'learner@example.com', 'https://example.com/unsubscribe',
  )
  return jsonOk({ subject: mail.subject, preheader: mail.preheader ?? '', html: renderHtml(mail) })
}
