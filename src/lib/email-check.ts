import { resolve4, resolveMx } from 'node:dns/promises'
import { suggestEmail } from './email-suggest'

// Stops fake emails at sign-up, so reports, codes and counsellor follow-ups reach a real inbox:
// 1. temporary / disposable inboxes (the testers' copytosh.com and aahzz.com, mailinator, yopmail, 10-minute mail…),
// 2. reserved test domains (example.com, *.test, *.invalid…),
// 3. known typos of big providers ("gmial.com" → "Did you mean …@gmail.com?"),
// 4. domains that cannot receive email (no mail server, checked live; a slow or failing lookup never blocks anyone).

const DISPOSABLE = new Set(`
copytosh.com aahzz.com mailinator.com mailinator.net mailinator.org mailinator2.com notmailinator.com yopmail.com yopmail.fr yopmail.net
cool.fr.nf jetable.fr.nf nospam.ze.tc nomail.xl.cx mega.zik.dj speed.1s.fr courriel.fr.nf moncourrier.fr.nf monemail.fr.nf monmail.fr.nf
guerrillamail.com guerrillamail.net guerrillamail.org guerrillamail.biz guerrillamail.de guerrillamailblock.com sharklasers.com grr.la
pokemail.net spam4.me 10minutemail.com 10minutemail.net 10minutemail.co.uk 10minemail.com 20minutemail.com 30minutemail.com
temp-mail.org temp-mail.io tempmail.com tempmail.net tempmail.dev tempmailo.com tempmail.plus tempmailaddress.com tempm.com tempr.email
tempinbox.com tempomail.fr temporarymail.com temporary-mail.net throwawaymail.com throwam.com trashmail.com trashmail.net trashmail.de
trashmail.io trash-mail.com trashmail.me wegwerfmail.de wegwerfmail.net getnada.com nada.email getairmail.com dispostable.com
discard.email discardmail.com fakeinbox.com fakemail.net fakemailgenerator.com maildrop.cc mailnesia.com mailcatch.com mintemail.com
mohmal.com emailondeck.com tempail.com burnermail.io spamgourmet.com mytemp.email mailpoof.com inboxkitten.com 1secmail.com 1secmail.org
1secmail.net esiix.com wwjmp.com xojxe.com yoggm.com kzccv.com qiott.com wuuvo.com icznn.com vddaz.com emailfake.com email-fake.com
fakemail.fr mail-temp.com mailtemp.net tmpmail.org tmpmail.net tmpeml.com tmail.ws spambox.us spambog.com spamfree24.org mailmetrash.com
emailtemporanea.com emailtemporanea.net emailsensei.com mailbox.in.ua harakirimail.com incognitomail.com incognitomail.org jetable.org
mailexpire.com mailforspam.com mailfreeonline.com mailscrap.com mailshell.com mailsiphon.com mailzilla.com meltmail.com mt2015.com
mytrashmail.com nwldx.com objectmail.com obobbo.com oneoffemail.com pookmail.com proxymail.eu rcpt.at rmqkr.net safetymail.info
selfdestructingmail.com sendspamhere.com shieldemail.com smellfear.com sneakemail.com spamavert.com spambox.info spamcero.com spamday.com
spamex.com spamhole.com spaml.com spammotel.com spamobox.com spamspot.com spamthis.co.uk superrito.com teleworm.us thankyou2010.com
tradermail.info trbvm.com tyldd.com uggsrock.com veryrealemail.com wh4f.org whyspam.me willselfdestruct.com wuzupmail.net yuurok.com
zippymail.info zoemail.org armyspy.com cuvox.de dayrep.com einrot.com fleckens.hu gustr.com jourrapide.com rhyta.com superrito.com
emailnax.com luxusmail.org dropmail.me 10mail.org emltmp.com spymail.one minimail.gq vomoto.com tafmail.com emlpro.com emlhub.com
mailto.plus fexpost.com fexbox.org mailbox.org.tmp rover.info chitthi.in disbox.net disbox.org mailgutter.com mail.tm getmail.lol
linshiyouxiang.net 027168.com bccto.me chacuo.net guerrillamail.info anonbox.net anonymbox.com boximail.com byom.de deadaddress.com
despam.it dodgeit.com e4ward.com emailias.com emailwarden.com enterto.com ephemail.net filzmail.com gishpuppy.com haltospam.com
`.split(/\s+/).filter(Boolean))

