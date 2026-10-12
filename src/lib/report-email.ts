import { getProgram } from '@/config/programs'
import { getResources } from '@/config/resources'
import { PUBLISHED_STORY, USPS, type UspId } from '@/config/usps'
import { learnerUrl } from './links'
import { escapeHtml, sendMail, type Mail } from './mailer'
import { buildPdf, type PdfBlock } from './pdf'
import { summaryFor, weekRange, type ReportSummary } from './report-summary'
import { currentCtcRange } from './tools'
import type { Answers } from './questions'
import type { ToolMeta } from './tools-meta'
import type { RoadmapResult, SalaryResult, SkillGapResult, ToolResultMap } from './tool-types'
import { focusFor } from './plan'
import { capstonesFor, type Capstone } from './capstones'
import { withCurriculum } from './curriculum-phases'
import { curriculumOf } from './roles'
import { domainLabel, experienceLabel, roleLabel, targetRoleLabel } from './questions'

// Emailed reports. People skim email: the body shows the headline number, key numbers, one mini chart,
// the next 3 moves and two buttons. The attached PDF opens with the same visual summary page, then details.

type Opts = { userId: string; to: string; name: string; meta: ToolMeta; data: ToolResultMap[ToolMeta['id']]; answers: Answers; capstones?: Capstone[] }

/** Adds the capstones that fit this learner (the PDF's plan section shows them). */
export async function withCapstones<T extends Opts>(opts: T): Promise<T> {
  const programId = (opts.data as { programId: string }).programId
  const ideas = opts.meta.id === 'roadmap' ? (opts.data as ToolResultMap['roadmap']).projects : []
  const data = opts.meta.id === 'roadmap' ? withCurriculum(opts.data as ToolResultMap['roadmap']) : opts.data
  return { ...opts, data, capstones: await capstonesFor(programId, opts.answers, ideas) }
}

const USPS_FOR: Record<ToolMeta['id'], UspId[]> = {
  'skill-gap': ['customisation', 'projects', 'mentors'],
  salary: ['placement', 'domain', 'projects'],
  roadmap: ['mentors', 'hybrid', 'placement'],
}

// ---------- PDF ----------

function chartBlocks(tool: ToolMeta['id'], data: ToolResultMap[ToolMeta['id']], answers: Answers): PdfBlock[] {
  if (tool === 'skill-gap') {
    const r = data as SkillGapResult
    const rows = [...r.skills].sort((a, b) => (b.requiredLevel - b.currentLevel) - (a.requiredLevel - a.currentLevel)).slice(0, 7)
      .map((s) => ({ label: s.name, value: s.currentLevel, marker: s.requiredLevel, tag: s.requiredLevel > s.currentLevel ? `+${s.requiredLevel - s.currentLevel} to go` : 'Ready' }))
    return [{ type: 'h', text: 'Where you stand, biggest gaps first' }, { type: 'bars', rows, max: 100, legend: ['You today', 'Needed for the role'] }]
  }
  if (tool === 'salary') {
    const r = data as SalaryResult
    const cur = currentCtcRange(answers)
    return [
      { type: 'h', text: 'What you could earn (Rs lakh per year)' },
      { type: 'ranges', rows: [
        ...(cur ? [{ label: 'You today', min: cur.minLpa, max: cur.maxLpa ?? Math.round(cur.minLpa * 1.2), highlight: true }] : []),
        { label: 'Your role, market', min: r.currentRoleMarket.minLpa, max: r.currentRoleMarket.maxLpa },
        ...r.targetRoles.map((t) => ({ label: t.role, min: t.minLpa, max: t.maxLpa })),
      ] },
      ...(r.careerLadder?.length ? [{ type: 'h' as const, text: 'How pay grows in the role' }, { type: 'ranges' as const, rows: r.careerLadder.map((l) => ({ label: `${l.stage} (${l.years})`, min: l.minLpa, max: l.maxLpa })) }] : []),
    ]
  }
  const r = data as RoadmapResult
  const totalWeeks = Math.max(4, Math.round(r.durationMonths * 4.3))
  const per = totalWeeks / Math.max(1, r.phases.length)
  return [
    { type: 'h', text: 'Your plan, phase by phase' },
    { type: 'timeline', total: totalWeeks, unit: 'Week', rows: r.phases.map((p, i) => {
      const [a, b] = weekRange(p.weeks, [Math.round(i * per) + 1, Math.round((i + 1) * per)])
      return { label: p.title, from: a, to: Math.min(b, totalWeeks), note: p.weeks }
    }) },
  ]
}

