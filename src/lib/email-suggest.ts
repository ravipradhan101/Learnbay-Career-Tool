// Common typos of the big email providers, for a "Did you mean …?" hint while typing (client-safe) and a hard stop on
// the server (typo domains often exist and even take mail, so the reports would go to a stranger).

const PROVIDERS = ['gmail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'rediffmail.com', 'protonmail.com', 'aol.com', 'zoho.com']

const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.in': 'gmail.com',
  'gmail.cpm': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmali.com': 'gmail.com', 'gmil.com': 'gmail.com', 'gimail.com': 'gmail.com',
  'gemail.com': 'gmail.com', 'gmailcom': 'gmail.com', 'g-mail.com': 'gmail.com', 'gmsil.com': 'gmail.com', 'gmaul.com': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yaoo.com': 'yahoo.com',
  'yahoo.co.on': 'yahoo.co.in', 'yahoo.coin': 'yahoo.co.in',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'homail.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com', 'outloo.com': 'outlook.com', 'otlook.com': 'outlook.com',
  'icloud.co': 'icloud.com', 'icoud.com': 'icloud.com', 'iclod.com': 'icloud.com',
  'rediffmai.com': 'rediffmail.com', 'redifmail.com': 'rediffmail.com', 'rediff.com': 'rediffmail.com', 'rediffmail.co': 'rediffmail.com',
}

/** Edit distance between two short strings (for "gmaik.com" → "gmail.com"). */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

/** Real domains that look like a provider typo but aren't (never flagged). */
const REAL = new Set(['mail.com', 'ymail.com', 'email.com', 'gmx.com', 'gmx.net', 'googlemail.com', 'outlook.in', 'live.in', 'hotmail.co.uk', 'yahoo.in', 'yahoo.co.uk', 'rocketmail.com', 'me.com', 'mac.com', 'aim.com', 'zoho.in', 'zohomail.in', 'proton.me', 'pm.me'])

/**
 * The provider domain this looks like a typo of, if any. `strict`: only the known typo list (the server blocks these);
 * otherwise also one or two letters off (a gentle hint while typing, which the learner may ignore).
 */
export function providerTypo(domain: string, strict = false): string | null {
  const d = domain.toLowerCase()
  if (PROVIDERS.includes(d) || REAL.has(d)) return null
  if (TYPOS[d]) return TYPOS[d]
  if (strict) return null
  const near = PROVIDERS.find((p) => Math.abs(p.length - d.length) <= 2 && distance(p, d) <= (p.length > 9 ? 2 : 1))
  return near ?? null
}

/** "rahul@gmial.com" → "rahul@gmail.com" (null when it looks fine). */
export function suggestEmail(email: string, strict = false): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const fix = providerTypo(email.slice(at + 1), strict)
  return fix ? `${email.slice(0, at)}@${fix}` : null
}
