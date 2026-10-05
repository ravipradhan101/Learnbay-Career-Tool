'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '../Icon'
import { Avatar } from './Avatar'
import { BOT_NAME } from '@/lib/counsellors'

/**
 * One stop on Lumi's tour. `targets` are `data-tour` names, tried in order: the first one visible on screen is
 * highlighted (e.g. the left menu on a laptop, the ☰ button on a phone). With none visible, the step shows centred.
 */
export type TourStep = { targets: string[]; title: string; text: string; icon?: IconName }

type Box = { top: number; left: number; width: number; height: number }
const PAD = 6
const CARD_W = 330

/** When the feature itself is tucked away (phones), the note says how to reach it. */
const VIA: Record<string, string> = { menu: 'On your phone, it’s in the ☰ menu.', 'plan-btn': 'On your phone, tap this button to open it.' }

function visibleBox(names: string[]): { el: HTMLElement; box: Box; name: string } | null {
  for (const name of names) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`)
    if (!el) continue
    const r = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    if (r.width < 4 || r.height < 4 || style.visibility === 'hidden' || style.display === 'none') continue
    return { el, name, box: { top: r.top, left: r.left, width: r.width, height: r.height } }
  }
  return null
}

/** Lumi's guided tour of the studio: a spotlight on each feature with a short note, Back / Next, and Skip at any time. */
export function LumiTour({ steps, onEnd }: { steps: TourStep[]; onEnd: (finished: boolean) => void }) {
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [via, setVia] = useState<string | null>(null)
  const [view, setView] = useState({ w: 0, h: 0 })
  const nextRef = useRef<HTMLButtonElement>(null)
  const step = steps[i]
  const last = i === steps.length - 1

  const measure = useCallback(() => {
    setView({ w: window.innerWidth, h: window.innerHeight })
    const found = visibleBox(step.targets)
    setBox(found ? found.box : null)
    setVia(found ? VIA[found.name] ?? null : null)
  }, [step])

  useLayoutEffect(() => {
    const found = visibleBox(step.targets)
    found?.el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    measure()
    const t = window.setTimeout(measure, 250)
    return () => window.clearTimeout(t)
  }, [step, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [measure])

  useEffect(() => { nextRef.current?.focus() }, [i])

  const next = useCallback(() => (last ? onEnd(true) : setI((n) => n + 1)), [last, onEnd])
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEnd(false)
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, back, onEnd])

  // Where the note goes: under the feature, or above it, or beside it; centred when the feature is huge or hidden.
  const w = Math.min(CARD_W, view.w - 24)
  let pos: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  if (box && view.w) {
    const below = view.h - (box.top + box.height)
    const centreX = Math.min(Math.max(box.left + box.width / 2 - w / 2, 12), view.w - w - 12)
    if (below > 230) pos = { left: centreX, top: box.top + box.height + PAD + 12 }
    else if (box.top > 250) pos = { left: centreX, bottom: view.h - box.top + PAD + 12 }
    else if (view.w - (box.left + box.width) > w + 36) pos = { left: box.left + box.width + PAD + 14, top: Math.min(Math.max(box.top, 12), view.h - 260) }
    else if (box.left > w + 36) pos = { left: box.left - w - PAD - 14, top: Math.min(Math.max(box.top, 12), view.h - 260) }
  }

  return (
    <div className="lt" role="dialog" aria-modal="true" aria-label={`${BOT_NAME}'s tour: ${step.title}`}>
      <div className="lt-block" onClick={(e) => e.stopPropagation()} />
      {box
        ? <div className="lt-spot" style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }} aria-hidden="true" />
        : <div className="lt-dim" aria-hidden="true" />}
      <div className="lt-card" style={{ ...pos, width: w }}>
        <div className="lt-head">
          <Avatar who="bot" size={38} />
          <span className="lt-step">{i + 1} of {steps.length}</span>
          <button type="button" className="lt-skip" onClick={() => onEnd(false)}>Skip tour</button>
        </div>
        <h3 className="lt-title">{step.icon && <Icon name={step.icon} size="1rem" />}{step.title}</h3>
        <p className="lt-text">{step.text}{via && <><br /><b className="lt-via">{via}</b></>}</p>
        <div className="lt-progress" aria-hidden="true">{steps.map((_, n) => <i key={n} className={n <= i ? 'on' : ''} />)}</div>
        <div className="lt-actions">
          {i > 0 && <button type="button" className="rg-act" onClick={back}><Icon name="arrowLeft" size="0.9rem" /> Back</button>}
          <button type="button" ref={nextRef} className="rg-act primary" onClick={next}>{last ? 'Start exploring' : 'Next'} <Icon name={last ? 'check' : 'arrowRight'} size="0.9rem" /></button>
        </div>
      </div>
    </div>
  )
}