/** Personal email providers: always fine (their domains are checked for typos, not for mail servers). */
const PROVIDERS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.in', 'live.in', 'hotmail.co.uk', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com', 'icloud.com', 'me.com', 'mac.com', 'rediffmail.com', 'protonmail.com', 'proton.me', 'pm.me', 'zoho.com', 'zohomail.in', 'aol.com', 'gmx.com', 'mail.com', 'yandex.com'])
/**
 * Work and other emails need a domain ending people really use for organisations: the classic ones (.com, .net, .org,
 * .edu…), tech ones (.ai, .io, .dev…), and any country ending (.in, .co.in, .ae, .uk…), except the free country endings
 * that spammers and throwaway inboxes favour. New endings like .xyz, .top or .click are refused (Learnbay, 12 Oct 2026).
 */
const OK_TLDS = new Set(['com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'co', 'io', 'ai', 'dev', 'app', 'tech', 'cloud', 'digital', 'solutions', 'consulting', 'agency', 'global', 'group', 'company', 'academy', 'school', 'university', 'college', 'education', 'health', 'bank', 'finance', 'law', 'media', 'news', 'studio', 'design', 'software', 'systems', 'services', 'network', 'email', 'pro', 'jobs', 'energy', 'foundation', 'institute', 'international', 'works', 'ltd', 'llc', 'inc', 'capital', 'ventures', 'partners', 'technology', 'engineering', 'healthcare', 'insurance', 'management', 'marketing', 'careers'])
const BAD_COUNTRY_TLDS = new Set(['tk', 'ml', 'ga', 'cf', 'gq', 'pw'])
const domainEndingOk = (domain: string) => {
  const tld = domain.slice(domain.lastIndexOf('.') + 1)
  return tld.length === 2 ? !BAD_COUNTRY_TLDS.has(tld) : OK_TLDS.has(tld)
}

/** Reserved for documentation and tests: never a real inbox. */
const RESERVED = /(^|\.)(example\.(com|org|net)|test|invalid|localhost|local|example)$/i

const cache = new Map<string, { ok: boolean; at: number }>()
const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

/** Whether the domain can receive mail: true, false, or null when we couldn't tell (then it is allowed). */
async function receivesMail(domain: string): Promise<boolean | null> {
  const hit = cache.get(domain)
  if (hit && Date.now() - hit.at < 6 * 60 * 60_000) return hit.ok
  let ok: boolean | null
  try {
    const mx = await withTimeout(resolveMx(domain), 3000)
    // A "null MX" (a single record pointing at ".") means the domain accepts no mail.
    ok = mx.some((r) => r.exchange && r.exchange !== '.')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      // No MX: mail can still go to the domain's own address (A record).
      try { ok = (await withTimeout(resolve4(domain), 3000)).length > 0 } catch (e) { const c = (e as NodeJS.ErrnoException).code; ok = c === 'ENOTFOUND' || c === 'ENODATA' ? false : null }
    } else ok = null
  }
  if (ok !== null) cache.set(domain, { ok, at: Date.now() })
  if (cache.size > 5000) cache.clear()
  return ok
}

/** Why this email can't be used, in words for the learner; null when it is fine. */
export async function emailProblem(email: string): Promise<string | null> {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase()
  if (!domain) return 'Please enter a valid email address.'
  // No exceptions, not even on test servers: no account is ever made with a test or temporary email (Learnbay, 12 Oct).
  if (RESERVED.test(domain)) return 'Please enter your real email address, so your reports reach you.'
  const parts = domain.split('.')
  if (parts.some((_, i) => DISPOSABLE.has(parts.slice(i).join('.')))) return 'Temporary inboxes can’t receive your reports and login codes. Please use your personal or work email.'
  const fix = suggestEmail(email, true)
  if (fix) return `Did you mean ${fix}? Please check the spelling of your email.`
  if (PROVIDERS.has(domain)) return null
  if (!domainEndingOk(domain)) return 'Please use your personal email (Gmail, Outlook, Yahoo…) or your work email.'
  if ((await receivesMail(domain)) === false) return `We couldn’t find the email domain “${domain}”. Please check for a typo.`
  return null
}
