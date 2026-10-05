import nodemailer, { type Transporter } from 'nodemailer'
import { env } from './env'
import { learnerUrl } from './links'

const globalForMail = globalThis as unknown as { __navigatorMailer?: Transporter }

function transporter(): Transporter | null {
  const smtp = env.smtp
  if (!smtp) return null
  if (!globalForMail.__navigatorMailer) {
    globalForMail.__navigatorMailer = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? '' } : undefined,
    })
  }
  return globalForMail.__navigatorMailer
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type MailSection = { title: string; items: string[] }
export type Mail = {
  to: string
  subject: string
  heading: string
  paragraphs: string[]
  cta?: { label: string; url: string }
  code?: string
  sections?: MailSection[]
  attachments?: { filename: string; content: Buffer; contentType: string }[]
  /** Pre-rendered, already-escaped body (automation emails); replaces `paragraphs` in the HTML part. */
  bodyHtml?: string
  bodyText?: string
  /** Inbox preview line shown after the subject. */
  preheader?: string
  /** Marketing emails: adds a visible unsubscribe link and RFC 8058 one-click unsubscribe headers. */
  unsubscribeUrl?: string
}

/**
 * The email layout. Spacing lives on table cells (Gmail and Outlook ignore padding on <table>), the card is a fixed
 * 600px on desktop and full width on phones, and the button is a table cell so it renders everywhere.
 */
export function renderHtml(mail: Mail): string {
  const P = 'margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65'
  const body = mail.bodyHtml ?? mail.paragraphs.map((p) => `<p style="${P}">${escapeHtml(p)}</p>`).join('')
  const preheader = mail.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(mail.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>`
    : ''
  const footer = mail.unsubscribeUrl
    ? `You are receiving this because you signed up for the Learnbay Career Studio.<br><a href="${escapeHtml(mail.unsubscribeUrl)}" style="color:#64748b;text-decoration:underline">Unsubscribe from these emails</a>`
    : 'You received this email because it was entered on the Learnbay Career Studio.'
  const code = mail.code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px"><tr><td align="center" style="padding:18px 20px;background:#eef2ff;border-radius:12px;font:700 32px/1 ui-monospace,Consolas,monospace;letter-spacing:10px;color:#1e1b4b">${escapeHtml(mail.code)}</td></tr></table>`
    : ''
  const cta = mail.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px"><tr><td style="border-radius:10px;background:#4338ca"><a href="${escapeHtml(mail.cta.url)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(mail.cta.label)} &rarr;</a></td></tr></table>`
    : ''
  const sections = (mail.sections ?? [])
    .filter((sec) => sec.items.length)
    .map((sec) => `<h2 style="margin:24px 0 10px;font-size:16px;line-height:1.4;color:#0f172a">${escapeHtml(sec.title)}</h2><ul style="margin:0 0 16px;padding-left:20px;color:#334155;font-size:14px;line-height:1.65">${sec.items.map((i) => `<li style="margin:0 0 8px">${escapeHtml(i)}</li>`).join('')}</ul>`)
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(mail.subject)}</title>
<style>@media (max-width:620px){.lb-outer{padding:16px 8px!important}.lb-pad{padding-left:22px!important;padding-right:22px!important}.lb-h1{font-size:21px!important}}</style></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" class="lb-outer" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;border-collapse:separate;overflow:hidden">
<tr><td class="lb-pad" style="padding:22px 36px;background:#3730a3;background-image:linear-gradient(120deg,#3730a3,#7c3aed)">
<span style="font-size:19px;font-weight:800;color:#ffffff;letter-spacing:-0.2px">Learnbay</span> <span style="font-size:15px;font-weight:500;color:#e0e7ff">Career Studio</span>
</td></tr>
<tr><td class="lb-pad" style="padding:32px 36px 8px">
<h1 class="lb-h1" style="margin:0 0 18px;font-size:23px;line-height:1.3;font-weight:700;color:#0f172a">${escapeHtml(mail.heading)}</h1>
${body}${code}${sections}${cta ? `<div style="margin:6px 0 10px">${cta}</div>` : ''}
</td></tr>
<tr><td class="lb-pad" style="padding:24px 36px 30px">
<p style="margin:0;padding-top:18px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.6">${footer}</p>
</td></tr>
</table>
</td></tr></table></body></html>`
}

function renderText(mail: Mail): string {
  const sections = (mail.sections ?? []).filter((sec) => sec.items.length).map((sec) => `\n${sec.title}\n${sec.items.map((i) => `- ${i}`).join('\n')}`)
  const body = mail.bodyText !== undefined ? [mail.bodyText] : mail.paragraphs
  return [mail.heading, '', ...body, mail.code ? `\nCode: ${mail.code}` : '', ...sections, mail.cta ? `\n${mail.cta.label}: ${mail.cta.url}` : '',
    mail.unsubscribeUrl ? `\n--\nUnsubscribe from these emails: ${mail.unsubscribeUrl}` : '']
    .filter((l) => l !== undefined)
    .join('\n')
}

export async function sendMail(mail: Mail): Promise<void> {
  // MAIL_LOG_ONLY=true prints emails instead of sending (for staging and load tests with fake addresses).
  const t = process.env.MAIL_LOG_ONLY === 'true' ? null : transporter()
  if (!t) {
    if (process.env.MAIL_LOG_ONLY === 'true') {
      console.info(`[mail:log-only] To: ${mail.to} | Subject: ${mail.subject}${mail.code ? ` | Code: ${mail.code}` : ''}`)
      return
    }
    if (env.isProduction) throw new Error('SMTP is not configured. Set SMTP_HOST and related values in .env.')
    // Local development without SMTP: print the email so the flow can still be completed.
    const files = mail.attachments?.map((a) => `${a.filename} (${a.content.length} bytes)`).join(', ')
    console.info(`\n[mail:dev] To: ${mail.to}\n[mail:dev] Subject: ${mail.subject}\n${renderText(mail)}${files ? `\n[mail:dev] Attachments: ${files}` : ''}\n`)
    return
  }
  const info = await t.sendMail({
    from: env.smtp!.from,
    to: mail.to,
    subject: mail.subject,
    text: renderText(mail),
    html: renderHtml(mail),
    attachments: mail.attachments,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    // One-click unsubscribe (RFC 8058): Gmail and Yahoo expect this on marketing email from bulk senders.
    headers: mail.unsubscribeUrl
      ? { 'List-Unsubscribe': `<${mail.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      : undefined,
  })
  // The SMTP server's confirmation, for checking delivery when someone says an email did not arrive.
  console.info(`[mail] "${mail.subject}" -> ${mail.to} accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} ${info.response ?? ''}`)
}

