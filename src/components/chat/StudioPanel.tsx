'use client'

import Link from 'next/link'
import { Icon } from '../Icon'
import { openWhyLearnbay } from '../why/WhyLearnbayButton'
import { Avatar } from './Avatar'
import { PartnerLogos } from '../PartnerLogos'
import { programFor } from '@/config/programs'
import { PUBLISHED_STORY, USPS } from '@/config/usps'
import { COUNSELLOR_TITLE, getCounsellor } from '@/lib/counsellors'
import { trackOf, type Answers } from '@/lib/questions'
import type { ToolState } from '@/lib/report-card'
import { TOOLS, type ToolId } from '@/lib/tools-meta'

/**
 * Right pane: who is guiding you, your saved reports (always here when you log in), the program your
 * counsellor recommends once they know you, and why Learnbay.
 */
export function StudioPanel({ counsellor, answers, tools, eligibilityDone, eligibilityVisible, onCall, onNavigate }: {
  counsellor: string
  answers: Answers
  tools: Record<ToolId, ToolState>
  eligibilityDone: boolean
  eligibilityVisible: boolean
  onCall: () => void
  onNavigate?: () => void
}) {
  const c = getCounsellor(counsellor)
  const t = trackOf(answers.interest)
  const program = programFor(answers.interest)
  const probed = Boolean(answers.difficulty)
  return (
    <div className="sp">
      <section className="sp-card sp-me">
        <Avatar who={c.id} size={44} online />
        <div className="sp-me-text">
          <b>{c.name}</b>
          <small>{COUNSELLOR_TITLE}{t ? ` · ${t.label}` : ''}</small>
          <small className="sp-online"><i /> Online · virtual counsellor</small>
        </div>
        <button type="button" className="sp-call" onClick={onCall} aria-label={`Get a call from ${c.name}`}><Icon name="phone" size="1rem" /></button>
      </section>

      <section className="sp-section">
        <h3>Your reports</h3>
        <ul className="sp-reports">
          {TOOLS.map((tool) => {
            const ready = tools[tool.id]?.status === 'ready'
            return (
              <li key={tool.id}>
                <Link href={ready ? `/dashboard/${tool.id}/report` : tool.route} scroll={false} onClick={onNavigate}>
                  <span className={`sp-r-icon ${ready ? 'ok' : ''}`}><Icon name={ready ? 'checkCircle' : tool.icon} size="0.95rem" /></span>
                  <span className="sp-r-text"><b>{tool.name}</b><small>{ready ? 'Saved · open anytime' : 'Not built yet'}</small></span>
                  <Icon name="chevronRight" size="0.9rem" className="sp-chev" />
                </Link>
              </li>
            )
          })}
          {eligibilityVisible && (
            <li>
              <Link href="/dashboard/eligibility" scroll={false} onClick={onNavigate}>
                <span className={`sp-r-icon ${eligibilityDone ? 'ok' : ''}`}><Icon name={eligibilityDone ? 'checkCircle' : 'award'} size="0.95rem" /></span>
                <span className="sp-r-text"><b>Eligibility test</b><small>{eligibilityDone ? 'Result saved' : '10 quick questions'}</small></span>
                <Icon name="chevronRight" size="0.9rem" className="sp-chev" />
              </Link>
            </li>
          )}
        </ul>
      </section>

      <section className="sp-section">
        <h3>Recommended for you</h3>
        {probed && program ? (
          <div className="sp-card sp-program">
            <b>{program.name}</b>
            <ul>{program.features.slice(0, 3).map((f) => <li key={f}><Icon name="check" size="0.8rem" />{f}</li>)}</ul>
            <div className="sp-actions">
              <Link href="/dashboard/sessions" scroll={false} className="tc-btn tc-btn-primary tc-btn-sm" onClick={onNavigate}>Talk to a mentor</Link>
              <a href={program.url} target="_blank" rel="noopener noreferrer" className="tc-btn tc-btn-ghost tc-btn-sm">Details <Icon name="external" size="0.75rem" /></a>
            </div>
          </div>
        ) : (
          <p className="sp-empty">{c.name} will recommend the right program after a few quick questions in the chat.</p>
        )}
      </section>

      <section className="sp-section">
        <h3>Why Learnbay</h3>
        <ul className="sp-usps">
          {(['projects', 'mentors', 'placement', 'domain'] as const).map((id) => (
            <li key={id}><span className="tc-soft-icon"><Icon name={USPS[id].icon} size="0.9rem" /></span><span><b>{USPS[id].title}</b><small>{USPS[id].short}</small></span></li>
          ))}
        </ul>
        <PartnerLogos size={16} className="sp-logos" />
        <figure className="sp-quote">
          <blockquote>“{PUBLISHED_STORY.quote}”</blockquote>
          <figcaption>{PUBLISHED_STORY.name} · {PUBLISHED_STORY.role}</figcaption>
        </figure>
        <button type="button" className="tc-link" onClick={() => { onNavigate?.(); openWhyLearnbay('right-pane') }}>How Learnbay is different <Icon name="arrowRight" size="0.8rem" /></button>
      </section>
    </div>
  )
}
