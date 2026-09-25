import nodemailer, { type Transporter } from 'nodemailer'
import { env } from './env'

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

export function renderHtml(mail: Mail): string {
  const body = mail.bodyHtml ?? mail.paragraphs.map((p) => `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6">${escapeHtml(p)}</p>`).join('')
  const preheader = mail.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(mail.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>`
    : ''
  const footer = mail.unsubscribeUrl
    ? `You are receiving this because you signed up for the Learnbay Career Studio. <a href="${escapeHtml(mail.unsubscribeUrl)}" style="color:#64748b">Unsubscribe from these emails</a>.`
    : 'You received this email because it was entered on the Learnbay Career Studio.'
  const code = mail.code
    ? `<div style="margin:8px 0 20px;font:700 30px/1 ui-monospace,Consolas,monospace;letter-spacing:8px;color:#1e1b4b;background:#eef2ff;border-radius:10px;padding:16px 20px;text-align:center">${escapeHtml(mail.code)}</div>`
    : ''
  const cta = mail.cta
    ? `<p style="margin:8px 0 20px"><a href="${escapeHtml(mail.cta.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${escapeHtml(mail.cta.label)}</a></p>`
    : ''
  const sections = (mail.sections ?? [])
    .filter((sec) => sec.items.length)
    .map((sec) => `<h2 style="margin:22px 0 8px;font-size:16px;color:#0f172a">${escapeHtml(sec.title)}</h2><ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.6">${sec.items.map((i) => `<li style="margin:0 0 6px">${escapeHtml(i)}</li>`).join('')}</ul>`)
    .join('')
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif">${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;padding:28px">
<tr><td>
<p style="margin:0 0 18px;font-weight:800;font-size:20px;color:#1e1b4b">Learnbay <span style="color:#2563eb">Career Studio</span></p>
<h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">${escapeHtml(mail.heading)}</h1>
${body}${code}${sections}${cta ? `<div style="margin-top:18px">${cta}</div>` : ''}
<p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">${footer}</p>
</td></tr></table></td></tr></table></body></html>`
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

export function sendToolReadyEmail(to: string, name: string, toolName: string, route: string) {
  return sendMail({
    to,
    subject: `Your ${toolName} is ready`,
    heading: `Hi ${name}, your ${toolName} is ready`,
    paragraphs: [
      `Your personalized ${toolName} is saved in your Learnbay Career Studio.`,
      'Sign in with this email any time to see it. We will send you a one-time code.',
    ],
    cta: { label: `View my ${toolName}`, url: `${env.appUrl}${route}` },
  })
}

export function sendSessionEmails(params: {
  learner: { name: string; email: string; phone: string }
  type: string
  when: string
  note: string
  summary: string
}) {
  const jobs: Promise<void>[] = [
    sendMail({
      to: params.learner.email,
      subject: `Your ${params.type} request is received`,
      heading: `Thanks ${params.learner.name}, we have your request`,
      paragraphs: [
        `You asked for ${params.type.toLowerCase()} on ${params.when}.`,
        `Someone from our mentor team will confirm with you on ${params.learner.phone} or by email.`,
      ],
      cta: { label: 'Open my Career Studio', url: `${env.appUrl}/dashboard` },
    }),
  ]
  const notify = env.counsellorNotifyEmail
  if (notify) {
    jobs.push(
      sendMail({
        to: notify,
        subject: `New ${params.type} request: ${params.learner.name}`,
        heading: `New ${params.type} request`,
        paragraphs: [
          `Name: ${params.learner.name}`,
          `Email: ${params.learner.email}`,
          `Phone: ${params.learner.phone}`,
          `Preferred: ${params.when}`,
          `Note: ${params.note || '(none)'}`,
          `Profile: ${params.summary}`,
        ],
        cta: { label: 'Open leads', url: `${env.appUrl}/admin` },
      }),
    )
  }
  return Promise.all(jobs)
}
