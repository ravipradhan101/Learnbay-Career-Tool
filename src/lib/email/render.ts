import { escapeHtml } from '../mailer'
import { MERGE_TAGS } from './catalog'

export type MergeVars = Partial<Record<(typeof MERGE_TAGS)[number]['tag'], string>>

export const SAMPLE_VARS: MergeVars = Object.fromEntries(MERGE_TAGS.map((m) => [m.tag, m.sample]))

/** Replaces {{tag}} with its value; unknown tags become empty so a typo never reaches an inbox as "{{frist_name}}". */
export function fillTags(text: string, vars: MergeVars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, tag: string) => (vars as Record<string, string | undefined>)[tag] ?? '')
}

const P = 'margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6'
const UL = 'margin:0 0 14px;padding-left:20px;color:#334155;font-size:15px;line-height:1.6'

/** Escapes, then applies **bold**. Escaping first means nothing typed in the editor can become HTML. */
function inline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a">$1</strong>')
}

/**
 * Tiny, safe formatting for email bodies written in the admin editor:
 * blank line = new paragraph, lines starting with "- " = bullet list, **text** = bold.
 */
export function renderBody(body: string, vars: MergeVars): { html: string; text: string } {
  const filled = fillTags(body.replace(/\r\n/g, '\n'), vars).trim()
  const blocks = filled.split(/\n\s*\n/)
  const html: string[] = []
  const text: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue
    const bullets = lines.filter((l) => /^[-•*]\s+/.test(l))
    if (bullets.length === lines.length) {
      html.push(`<ul style="${UL}">${lines.map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')}</ul>`)
      text.push(lines.map((l) => `- ${l.replace(/^[-•*]\s+/, '').replace(/\*\*/g, '')}`).join('\n'))
    } else {
      // Mixed block: a lead-in line followed by bullets.
      const lead = lines.filter((l) => !/^[-•*]\s+/.test(l))
      html.push(`<p style="${P}">${lead.map(inline).join('<br>')}</p>`)
      text.push(lead.join('\n').replace(/\*\*/g, ''))
      if (bullets.length) {
        html.push(`<ul style="${UL}">${bullets.map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')}</ul>`)
        text.push(bullets.map((l) => `- ${l.replace(/^[-•*]\s+/, '').replace(/\*\*/g, '')}`).join('\n'))
      }
    }
  }
  return { html: html.join(''), text: text.join('\n\n') }
}

/** Adds campaign tags so returning visits from each email show up under Traffic sources in the admin reports. */
export function trackedUrl(appUrl: string, path: string, campaign: string, content: string): string {
  const url = new URL(path, appUrl)
  url.searchParams.set('utm_source', 'email')
  url.searchParams.set('utm_medium', 'lifecycle')
  url.searchParams.set('utm_campaign', campaign.slice(0, 60))
  url.searchParams.set('utm_content', content.slice(0, 60))
  return url.toString()
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'flow'
}