function detailBlocks(tool: ToolMeta['id'], data: ToolResultMap[ToolMeta['id']]): PdfBlock[] {
  const out: PdfBlock[] = []
  const section = (title: string, items: string[]) => { if (items.length) { out.push({ type: 'h', text: title }); for (const t of items) out.push({ type: 'bullet', text: t }) } }
  if (tool === 'skill-gap') {
    const r = data as SkillGapResult
    section('How to close each gap', (r.gapDetails ?? []).map((g) => `${g.skill} (~${g.weeks} weeks). ${g.howToClose}`))
    section('Your strengths', r.strengths)
    section('What interviewers will test', r.interviewTopics?.length ? [r.interviewTopics.join(' · ')] : [])
    section('Projects that prove the skills', (r.proofProjects ?? []).map((p) => `${p.title}: ${p.proves}`))
    section('Your first 30 days', (r.thirtyDayPlan ?? []).map((w) => `${w.week}: ${w.focus}`))
    section('Common mistakes to avoid', r.watchOuts ?? [])
  } else if (tool === 'salary') {
    const r = data as SalaryResult
    section('Skills that raise your pay', (r.skillPremiums ?? []).map((k) => `${k.skill} (${k.impact} impact): ${k.note}`))
    section('Who pays most', (r.companyTypes ?? []).map((c) => `${c.type}: Rs ${c.minLpa}-${c.maxLpa}L. ${c.note}`))
    section('Pay by city', (r.cityComparison ?? []).map((c) => `${c.city}: Rs ${c.minLpa}-${c.maxLpa}L`))
    section('Negotiating your offer', r.negotiationTips ?? [])
    out.push({ type: 'small', text: r.note || 'Indicative market ranges, not offers or guarantees.' })
  } else {
    const r = data as RoadmapResult
    // The plan, phase by phase, without the syllabus (modules and topics live on the program page).
    r.phases.forEach((p, i) => section(`Phase ${i + 1}: ${p.title} (${p.weeks})`, [p.focus, `Milestone: ${p.milestone}`, ...(p.deliverables ?? []).map((d) => `You will have: ${d}`)]))
    section('Monthly checkpoints', (r.monthlyCheckpoints ?? []).map((m) => `Month ${m.month}: ${m.goal}`))
    section('Portfolio projects', r.projects.map((p) => `${p.title} (${p.difficulty}): ${p.description}`))
    section('Where plans stall, and what to do', (r.risks ?? []).map((k) => `${k.risk}: ${k.mitigation}`))
    section('Free resources', getResources(r.resourceIds).map((res) => `${res.title} (${res.provider}): ${res.url}`))
  }
  return out
}

