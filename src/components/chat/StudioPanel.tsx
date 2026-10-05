'use client'

import Link from 'next/link'
import { Icon, type IconName } from '../Icon'
import { openWhyLearnbay } from '../why/WhyLearnbayButton'
import { programForLearner } from '@/lib/segments'
import { USPS } from '@/config/usps'
import { getCounsellor } from '@/lib/counsellors'
import { trackOf, type Answers } from '@/lib/questions'
import type { ToolState } from '@/lib/report-card'
import { TOOLS, type ToolId } from '@/lib/tools-meta'

type Step = { id: string; label: string; icon: IconName; href: string; done: boolean; note: string }
const WHY = { projects: 'Real projects', mentors: 'Live mentors', placement: 'Placement support', domain: 'Domain focus' } as const

/**
 * Right pane, readable at a glance and without scrolling: the program recommended for you first, then your progress
 * (a ring, your readiness score and five step tiles) and why Learnbay in four icons. The counsellor's own profile
 * opens from their photo in the chat.
 */
export function StudioPanel({ counsellor, answers, tools, eligibilityDone, eligibilityVisible, sessionsDone, onNavigate }: {
  counsellor: string
  answers: Answers
  tools: Record<ToolId, ToolState>
  eligibilityDone: boolean
  eligibilityVisible: boolean
  sessionsDone: boolean
  onNavigate?: () => void
}) {
  const c = getCounsellor(counsellor)
  const t = trackOf(answers.interest)
  const program = programForLearner(answers)
  const probed = Boolean(answers.difficulty)
  const readiness = tools['skill-gap']?.card?.gauge
  const short: Record<ToolId, string> = { 'skill-gap': 'Skill gaps', salary: 'Salary', roadmap: 'Roadmap' }
  const steps: Step[] = [
    ...TOOLS.map((tool) => {
      const ready = tools[tool.id]?.status === 'ready'
      return {
        id: tool.id, label: short[tool.id], icon: tool.icon, href: ready ? `/dashboard/${tool.id}/report` : tool.route, done: ready,
        note: ready ? (tool.id === 'skill-gap' && readiness !== undefined ? `${readiness}/100` : 'Open') : '1 min',
      }
    }),
    ...(eligibilityVisible ? [{ id: 'eligibility', label: 'Eligibility', icon: 'award' as IconName, href: '/dashboard/eligibility', done: eligibilityDone, note: eligibilityDone ? 'Saved' : '2 min' }] : []),
    { id: 'sessions', label: sessionsDone ? 'Call booked' : 'Counselling call', icon: 'calendar', href: '/dashboard/sessions', done: sessionsDone, note: sessionsDone ? 'See details' : 'Free' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="sp sp2">
      <section className="sp2-card sp2-program" aria-label="Recommended for you">
        <span className="sp2-eyebrow"><Icon name="sparkles" size="0.8rem" /> Recommended for you</span>
        {probed && program ? (
          <>
            <b className="sp2-program-name">{program.name}</b>
            <div className="sp2-program-actions">
              <Link href="/dashboard/sessions" scroll={false} className="tc-btn tc-btn-primary tc-btn-sm" onClick={onNavigate}><Icon name="calendar" size="0.9rem" /> {sessionsDone ? 'See my booked call' : 'Talk to a counsellor'}</Link>
              <a href={program.url} target="_blank" rel="noopener noreferrer" className="sp2-link">Details <Icon name="external" size="0.75rem" /></a>
            </div>
          </>
        ) : (
          <>
            {t && <b className="sp2-program-name">{t.label} <small>({t.hint})</small></b>}
            <p className="sp2-empty">{c.name} will confirm the exact program for you after a few quick questions in the chat.</p>
          </>
        )}
      </section>

      <section className="sp2-card sp2-progress" aria-label="Your progress">
        <div className="sp2-progress-top">
          <span className="sp2-ring" style={{ ['--p' as string]: `${pct}%` }} aria-label={`${doneCount} of ${steps.length} steps done`}>
            <b>{doneCount}<small>/{steps.length}</small></b>
          </span>
          <div className="sp2-progress-text">
            <b>Your progress</b>
            {readiness !== undefined
              ? <small>Readiness score <span className="sp2-score">{readiness}/100</span></small>
              : <small>{next ? `Next: ${next.label.toLowerCase()}` : 'All steps done'}</small>}
          </div>
        </div>
        <ul className="sp2-steps">
          {steps.map((s) => (
            <li key={s.id}>
              <Link href={s.href} scroll={false} onClick={onNavigate} className={`sp2-step${s.done ? ' done' : ''}${s.id === next?.id ? ' next' : ''}`} title={s.done ? `${s.label}: done` : `${s.label}: start`}>
                <span className="sp2-step-icon"><Icon name={s.done ? 'check' : s.icon} size="1rem" /></span>
                <b>{s.label}</b>
                <small>{s.note}</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sp2-why" aria-label="Why Learnbay">
        <div className="sp2-why-grid">
          {(Object.keys(WHY) as (keyof typeof WHY)[]).map((id) => (
            <span key={id} className="sp2-why-item" title={`${USPS[id].title}: ${USPS[id].short}`}><Icon name={USPS[id].icon} size="1rem" />{WHY[id]}</span>
          ))}
        </div>
        <button type="button" className="sp2-link" onClick={() => { onNavigate?.(); openWhyLearnbay('right-pane') }}>How Learnbay is different <Icon name="arrowRight" size="0.8rem" /></button>
      </section>
    </div>
  )
}
