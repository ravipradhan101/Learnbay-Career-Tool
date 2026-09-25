// Dependency-free PDF writer for the emailed reports (A4, Helvetica, WinAnsi).
// Besides text it draws simple visuals: headline number, KPI tiles, bar and range charts, a timeline,
// a numbered action list and a call-out with a clickable button (PDF link annotation).

export type PdfBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'small'; text: string }
  | { type: 'gap' }
  | { type: 'hero'; value: string; label: string; note: string }
  | { type: 'kpis'; items: { label: string; value: string; sub?: string }[] }
  | { type: 'bars'; rows: { label: string; value: number; marker?: number; tag?: string }[]; max: number; legend?: [string, string] }
  | { type: 'ranges'; rows: { label: string; min: number; max: number; highlight?: boolean }[] }
  | { type: 'timeline'; rows: { label: string; from: number; to: number; note?: string }[]; total: number; unit: string }
  | { type: 'actions'; items: { title: string; detail?: string }[] }
  | { type: 'callout'; title: string; text: string; button?: { label: string; url: string } }

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 46
const CONTENT_W = PAGE_W - MARGIN * 2

type Rgb = [number, number, number]
const BLUE: Rgb = [0.145, 0.388, 0.922]
const BLUE_50: Rgb = [0.937, 0.961, 1]
const BLUE_100: Rgb = [0.859, 0.914, 0.996]
const INK: Rgb = [0.059, 0.09, 0.165]
const MUTED: Rgb = [0.392, 0.455, 0.545]
const LINE: Rgb = [0.886, 0.91, 0.941]
const TRACK: Rgb = [0.933, 0.945, 0.965]
const ORANGE: Rgb = [0.976, 0.451, 0.086]
const ORANGE_50: Rgb = [1, 0.969, 0.929]
const GREEN: Rgb = [0.086, 0.639, 0.29]
const WHITE: Rgb = [1, 1, 1]
const TONES: Rgb[] = [BLUE, ORANGE, GREEN, [0.486, 0.227, 0.929]]
const rgb = (c: Rgb) => c.map((v) => v.toFixed(3)).join(' ')

// Helvetica advance widths (1/1000 em) for common characters; anything else uses 556.
const W: Record<string, number> = { ' ': 278, '.': 278, ',': 278, ':': 278, ';': 278, '-': 333, '(': 333, ')': 333, '/': 278, "'": 191, '!': 278, '|': 260, 'i': 222, 'j': 222, 'l': 222, 'f': 278, 't': 278, 'r': 333, 'I': 278, 'm': 833, 'w': 722, 'M': 833, 'W': 944, 'c': 500, 'k': 500, 's': 500, 'v': 500, 'x': 500, 'y': 500, 'z': 500, 'J': 500, 'L': 556, 'F': 611, 'T': 611, 'Z': 611, 'C': 722, 'D': 722, 'H': 722, 'N': 722, 'R': 722, 'U': 722, 'G': 778, 'O': 778, 'Q': 778, '%': 889, '+': 584, '1': 556 }
function textWidth(text: string, size: number, bold: boolean) {
  let w = 0
  for (const ch of normalise(text)) w += W[ch] ?? (/[A-Z]/.test(ch) ? 667 : 556)
  return (w / 1000) * size * (bold ? 1.08 : 1)
}

const WIN_ANSI: Record<string, number> = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 }
const normalise = (text: string) => text.replace(/₹\s?/g, 'Rs ').replace(/[→⇒]/g, '->').replace(/✓/g, '')

