// Minimal, dependency-free PDF writer for text reports (A4, Helvetica, WinAnsi encoding).

export type PdfBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'small'; text: string }
  | { type: 'gap' }

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 50
const CONTENT_W = PAGE_W - MARGIN * 2
const BLUE = '0.145 0.388 0.922'
const INK = '0.059 0.090 0.165'
const MUTED = '0.392 0.455 0.545'

// Helvetica advance widths (1/1000 em) for common characters; anything else uses 556.
const W: Record<string, number> = { ' ': 278, '.': 278, ',': 278, ':': 278, ';': 278, '-': 333, '(': 333, ')': 333, '/': 278, "'": 191, '!': 278, '|': 260, 'i': 222, 'j': 222, 'l': 222, 'f': 278, 't': 278, 'r': 333, 'I': 278, 'm': 833, 'w': 722, 'M': 833, 'W': 944, 'c': 500, 'k': 500, 's': 500, 'v': 500, 'x': 500, 'y': 500, 'z': 500, 'J': 500, 'L': 556, 'F': 611, 'T': 611, 'Z': 611, 'C': 722, 'D': 722, 'H': 722, 'N': 722, 'R': 722, 'U': 722, 'G': 778, 'O': 778, 'Q': 778 }
function textWidth(text: string, size: number, bold: boolean) {
  let w = 0
  for (const ch of text) w += W[ch] ?? (/[A-Z]/.test(ch) ? 667 : 556)
  return (w / 1000) * size * (bold ? 1.08 : 1)
}

const WIN_ANSI: Record<string, number> = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 }

/** Converts text to a PDF string literal body in WinAnsi, escaping specials. */
function pdfString(text: string): string {
  const normalised = text.replace(/₹\s?/g, 'Rs. ').replace(/→/g, '->').replace(/[→⇒]/g, '->').replace(/✓/g, '')
  let out = ''
  for (const ch of normalised) {
    let code = ch.codePointAt(0) ?? 63
    if (WIN_ANSI[ch]) code = WIN_ANSI[ch]
    else if (code > 0xff || (code >= 0x80 && code < 0xa0)) code = 63 // '?'
    if (ch === '\\' || ch === '(' || ch === ')') out += '\\' + ch
    else if (code < 32) out += ' '
    else if (code > 126) out += '\\' + code.toString(8).padStart(3, '0')
    else out += String.fromCharCode(code)
  }
  return out
}

function wrap(text: string, size: number, bold: boolean, width: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, size, bold) <= width || !line) line = candidate
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  return lines
}

export function buildPdf(opts: { title: string; subtitle: string; blocks: PdfBlock[]; footer: string }): Buffer {
  const pages: string[] = []
  let ops: string[] = []
  let y = 0

  const newPage = (first: boolean) => {
    if (ops.length) pages.push(ops.join('\n'))
    ops = []
    if (first) {
      ops.push(`${BLUE} rg 0 ${PAGE_H - 110} ${PAGE_W} 110 re f`)
      ops.push(`BT /F2 11 Tf 1 1 1 rg ${MARGIN} ${PAGE_H - 38} Td (${pdfString('LEARNBAY  ·  CAREER STUDIO')}) Tj ET`)
      const titleLines = wrap(opts.title, 22, true, CONTENT_W)
      let ty = PAGE_H - 68
      for (const l of titleLines.slice(0, 2)) { ops.push(`BT /F2 22 Tf 1 1 1 rg ${MARGIN} ${ty} Td (${pdfString(l)}) Tj ET`); ty -= 26 }
      ops.push(`BT /F1 10 Tf 0.86 0.91 1 rg ${MARGIN} ${PAGE_H - 100} Td (${pdfString(opts.subtitle)}) Tj ET`)
      y = PAGE_H - 140
    } else {
      y = PAGE_H - MARGIN
    }
  }
  const ensure = (h: number) => { if (y - h < MARGIN + 30) newPage(false) }

  newPage(true)
  for (const b of opts.blocks) {
    if (b.type === 'gap') { y -= 8; continue }
    if (b.type === 'h') {
      ensure(40)
      y -= 14
      for (const l of wrap(b.text, 13, true, CONTENT_W)) { ops.push(`BT /F2 13 Tf ${BLUE} rg ${MARGIN} ${y} Td (${pdfString(l)}) Tj ET`); y -= 17 }
      ops.push(`${'0.886 0.910 0.941'} RG 0.8 w ${MARGIN} ${y + 10} m ${PAGE_W - MARGIN} ${y + 10} l S`)
      y -= 4
      continue
    }
    const bullet = b.type === 'bullet'
    const size = b.type === 'small' ? 8.5 : 10.5
    const color = b.type === 'small' ? MUTED : INK
    const indent = bullet ? 14 : 0
    const lines = wrap(b.text, size, false, CONTENT_W - indent)
    const lh = size * 1.45
    // Keep short items together rather than splitting them across a page break.
    if (lines.length <= 6) ensure(lh * lines.length)
    for (let i = 0; i < lines.length; i++) {
      ensure(lh)
      if (bullet && i === 0) ops.push(`${BLUE} rg ${MARGIN + 3} ${y + 2.5} 3 3 re f`)
      ops.push(`BT /F1 ${size} Tf ${color} rg ${MARGIN + indent} ${y} Td (${pdfString(lines[i])}) Tj ET`)
      y -= lh
    }
    y -= bullet ? 3 : 6
  }
  pages.push(ops.join('\n'))

  // Footer with page numbers on every page.
  const total = pages.length
  const withFooter = pages.map((content, i) =>
    `${content}\nBT /F1 8 Tf ${MUTED} rg ${MARGIN} 28 Td (${pdfString(`${opts.footer}   ·   Page ${i + 1} of ${total}`)}) Tj ET`)

  // Objects: 1 catalog, 2 pages, 3 F1, 4 F2, then page + content pairs.
  const objects: string[] = []
  const kids: string[] = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  withFooter.forEach((content, i) => {
    const pageId = 5 + i * 2
    const contentId = pageId + 1
    kids.push(`${pageId} 0 R`)
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    objects[contentId] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`
  })
  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(out, 'latin1')
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info << /Producer (Learnbay Career Studio) /Title (${pdfString(opts.title)}) >> >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(out, 'latin1')
}
