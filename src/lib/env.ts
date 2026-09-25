// Server-side environment access. Values are read lazily so `next build` works
// without secrets; a missing required value throws at first use with a clear message.

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Environment variable ${name} is not set. Add it to .env in the project root.`)
  return value
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/** SMTP_FROM may be a full address, "Name <addr>", or just a display name (then SMTP_USER is the address). */
function senderAddress(from: string | undefined, user: string | undefined): string {
  if (from?.includes('@')) return from
  if (from && user) return `"${from.replace(/"/g, '')}" <${user}>`
  return user ?? 'no-reply@localhost'
}

export const env = {
  get appUrl() {
    return required('APP_URL').replace(/\/+$/, '')
  },
  get databaseUrl() {
    return required('DATABASE_URL')
  },
  get sessionSecret() {
    const secret = required('SESSION_SECRET')
    if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters long.')
    return secret
  },
  get geminiApiKey() {
    return required('GEMINI_API_KEY')
  },
  get databaseSsl() {
    return optional('DATABASE_SSL') === 'true'
  },
  get databaseSslRejectUnauthorized() {
    return optional('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false'
  },
  get smtp() {
    const host = optional('SMTP_HOST')
    if (!host) return null
    const port = Number(optional('SMTP_PORT') ?? '587')
    return {
      host,
      port,
      secure: optional('SMTP_SECURE') ? optional('SMTP_SECURE') === 'true' : port === 465,
      user: optional('SMTP_USER'),
      pass: optional('SMTP_PASS'),
      from: senderAddress(optional('SMTP_FROM'), optional('SMTP_USER')),
    }
  },
  get adminEmails(): string[] {
    return (optional('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  },
  get counsellorNotifyEmail() {
    return optional('COUNSELLOR_NOTIFY_EMAIL')
  },
  get trustProxy() {
    return optional('TRUST_PROXY') === 'true'
  },
  /** Optional AI voice assistant: an https link (web voice bot) and/or a phone number. */
  get voiceAssistantUrl() {
    const url = optional('VOICE_ASSISTANT_URL')
    return url && url.startsWith('https://') ? url : undefined
  },
  get voiceAssistantPhone() {
    return optional('VOICE_ASSISTANT_PHONE')
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production'
  },
}