/** Converts text to a PDF string literal body in WinAnsi, escaping specials. */
function pdfString(text: string): string {
  let out = ''
  for (const ch of normalise(text)) {
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

/** Truncates to fit a width, adding an ellipsis. */
function fit(text: string, size: number, bold: boolean, width: number): string {
  if (textWidth(text, size, bold) <= width) return text
  let t = text
  while (t.length > 1 && textWidth(`${t}…`, size, bold) > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

type Link = { x: number; y: number; w: number; h: number; url: string }

export function buildPdf(opts: { title: string; subtitle: string; blocks: PdfBlock[]; footer: string }): Buffer {
  const pages: { ops: string[]; links: Link[] }[] = []
  let page = { ops: [] as string[], links: [] as Link[] }
  let y = 0

  const rect = (x: number, yy: number, w: number, h: number, c: Rgb) => page.ops.push(`${rgb(c)} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`)
  const line = (x1: number, y1: number, x2: number, y2: number, c: Rgb, w = 0.8) => page.ops.push(`${rgb(c)} RG ${w} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`)
  const text = (x: number, yy: number, size: number, bold: boolean, c: Rgb, s: string) =>
    page.ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(c)} rg ${x.toFixed(2)} ${yy.toFixed(2)} Td (${pdfString(s)}) Tj ET`)
  const textRight = (xRight: number, yy: number, size: number, bold: boolean, c: Rgb, s: string) => text(xRight - textWidth(s, size, bold), yy, size, bold, c, s)
  const para = (s: string, x: number, width: number, size: number, bold: boolean, c: Rgb, lh = size * 1.4) => {
    for (const l of wrap(s, size, bold, width)) { text(x, y, size, bold, c, l); y -= lh }
  }

  const newPage = (first: boolean) => {
    if (page.ops.length) pages.push(page)
    page = { ops: [], links: [] }
    if (first) {
      rect(0, PAGE_H - 104, PAGE_W, 104, BLUE)
      rect(0, PAGE_H - 108, PAGE_W, 4, ORANGE)
      text(MARGIN, PAGE_H - 34, 10, true, WHITE, 'LEARNBAY  ·  CAREER STUDIO')
      let ty = PAGE_H - 62
      for (const l of wrap(opts.title, 22, true, CONTENT_W).slice(0, 2)) { text(MARGIN, ty, 22, true, WHITE, l); ty -= 26 }
      text(MARGIN, PAGE_H - 92, 10, false, [0.86, 0.91, 1], opts.subtitle)
      y = PAGE_H - 136
    } else {
      y = PAGE_H - MARGIN
    }
  }
  const ensure = (h: number) => { if (y - h < MARGIN + 26) newPage(false) }

  newPage(true)
  for (const b of opts.blocks) {
    switch (b.type) {
      case 'gap': y -= 8; break
      case 'h': {
        ensure(44)
        y -= 16
        rect(MARGIN, y - 3, 3.5, 16, ORANGE)
        text(MARGIN + 11, y, 13.5, true, INK, b.text)
        y -= 16
        break
      }
      case 'p': case 'small': case 'bullet': {
        const bullet = b.type === 'bullet'
        const size = b.type === 'small' ? 8.5 : 10.5
        const color = b.type === 'small' ? MUTED : INK
        const indent = bullet ? 14 : 0
        const lines = wrap(b.text, size, false, CONTENT_W - indent)
        const lh = size * 1.45
        if (lines.length <= 6) ensure(lh * lines.length)
        lines.forEach((l, i) => {
          ensure(lh)
          if (bullet && i === 0) rect(MARGIN + 3, y + 2.5, 3.5, 3.5, BLUE)
          text(MARGIN + indent, y, size, false, color, l)
          y -= lh
        })
        y -= bullet ? 3 : 6
        break
      }
      case 'hero': {
        const noteLines = wrap(b.note, 10.5, false, CONTENT_W - 190)
        const h = Math.max(78, 30 + noteLines.length * 15)
        ensure(h + 10)
        const top = y + 10
        rect(MARGIN, top - h, CONTENT_W, h, BLUE_50)
        rect(MARGIN, top - h, 5, h, BLUE)
        const size = b.value.length > 6 ? 30 : 40
        text(MARGIN + 20, top - 46, size, true, BLUE, b.value)
        const labelLines = wrap(b.label, 10, true, 150)
        let ly = top - 62
        for (const l of labelLines.slice(0, 2)) { text(MARGIN + 20, ly, 10, true, MUTED, l); ly -= 12 }
        let ny = top - 26
        for (const l of noteLines) { text(MARGIN + 180, ny, 10.5, false, INK, l); ny -= 15 }
        y = top - h - 12
        break
      }
      case 'kpis': {
        const n = Math.min(4, b.items.length)
        const gap = 10
        const w = (CONTENT_W - gap * (n - 1)) / n
        const h = 62
        ensure(h + 6)
        const top = y + 8
        b.items.slice(0, 4).forEach((k, i) => {
          const x = MARGIN + i * (w + gap)
          rect(x, top - h, w, h, [0.976, 0.98, 0.988])
          rect(x, top - 3, w, 3, TONES[i % TONES.length])
          const ls = textWidth(k.label.toUpperCase(), 8, true) > w - 20 ? 7 : 8
          text(x + 10, top - 18, ls, true, MUTED, fit(k.label.toUpperCase(), ls, true, w - 20))
          if (textWidth(k.value, 12, true) <= w - 20) {
            const vs = textWidth(k.value, 16, true) > w - 20 ? 12 : 16
            text(x + 10, top - 38, vs, true, INK, k.value)
            if (k.sub) text(x + 10, top - 52, 8, false, MUTED, fit(k.sub, 8, false, w - 20))
          } else {
            // Long values (a company type, a skill) wrap to two lines instead of being cut off.
            const lines = wrap(k.value, 10.5, true, w - 20)
            text(x + 10, top - 32, 10.5, true, INK, lines[0])
            if (lines[1]) text(x + 10, top - 44, 10.5, true, INK, fit(lines.slice(1).join(' '), 10.5, true, w - 20))
            if (k.sub) text(x + 10, top - 56, 7.5, false, MUTED, fit(k.sub, 7.5, false, w - 20))
          }
        })
        y = top - h - 14
        break
      }
      case 'bars': {
        const labelW = 150, valueW = 58
        const barW = CONTENT_W - labelW - valueW
        for (const r of b.rows) {
          ensure(20)
          text(MARGIN, y, 9.5, false, INK, fit(r.label, 9.5, false, labelW - 8))
          const bx = MARGIN + labelW
          rect(bx, y - 1, barW, 9, TRACK)
          rect(bx, y - 1, Math.max(2, (Math.min(r.value, b.max) / b.max) * barW), 9, BLUE)
          if (r.marker !== undefined) { const mx = bx + (Math.min(r.marker, b.max) / b.max) * barW; rect(mx - 1, y - 4, 2.2, 15, ORANGE) }
          if (r.tag) textRight(PAGE_W - MARGIN, y, 9, true, r.tag.startsWith('+') ? ORANGE : GREEN, r.tag)
          y -= 19
        }
        if (b.legend) {
          ensure(14)
          rect(MARGIN + labelW, y + 1, 10, 6, BLUE); text(MARGIN + labelW + 14, y, 8, false, MUTED, b.legend[0])
          rect(MARGIN + labelW + 110, y - 1, 2.2, 10, ORANGE); text(MARGIN + labelW + 117, y, 8, false, MUTED, b.legend[1])
          y -= 16
        }
        y -= 4
        break
      }
      case 'ranges': {
        const labelW = 150
        const barW = CONTENT_W - labelW
        const top = Math.ceil(Math.max(10, ...b.rows.map((r) => r.max)) * 1.1)
        for (const r of b.rows) {
          ensure(22)
          text(MARGIN, y, 9.5, r.highlight ?? false, INK, fit(r.label, 9.5, r.highlight ?? false, labelW - 8))
          const bx = MARGIN + labelW
          rect(bx, y - 2, barW, 11, TRACK)
          const x1 = bx + (r.min / top) * barW, x2 = bx + (r.max / top) * barW
          rect(x1, y - 2, Math.max(4, x2 - x1), 11, r.highlight ? ORANGE : BLUE)
          const lbl = `Rs ${r.min}-${r.max}L`
          const lw = textWidth(lbl, 8, true)
          if (x2 - x1 > lw + 8) text(x1 + 4, y + 0.5, 8, true, WHITE, lbl)
          else text(Math.min(x2 + 4, PAGE_W - MARGIN - lw), y + 0.5, 8, true, INK, lbl)
          y -= 21
        }
        ensure(12)
        for (const f of [0, 0.25, 0.5, 0.75, 1]) text(MARGIN + labelW + f * (barW - 24), y + 4, 7.5, false, MUTED, `Rs ${Math.round(top * f)}L`)
        y -= 14
        break
      }
      case 'timeline': {
        const labelW = 150
        const barW = CONTENT_W - labelW
        b.rows.forEach((r, i) => {
          ensure(22)
          text(MARGIN, y, 9.5, true, INK, fit(`${i + 1}. ${r.label}`, 9.5, true, labelW - 8))
          const bx = MARGIN + labelW
          rect(bx, y - 2, barW, 11, TRACK)
          const x1 = bx + ((r.from - 1) / b.total) * barW
          const w = Math.max(10, ((r.to - r.from + 1) / b.total) * barW)
          rect(x1, y - 2, w, 11, TONES[i % TONES.length])
          if (r.note) text(x1 + 4, y + 0.5, 7.5, true, WHITE, fit(r.note, 7.5, true, w - 6))
          y -= 21
        })
        ensure(12)
        text(MARGIN + labelW, y + 4, 7.5, false, MUTED, `${b.unit} 1`)
        textRight(PAGE_W - MARGIN, y + 4, 7.5, false, MUTED, `${b.unit} ${Math.round(b.total)}`)
        y -= 14
        break
      }
      case 'actions': {
        b.items.forEach((a, i) => {
          const detail = a.detail ? wrap(a.detail, 9.5, false, CONTENT_W - 50) : []
          const h = 22 + detail.length * 13
          ensure(h + 8)
          const top = y + 10
          rect(MARGIN, top - h, CONTENT_W, h, i === b.items.length - 1 ? ORANGE_50 : BLUE_50)
          rect(MARGIN + 10, top - 22, 18, 18, i === b.items.length - 1 ? ORANGE : BLUE)
          text(MARGIN + (i >= 9 ? 13.5 : 16), top - 16.5, 10, true, WHITE, String(i + 1))
          text(MARGIN + 38, top - 16, 10.5, true, INK, fit(a.title, 10.5, true, CONTENT_W - 50))
          let dy = top - 30
          for (const l of detail) { text(MARGIN + 38, dy, 9.5, false, MUTED, l); dy -= 13 }
          y = top - h - 12
        })
        y -= 4
        break
      }
      case 'callout': {
        const lines = wrap(b.text, 10, false, CONTENT_W - 36)
        const h = 38 + lines.length * 14 + (b.button ? 34 : 0)
        ensure(h + 10)
        const top = y + 10
        rect(MARGIN, top - h, CONTENT_W, h, BLUE)
        text(MARGIN + 18, top - 24, 13, true, WHITE, b.title)
        let ly = top - 42
        for (const l of lines) { text(MARGIN + 18, ly, 10, false, [0.9, 0.93, 1], l); ly -= 14 }
        if (b.button) {
          const bw = textWidth(b.button.label, 10.5, true) + 28
          const bx = MARGIN + 18, by = top - h + 12
          rect(bx, by, bw, 24, ORANGE)
          text(bx + 14, by + 8, 10.5, true, WHITE, b.button.label)
          page.links.push({ x: bx, y: by, w: bw, h: 24, url: b.button.url })
        }
        y = top - h - 14
        break
      }
    }
  }
  pages.push(page)

  const total = pages.length
  pages.forEach((p, i) => {
    p.ops.push(`${rgb(LINE)} RG 0.6 w ${MARGIN} 38 m ${PAGE_W - MARGIN} 38 l S`)
    p.ops.push(`BT /F1 8 Tf ${rgb(MUTED)} rg ${MARGIN} 26 Td (${pdfString(`${opts.footer}   ·   Page ${i + 1} of ${total}`)}) Tj ET`)
  })

  // Objects: 1 catalog, 2 pages, 3 F1, 4 F2, then per page: page, content, link annotations.
  const objects: string[] = []
  const kids: string[] = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  let next = 5
  for (const p of pages) {
    const pageId = next++
    const contentId = next++
    const annotIds = p.links.map(() => next++)
    const content = p.ops.join('\n')
    kids.push(`${pageId} 0 R`)
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R${annotIds.length ? ` /Annots [${annotIds.map((a) => `${a} 0 R`).join(' ')}]` : ''} >>`
    objects[contentId] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`
    p.links.forEach((l, i) => {
      objects[annotIds[i]] = `<< /Type /Annot /Subtype /Link /Rect [${l.x.toFixed(2)} ${l.y.toFixed(2)} ${(l.x + l.w).toFixed(2)} ${(l.y + l.h).toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${pdfString(l.url)}) >> >>`
    })
  }
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