/** "Your plan with Learnbay" in the PDF: who they are, what to focus on, certificates, projects (no syllabus). */
function planBlocks(opts: Opts, programId: string, programName: string): PdfBlock[] {
  const a = opts.answers
  const course = curriculumOf(programId)
  const about = [roleLabel(a), experienceLabel(a), domainLabel(a), targetRoleLabel(a) !== 'Not specified' ? `aiming for ${targetRoleLabel(a)}` : ''].filter((x) => x && x !== 'Not specified')
  const focus = focusFor(opts.meta.id, opts.data).slice(0, 4)
  return [
    { type: 'h', text: `Your plan with Learnbay: ${programName}` },
    ...(about.length ? [{ type: 'small', text: `About you: ${about.join(' · ')}` } as PdfBlock] : []),
    // What to focus on, in order (no syllabus or module names: the program page has the syllabus).
    ...focus.map((f, i): PdfBlock => ({ type: 'bullet', text: `${i + 1}. ${f}` })),
    ...(course.certifications.length ? [{ type: 'bullet', text: `Certificates: ${course.certifications.join(' · ')}` } as PdfBlock] : []),
    ...(opts.capstones ?? []).map((x): PdfBlock => ({ type: 'bullet', text: `Capstone (${x.label.replace(/ · .*$/, '')}): ${x.title}. ${x.objective}${x.outcome ? ` You'll achieve: ${x.outcome}` : ''}` })),
  ]
}

/** The same report as a branded, visual PDF: summary page first, details after. */
export function toolReportPdf(opts: Opts): Buffer {
  const s: ReportSummary = summaryFor(opts.meta.id, opts.data, currentCtcRange(opts.answers))
  const p = getProgram((opts.data as { programId: string }).programId)
  const blocks: PdfBlock[] = [
    { type: 'hero', value: s.headline.value, label: s.headline.label.replace(/^\/100 /, 'out of 100, '), note: s.headline.note },
    { type: 'kpis', items: s.kpis },
    ...chartBlocks(opts.meta.id, opts.data, opts.answers),
    { type: 'h', text: `Your next ${s.actions.length} moves` },
    { type: 'actions', items: s.actions.map((a) => ({ title: a.title, detail: a.detail })) },
    {
      type: 'callout',
      title: 'Turn this report into a plan, free',
      text: `Book a free call with a Learnbay Senior Career Counsellor. Bring this report: you will leave knowing which role to target, what to learn first, and whether the ${p.name} fits you.`,
      button: { label: 'Book my free 1:1', url: learnerUrl(opts.userId, '/dashboard/sessions') },
    },
    // Their plan with Learnbay comes before the details.
    ...planBlocks(opts, p.id, p.name),
    ...detailBlocks(opts.meta.id, opts.data),
    { type: 'h', text: `How Learnbay helps you get there` },
    ...(['customisation', 'domain', 'projects', 'mentors', 'certification', 'placement'] as const).map((id): PdfBlock => ({ type: 'bullet', text: `${USPS[id].title}: ${USPS[id].short}` })),
    { type: 'bullet', text: `Program details: ${p.url}` },
    { type: 'small', text: `"${PUBLISHED_STORY.quote}" (${PUBLISHED_STORY.name}, ${PUBLISHED_STORY.role}, as published on ${PUBLISHED_STORY.source})` },
    { type: 'gap' },
    { type: 'small', text: `AI-generated guidance by Learnbay Career Studio.${opts.meta.id === 'salary' ? ' Salary figures are indicative market ranges, not offers or guarantees.' : ' Timelines depend on the hours you put in; they are estimates, not guarantees.'}` },
  ]
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
  return buildPdf({ title: opts.meta.name, subtitle: `Prepared for ${opts.name}  ·  ${date}`, blocks, footer: 'Learnbay Career Studio' })
}

// ---------- Email body ----------

const TONE: Record<string, string> = { primary: '#4338ca', success: '#16a34a', accent: '#f97316', warning: '#d97706' }

function miniChartHtml(tool: ToolMeta['id'], data: ToolResultMap[ToolMeta['id']]): string {
  const row = (label: string, pct: number, value: string, color: string, marker?: number) => `
<tr><td style="padding:4px 8px 4px 0;font-size:13px;color:#334155;width:38%">${escapeHtml(label)}</td>
<td style="padding:4px 0;width:44%"><div style="position:relative;background:#eef2f7;border-radius:6px;height:12px">
<div style="background:${color};width:${Math.max(3, Math.min(100, pct))}%;height:12px;border-radius:6px"></div>
${marker !== undefined ? `<div style="position:absolute;left:${Math.min(99, marker)}%;top:-3px;width:3px;height:18px;background:#f97316"></div>` : ''}
</div></td><td style="padding:4px 0 4px 8px;font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap;text-align:right">${escapeHtml(value)}</td></tr>`
  let rows = ''
  let title = ''
  if (tool === 'skill-gap') {
    const r = data as SkillGapResult
    title = 'Biggest gaps (bar = you, orange line = needed)'
    rows = [...r.skills].sort((a, b) => (b.requiredLevel - b.currentLevel) - (a.requiredLevel - a.currentLevel)).slice(0, 4)
      .map((s) => row(s.name, s.currentLevel, s.requiredLevel > s.currentLevel ? `+${s.requiredLevel - s.currentLevel}` : 'Ready', '#4338ca', s.requiredLevel)).join('')
  } else if (tool === 'salary') {
    const r = data as SalaryResult
    const top = Math.max(10, ...r.targetRoles.map((t) => t.maxLpa), r.currentRoleMarket.maxLpa)
    title = 'What you could earn (₹ lakh per year, top of range)'
    rows = [row('Your role today', (r.currentRoleMarket.maxLpa / top) * 100, `₹${r.currentRoleMarket.minLpa}–${r.currentRoleMarket.maxLpa}L`, '#94a3b8'),
      ...r.targetRoles.map((t) => row(t.role, (t.maxLpa / top) * 100, `₹${t.minLpa}–${t.maxLpa}L`, '#4338ca'))].join('')
  } else {
    const r = data as RoadmapResult
    const totalWeeks = Math.max(4, Math.round(r.durationMonths * 4.3))
    title = 'Your plan, phase by phase'
    rows = r.phases.map((p, i) => {
      const [, b] = weekRange(p.weeks, [1, totalWeeks])
      return row(`${i + 1}. ${p.title}`, (Math.min(b, totalWeeks) / totalWeeks) * 100, p.weeks, ['#4338ca', '#f97316', '#16a34a', '#7c3aed'][i % 4])
    }).join('')
  }
  return `<p style="margin:18px 0 6px;font-size:13px;font-weight:700;color:#0f172a">${escapeHtml(title)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
}

/** The report email (body + PDF attachment), also used by the admin preview. */
export function buildReportEmail(opts: Opts): Mail {
  const s = summaryFor(opts.meta.id, opts.data, currentCtcRange(opts.answers))
  const pdf = toolReportPdf(opts)
  const sessionUrl = learnerUrl(opts.userId, '/dashboard/sessions')
  const program = getProgram((opts.data as { programId: string }).programId)

  const kpis = s.kpis.slice(0, 4)
  const kpiHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 4px"><tr>${kpis.map((k) => `
<td width="${Math.floor(100 / kpis.length)}%" style="padding:4px"><div style="background:#f8fafc;border-top:3px solid ${TONE[k.tone ?? 'primary']};border-radius:8px;padding:10px">
<div style="font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#64748b">${escapeHtml(k.label)}</div>
<div style="font-size:17px;font-weight:800;color:#0f172a;margin-top:4px">${escapeHtml(k.value)}</div>
${k.sub ? `<div style="font-size:11px;color:#64748b">${escapeHtml(k.sub)}</div>` : ''}</div></td>`).join('')}</tr></table>`
  const actionsHtml = `<p style="margin:20px 0 8px;font-size:15px;font-weight:800;color:#0f172a">Your next ${s.actions.length} moves</p>${s.actions.map((a, i) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:${i === s.actions.length - 1 ? '#fff7ed' : '#eef2ff'};border-radius:10px"><tr>
<td width="34" valign="top" style="padding:12px 0 12px 12px"><div style="width:22px;height:22px;border-radius:50%;background:${i === s.actions.length - 1 ? '#f97316' : '#4338ca'};color:#fff;font-size:12px;font-weight:800;text-align:center;line-height:22px">${i + 1}</div></td>
<td style="padding:12px 12px 12px 8px"><div style="font-size:14px;font-weight:700;color:#0f172a">${escapeHtml(a.title)}</div>${a.detail ? `<div style="font-size:13px;color:#475569;line-height:1.5;margin-top:2px">${escapeHtml(a.detail)}</div>` : ''}</td></tr></table>`).join('')}`
  // The full report is the attached PDF, so the one button is the next step: booking the free call.
  const buttons = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr>
<td style="padding:0 0 8px"><a href="${escapeHtml(sessionUrl)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;font-size:14px">Book a free counselling call</a></td>
</tr></table>`
  // Salary figures are always indicative, in the email as in the report and PDF.
  const salaryNote = opts.meta.id === 'salary' ? 'Salary figures are indicative market ranges, not offers or guarantees.' : ''
  const bodyHtml = `
<div style="background:#eef2ff;border-radius:12px;padding:16px 18px;margin:4px 0">
<span style="font-size:34px;font-weight:800;color:#4338ca;line-height:1">${escapeHtml(s.headline.value)}</span>
<span style="font-size:14px;font-weight:700;color:#475569;margin-left:6px">${escapeHtml(s.headline.label.replace(/^\/100 /, 'out of 100 · '))}</span>
<p style="margin:8px 0 0;font-size:14px;color:#334155;line-height:1.55">${escapeHtml(s.headline.note)}</p></div>
${kpiHtml}${miniChartHtml(opts.meta.id, opts.data)}${actionsHtml}${buttons}
<p style="margin:10px 0 0;font-size:13px;color:#475569">📎 Your full report, with every detail and chart, is attached as a PDF.</p>${salaryNote ? `<p style="margin:6px 0 0;font-size:12px;color:#64748b">${salaryNote}</p>` : ''}
<p style="margin:14px 0 0;font-size:13px;color:#475569;border-top:1px solid #e2e8f0;padding-top:12px"><b style="color:#0f172a">Recommended for you:</b> ${escapeHtml(program.name)} · ${escapeHtml(program.features.join(' · '))}</p>`
  const bodyText = [
    `${s.headline.value} ${s.headline.label.replace(/^\/100 /, 'out of 100, ')}. ${s.headline.note}`,
    '', ...s.kpis.map((k) => `${k.label}: ${k.value}${k.sub ? ` (${k.sub})` : ''}`),
    '', `Your next ${s.actions.length} moves:`, ...s.actions.map((a, i) => `${i + 1}. ${a.title}${a.detail ? ` - ${a.detail}` : ''}`),
    '', 'Your full report is attached as a PDF.', ...(salaryNote ? [salaryNote] : []), `Book a free counselling call: ${sessionUrl}`,
  ].join('\n')

  return {
    to: opts.to,
    subject: `Your ${opts.meta.name}: ${s.headline.value} ${s.headline.label.replace(/^\/100 ready for /, '/100 ready for ')}`.slice(0, 120),
    preheader: `${s.headline.note} Plus your next ${s.actions.length} moves.`,
    heading: `Hi ${opts.name}, here is your ${opts.meta.name}`,
    paragraphs: [],
    bodyHtml,
    bodyText,
    attachments: [{ filename: `Learnbay-${opts.meta.name.replace(/\s+/g, '-')}.pdf`, content: pdf, contentType: 'application/pdf' }],
  }
}

export async function emailToolReport(opts: Opts) {
  await sendMail(buildReportEmail(await withCapstones(opts)))
}
