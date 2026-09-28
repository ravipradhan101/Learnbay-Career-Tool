import { Fragment } from 'react'
import { PROGRAMS } from '@/config/programs'

/**
 * Renders assistant text safely: paragraphs, "- " bullets and **bold**. Never injects HTML.
 * With `rich`, counsellor answers become scannable: "- **Title**: detail" bullets turn into numbered points,
 * and a closing "Next step: …" line becomes a highlighted callout.
 */
export function RichText({ text, rich = false }: { text: string; rich?: boolean }) {
  const blocks: { type: 'p' | 'ul' | 'next' | 'course'; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^([-*•]|\d+[.)])\s+/.test(line)
    const content = line.replace(/^([-*•]|\d+[.)])\s+/, '')
    const last = blocks[blocks.length - 1]
    const course = line.match(/^\[\[program:([a-z0-9-]{1,60})\]\]$/)
    if (course) { if (PROGRAMS.some((p) => p.id === course[1])) blocks.push({ type: 'course', lines: [course[1]] }); continue }
    if (rich && /^\**next step\**\s*[:\-–]/i.test(line)) blocks.push({ type: 'next', lines: [line.replace(/^\**next step\**\s*[:\-–]\s*\**\s*/i, '')] })
    else if (bullet) {
      if (last?.type === 'ul') last.lines.push(content)
      else blocks.push({ type: 'ul', lines: [content] })
    } else blocks.push({ type: 'p', lines: [line.replace(/^#+\s*/, '')] })
  }
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    )
  /** "**Title**: detail" → title + detail on two lines. */
  const point = (s: string) => {
    const m = s.match(/^\*\*([^*]{1,60})\*\*\s*[:\-–]\s*(.*)$/)
    return m ? <><b className="rt-title">{m[1]}</b><span className="rt-detail">{inline(m[2])}</span></> : <span className="rt-detail">{inline(s)}</span>
  }
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'course') {
          const p = PROGRAMS.find((x) => x.id === b.lines[0])!
          return <p key={i} className="rt-course"><a href={p.url} target="_blank" rel="noopener noreferrer"><b><i>Explore the {p.name} →</i></b></a></p>
        }
        if (b.type === 'next') return <p key={i} className="rt-next"><span className="rt-next-label">Next step</span>{inline(b.lines[0])}</p>
        if (b.type === 'ul') {
          return rich
            ? <ol key={i} className="rt-points">{b.lines.map((l, j) => <li key={j}><span className="rt-n">{j + 1}</span><span className="rt-body">{point(l)}</span></li>)}</ol>
            : <ul key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul>
        }
        return <p key={i} className={rich && i === 0 && blocks.length > 1 ? 'rt-lead' : undefined}>{inline(b.lines[0])}</p>
      })}
    </>
  )
}