export function sendOtpEmail(to: string, code: string) {
  return sendMail({
    to,
    subject: `${code} is your Learnbay Career Studio code`,
    heading: 'Your login code',
    paragraphs: ['Use this code to sign in to your Learnbay Career Studio. It expires in 10 minutes.', 'If you did not request this, you can ignore this email.'],
    code,
  })
}

export function sendAdminCodeEmail(to: string, code: string) {
  return sendMail({
    to,
    subject: `${code} is your Career Studio admin code`,
    heading: 'Set your admin password',
    paragraphs: [
      'Use this code to set or reset the password for the Career Studio admin reports. It expires in 10 minutes.',
      'If you did not request this, someone may be trying to reach the admin area. Ignore this email; your password has not changed.',
    ],
    code,
  })
}

export function sendToolReadyEmail(userId: string, to: string, name: string, toolName: string, route: string) {
  return sendMail({
    to,
    subject: `Your ${toolName} is ready`,
    heading: `Hi ${name}, your ${toolName} is ready`,
    paragraphs: [
      `Your personalized ${toolName} is saved in your Learnbay Career Studio.`,
      'Sign in with this email any time to see it. We will send you a one-time code.',
    ],
    cta: { label: `View my ${toolName}`, url: learnerUrl(userId, route) },
  })
}

export function sendSessionEmails(params: {
  learner: { id: string; name: string; email: string; phone: string }
  type: string
  when: string
  note: string
  summary: string
  /** Set when the learner moved an existing booking. */
  rescheduledFrom?: string
}) {
  const moved = Boolean(params.rescheduledFrom)
  const jobs: Promise<void>[] = [
    sendMail({
      to: params.learner.email,
      subject: moved ? `Your counselling call is moved to ${params.when}` : `Your counselling call is booked for ${params.when}`,
      preheader: `A Learnbay Senior Career Counsellor will call you on ${params.learner.phone}.`,
      heading: moved ? `Done, ${firstWord(params.learner.name)}: your call is rescheduled` : `You’re booked, ${firstWord(params.learner.name)}`,
      paragraphs: [
        moved
          ? `Your free call with a Learnbay Senior Career Counsellor is now on ${params.when} (IST), instead of ${params.rescheduledFrom}.`
          : `Your free call with a Learnbay Senior Career Counsellor is booked for ${params.when} (IST).`,
        `They will call you on ${params.learner.phone}. Keep your reports handy: the counsellor uses them to go straight to your plan, the right program, and fees or EMI if you want.`,
        'Need a different time? You can reschedule from your Career Studio.',
      ],
      cta: { label: 'View my booking', url: learnerUrl(params.learner.id, '/dashboard/sessions') },
    }),
  ]
  const notify = env.counsellorNotifyEmail
  if (notify) {
    jobs.push(
      sendMail({
        to: notify,
        subject: `${moved ? 'Rescheduled' : 'New'} ${params.type}: ${params.learner.name}, ${params.when}`,
        heading: moved ? 'A learner rescheduled their call' : `New ${params.type} booked`,
        paragraphs: [
          `Name: ${params.learner.name}`,
          `Email: ${params.learner.email}`,
          `Phone: ${params.learner.phone}`,
          `Slot: ${params.when} (IST)${moved ? `, moved from ${params.rescheduledFrom}` : ''}`,
          `Note: ${params.note || '(none)'}`,
          `Profile: ${params.summary}`,
        ],
        cta: { label: 'Open this learner in admin', url: `${env.appUrl}/admin/users/${params.learner.id}` },
      }),
    )
  }
  return Promise.all(jobs)
}

const firstWord = (name: string) => name.trim().split(/\s+/)[0] || 'there'
