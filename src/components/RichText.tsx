import { Fragment } from 'react'

/** Renders assistant text safely: paragraphs, "- " bullets and **bold**. Never injects HTML. */
export function RichText({ text }: { text: string }) {
  const blocks: { type: 'p' | 'ul'; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^([-*•]|\d+[.)])\s+/.test(line)
    const content = line.replace(/^([-*•]|\d+[.)])\s+/, '')
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'ul') last.lines.push(content)
      else blocks.push({ type: 'ul', lines: [content] })
    } else blocks.push({ type: 'p', lines: [line.replace(/^#+\s*/, '')] })
  }
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    )
  return (
    <>
      {blocks.map((b, i) =>
        b.type === 'ul' ? <ul key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul> : <p key={i}>{inline(b.lines[0])}</p>,
      )}
    </>
  )
}
