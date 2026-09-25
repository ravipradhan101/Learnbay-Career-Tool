import { getProgram } from '@/config/programs'
import { PUBLISHED_STORY, USPS, type UspId } from '@/config/usps'
import { getResources } from '@/config/resources'
import { env } from './env'
import { sendMail, type MailSection } from './mailer'
import { buildPdf, type PdfBlock } from './pdf'
import { currentCtcRange } from './tools'
import type { Answers } from './questions'
import type { ToolMeta } from './tools-meta'
import type { RoadmapResult, SalaryResult, SkillGapResult, ToolResultMap } from './tool-types'

const lpa = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(1)} LPA`

/** The strengths most relevant to each report, so the Learnbay section reads as advice rather than an advert. */
const USPS_FOR: Record<ToolMeta['id'], UspId[]> = {
  'skill-gap': ['customisation', 'projects', 'domain', 'mentors'],
  salary: ['placement', 'domain', 'projects', 'certification'],
  roadmap: ['mentors', 'hybrid', 'projects', 'placement'],
}

/** Closing sections: the recommended program, how Learnbay helps, and a free mentorship call. */
function learnbaySections(tool: ToolMeta['id'], fit: { programId: string; whyProgram: string[] }): MailSection[] {
  const p = getProgram(fit.programId)
  return [
    { title: `Recommended for you: ${p.name}`, items: [...fit.whyProgram, `What you get: ${p.features.join(' · ')}`, `Program details: ${p.url}`] },
    { title: 'How Learnbay helps you act on this report', items: USPS_FOR[tool].map((id) => `${USPS[id].title}: ${USPS[id].short}`) },
    {
      title: 'Your next step: a free 1:1 mentorship call',
      items: [
        `Talk this report through with a Learnbay mentor: which role, which track, and how to fit it around your job. Book a time: ${env.appUrl}/dashboard/sessions`,
        `Check whether you are ready for a program with the short eligibility test (about 4 minutes): ${env.appUrl}/dashboard/eligibility`,
      ],
    },
    { title: 'From a Learnbay learner', items: [`"${PUBLISHED_STORY.quote}" (${PUBLISHED_STORY.name}, ${PUBLISHED_STORY.role}, as published on ${PUBLISHED_STORY.source})`] },
  ]
}

function sections(tool: ToolMeta['id'], data: ToolResultMap[ToolMeta['id']], answers: Answers): { intro: string; sections: MailSection[] } {
  if (tool === 'skill-gap') {
    const r = data as SkillGapResult
    return {
      intro: `Readiness for ${r.targetRole}: ${r.readiness.score}/100 (${r.readiness.band}). ${r.summary}`,
      sections: [
        { title: 'Current strengths', items: r.strengths },
        { title: 'Priority skill gaps', items: r.topGaps },
        { title: 'Skill by skill', items: r.skills.map((s) => `${s.name}: ${s.currentLabel} (you ${s.currentLevel}/100 · needed ${s.requiredLevel}/100)`) },
        { title: 'Your focused next step', items: r.nextStep ? [r.nextStep] : [] },
        { title: 'How to close your top gaps', items: (r.gapDetails ?? []).map((g) => `${g.skill} (~${g.weeks} weeks): ${g.whyItMatters} How: ${g.howToClose}`) },
        { title: 'What employers look for', items: r.marketDemand?.summary ? [r.marketDemand.summary, ...r.marketDemand.signals] : [] },
        { title: 'Topics interviewers test', items: r.interviewTopics?.length ? [r.interviewTopics.join(', ')] : [] },
        { title: 'Projects that prove the skills', items: (r.proofProjects ?? []).map((p) => `${p.title}: ${p.proves}`) },
        { title: 'Your first 30 days', items: (r.thirtyDayPlan ?? []).map((w) => `${w.week}: ${w.focus}`) },
        { title: 'Watch out for', items: r.watchOuts ?? [] },
        ...learnbaySections('skill-gap', r),
      ],
    }
  }
  if (tool === 'salary') {
    const r = data as SalaryResult
    const cur = currentCtcRange(answers)
    return {
      intro: `Potential growth (indicative): +${r.growth.minPercent}–${r.growth.maxPercent}%. ${r.summary}`,
      sections: [
        {
          title: 'Market benchmark',
          items: [
            ...(cur ? [`Your current CTC: ${cur.maxLpa ? `${lpa(cur.minLpa)} – ${lpa(cur.maxLpa)}` : `above ${lpa(cur.minLpa)}`}`] : []),
            `Market for your current role: ${lpa(r.currentRoleMarket.minLpa)} – ${lpa(r.currentRoleMarket.maxLpa)}`,
            ...r.targetRoles.map((t) => `${t.role}: ${lpa(t.minLpa)} – ${lpa(t.maxLpa)}`),
          ],
        },
        { title: 'What moves your salary up', items: r.drivers },
        { title: `${r.targetRole}: pay by type of employer`, items: (r.companyTypes ?? []).map((c) => `${c.type}: ${lpa(c.minLpa)} – ${lpa(c.maxLpa)} (${c.note})`) },
        { title: 'By city', items: (r.cityComparison ?? []).map((c) => `${c.city}: ${lpa(c.minLpa)} – ${lpa(c.maxLpa)}`) },
        { title: 'How pay grows in this role', items: (r.careerLadder ?? []).map((l) => `${l.stage} (${l.years}): ${lpa(l.minLpa)} – ${lpa(l.maxLpa)}`) },
        { title: 'Skills that add the most', items: (r.skillPremiums ?? []).map((k) => `${k.skill} (${k.impact} impact): ${k.note}`) },
        { title: 'Negotiating your offer', items: r.negotiationTips ?? [] },
        ...learnbaySections('salary', r),
        { title: 'Note', items: [r.note || 'These are indicative market ranges, not offers or guarantees.'] },
      ],
    }
  }
  const r = data as RoadmapResult
  return {
    intro: `A ${r.durationMonths}-month plan to ${r.targetRole} at ${r.weeklyHours}. ${r.summary}`,
    sections: [
      { title: 'Your roadmap', items: r.phases.map((p, i) => `Phase ${i + 1} · ${p.title.replace(/^phase\s*\d+\s*[:\-–—.]\s*/i, '')} (${p.weeks}): ${p.focus.replace(/\.+$/, '')}. Milestone: ${p.milestone}${p.deliverables?.length ? ` You will have: ${p.deliverables.join('; ')}.` : ''}${p.practice ? ` Practice: ${p.practice}` : ''}`) },
      { title: 'Monthly checkpoints', items: (r.monthlyCheckpoints ?? []).map((m) => `Month ${m.month}: ${m.goal}`) },
      { title: 'Portfolio projects', items: r.projects.map((p) => `${p.title} (${p.difficulty}) — ${p.description}`) },
      { title: 'This week', items: r.nextSteps },
      { title: 'Where plans stall, and what to do', items: (r.risks ?? []).map((k) => `${k.risk}: ${k.mitigation}`) },
      { title: 'Making your portfolio stand out', items: r.portfolioTips ?? [] },
      { title: 'Getting interview-ready', items: r.interviewPrep ?? [] },
      { title: 'Free resources', items: getResources(r.resourceIds).map((res) => `${res.title} (${res.provider}): ${res.url}`) },
      ...learnbaySections('roadmap', r),
    ],
  }
}

/** The same report as a branded, printable PDF. */
export function toolReportPdf(opts: { name: string; meta: ToolMeta; data: ToolResultMap[ToolMeta['id']]; answers: Answers }): Buffer {
  const { intro, sections: list } = sections(opts.meta.id, opts.data, opts.answers)
  const blocks: PdfBlock[] = [{ type: 'p', text: intro }]
  for (const sec of list) {
    if (!sec.items.length) continue
    blocks.push({ type: 'h', text: sec.title })
    for (const item of sec.items) blocks.push({ type: 'bullet', text: item })
  }
  blocks.push({ type: 'gap' }, { type: 'small', text: 'AI-generated guidance by Learnbay Career Studio. Salary figures are indicative market ranges, not offers or guarantees.' })
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  return buildPdf({ title: opts.meta.name, subtitle: `Prepared for ${opts.name}  ·  ${date}`, blocks, footer: 'Learnbay Career Studio' })
}

export async function emailToolReport(opts: { to: string; name: string; meta: ToolMeta; data: ToolResultMap[ToolMeta['id']]; answers: Answers }) {
  const { intro, sections: list } = sections(opts.meta.id, opts.data, opts.answers)
  const pdf = toolReportPdf(opts)
  await sendMail({
    to: opts.to,
    subject: `Your ${opts.meta.name} — Learnbay Career Studio`,
    heading: `Hi ${opts.name}, here is your ${opts.meta.name}`,
    paragraphs: [intro, 'Your full report is attached as a PDF. A summary is below.'],
    sections: list,
    cta: { label: `Open my ${opts.meta.name}`, url: `${env.appUrl}${opts.meta.route}` },
    attachments: [{ filename: `Learnbay-${opts.meta.name.replace(/\s+/g, '-')}.pdf`, content: pdf, contentType: 'application/pdf' }],
  })
}
