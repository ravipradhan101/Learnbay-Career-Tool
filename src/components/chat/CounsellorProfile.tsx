'use client'

import Link from 'next/link'
import { Icon } from '../Icon'
import { Avatar } from './Avatar'
import { COUNSELLOR_TITLE, getCounsellor } from '@/lib/counsellors'
import { trackOf } from '@/lib/questions'

/** Stars show once this many real learners have rated (one early rating never decides what everyone sees). */
const MIN_RATINGS_SHOWN = 10

/** The counsellor's profile, in a small box opened from their photo or name in the chat. */
export function CounsellorProfile({ id, interest, rating, booked, onCall, onClose }: {
  id: string
  interest?: string
  /** Real learner ratings (shown once enough learners have rated). */
  rating: { avg: number; count: number } | null
  booked: boolean
  onCall: () => void
  onClose: () => void
}) {
  const c = getCounsellor(id)
  const t = trackOf(interest)
  return (
    <div className="cp" role="dialog" aria-label={`${c.name}, ${COUNSELLOR_TITLE}`}>
      <button type="button" className="cp-x" aria-label="Close" onClick={onClose}><Icon name="x" size="1rem" /></button>
      <div className="cp-top">
        <Avatar who={c.id} size={60} online />
        <div>
          <b>{c.name}</b>
          <span className="cp-badge">{COUNSELLOR_TITLE}</span>
          {rating && rating.count >= MIN_RATINGS_SHOWN ? (
            <span className="sp-rating" aria-label={`Rated ${rating.avg.toFixed(1)} out of 5 by ${rating.count} learners`}>
              <span className="sp-stars" aria-hidden="true"><span style={{ width: `${(rating.avg / 5) * 100}%` }}>★★★★★</span>★★★★★</span>
              <b>{rating.avg.toFixed(2)}</b><small>({rating.count.toLocaleString('en-IN')} learner ratings)</small>
            </span>
          ) : (
            <span className="sp-rating sp-rating-new">
              ★ New counsellor{rating ? ` · ${rating.count} learner rating${rating.count === 1 ? '' : 's'} so far` : ''}
            </span>
          )}
        </div>
      </div>
      <ul className="cp-list">
        {t && <li><Icon name="route" size="0.9rem" /> Guides people into the {t.label} ({t.hint})</li>}
        <li><Icon name="chart" size="0.9rem" /> Builds your skill-gap, salary and roadmap reports with you</li>
        <li><Icon name="target" size="0.9rem" /> Matches you to the right Learnbay program</li>
        <li><Icon name="sparkles" size="0.9rem" /> Virtual (AI-guided) counsellor, online now; human Senior Counsellors take the calls</li>
      </ul>
      <div className="cp-actions">
        <button type="button" className="tc-btn tc-btn-accent tc-btn-sm" onClick={() => { onClose(); onCall() }}><Icon name="phone" size="0.9rem" /> Call me</button>
        <Link href="/dashboard/sessions" scroll={false} className="tc-btn tc-btn-ghost tc-btn-sm" onClick={onClose}>
          <Icon name="calendar" size="0.9rem" /> {booked ? 'See my booked call' : 'Book a call'}
        </Link>
      </div>
    </div>
  )
}
