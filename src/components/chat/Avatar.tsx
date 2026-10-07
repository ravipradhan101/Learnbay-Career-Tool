'use client'

import { useId, useState } from 'react'
import { BOT_NAME, GUIDE_PHOTO, getCounsellor, photoOf, type Look } from '@/lib/counsellors'

/**
 * Avatars: Woody, the guide (before sign-up, and floating in the studio) and the AI counsellors (after). Each counsellor shows a stock photo from
 * /public/counsellors when one is there, otherwise an illustration. The "AI Career Counsellor" badge always
 * sits next to the name, so no one mistakes the AI for a real member of staff.
 */
export function Avatar({ who, size = 44, online = false, mood }: { who: string; size?: number; online?: boolean; mood?: WoodyMood }) {
  const isBot = who === 'bot'
  const c = getCounsellor(who)
  const [noPhoto, setNoPhoto] = useState(false)
  const photo = isBot ? GUIDE_PHOTO : photoOf(c.id)
  return (
    <span className="tanya-avatar" style={{ width: size, height: size }}>
      {isBot && (noPhoto || !photo)
        ? <LumiMascot size={size} mood={mood ?? (size <= 40 ? 'idle' : undefined)} />
        : noPhoto || !photo
          ? <Person size={size} look={c.look} name={c.name} />
          : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={isBot ? `${BOT_NAME}, your guide` : `${c.name}, career counsellor`} width={size} height={size} className="tc-photo" loading="lazy" onError={() => setNoPhoto(true)} />
          )}
      {online && <i className="tanya-online" aria-hidden="true" />}
    </span>
  )
}

/** Woody's moods: the pose, eyes and mouth change with what he's doing. */
export type WoodyMood = 'idle' | 'wave' | 'excited' | 'thinking' | 'playful' | 'present' | 'sleep' | 'ouch' | 'innocent'

/**
 * Woody, the guide: a little sapling kid, freshly sprouted, not a person. A bark head with a jagged crown and leafy
 * sprouts, big dark shiny eyes, a slim trunk body, twig arms and root feet. He has moods (see WoodyMood): waving
 * hello, excited with both arms up, thinking with a hand on his chin, playful, holding out a hand to show something,
 * dozing with his eyes shut, "ouch" after a fall, and an innocent close-up of just his face resting on his hands.
 * Everything moves a little (see chat.css; all off for people who prefer reduced motion).
 * Drawn to stay readable from 28px (chat avatars) to 120px (welcome screens).
 */
export function LumiMascot({ size, wave = true, mood }: { size: number; wave?: boolean; mood?: WoodyMood }) {
  const id = useId().replace(/:/g, '')
  const m: WoodyMood = mood ?? (wave ? 'wave' : 'idle')
  const twig = '#7a4f2c'
  const arm = (d: string, cls = '') => <path className={cls} d={d} stroke={twig} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  const fingers = (x: number, y: number, dir: 1 | -1, up = true) => (
    <path d={`M${x} ${y}l${dir * 1.6} ${up ? -2.2 : 2.2}M${x} ${y}l${dir * 2.4} ${up ? -0.6 : 0.6}M${x} ${y}l${dir * 0.2} ${up ? -2.6 : 2.6}`} stroke={twig} strokeWidth="1.2" fill="none" strokeLinecap="round" />
  )
  const head = (
    <g className="woody-head">
      {/* sprouts on the crown */}
      <g className="woody-sprouts">
        <path d="M24 10.5q-1.4-3.4.4-5.6" stroke="#4d7c0f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <ellipse cx="24.6" cy="4.8" rx="2.2" ry="1.3" transform="rotate(-30 24.6 4.8)" fill={`url(#leaf${id})`} />
        <path d="M40.5 10.5q1.2-4.2 4-5.4" stroke="#4d7c0f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M44.6 5.2q4.2-2.6 5.4 1.4q-3.6 2-5.4-1.4z" fill={`url(#leaf${id})`} />
        <path d="M33 7.5q.2-2.8 1.8-3.8" stroke="#4d7c0f" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="3.6" r="1.2" fill="#86efac" />
      </g>
      {/* bark head with a jagged crown */}
      <path d="M18.5 14.5L20.6 8.6L23.4 12.4L26.4 7.2L29.4 11.6L32.4 6.4L35.4 11.4L38.6 7.6L41.2 12.2L44.4 9L45.6 14.5Q46.6 24 45.4 30.4Q44 37.6 32 37.8Q20 37.6 18.6 30.4Q17.4 24 18.5 14.5Z" fill={`url(#bark${id})`} />
      <path d="M22.5 15q-.6 6 .4 12M27 13.5q-.4 4 .2 7M38 13q.6 4.4-.2 8M42 15.5q.6 6-.4 11M30.5 32.6q1.5.6 3 0" stroke="#7a4f2c" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.45" />
      <path d="M21 16q5-2.4 9-1.6" stroke="#ffffff" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.25" />
    </g>
  )
  const eyes = m === 'sleep'
    ? <path d="M23.2 25q3 2.6 6 0M35 25q3 2.6 6 0" stroke="#1c1410" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    : m === 'ouch'
      ? <path d="M23.4 22.6l5 2.6-5 2.6M40.8 22.6l-5 2.6 5 2.6" stroke="#1c1410" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      : m === 'playful'
        ? <path d="M22.8 26.2q3.4-4.2 6.8 0M34.4 26.2q3.4-4.2 6.8 0" stroke="#1c1410" strokeWidth="2" fill="none" strokeLinecap="round" />
        : (
          <g className="woody-eyes">
            <g className="woody-eye">
              <ellipse cx="26.2" cy="24.6" rx="3.7" ry="4.3" fill="#1c1410" />
              <circle cx={m === 'thinking' ? 27.6 : 27.4} cy={m === 'thinking' ? 22.4 : 23} r="1.35" fill="#ffffff" />
              <circle cx="25.1" cy="26.4" r="0.55" fill="#ffffff" opacity="0.8" />
            </g>
            <g className="woody-eye">
              <ellipse cx="37.8" cy="24.6" rx="3.7" ry="4.3" fill="#1c1410" />
              <circle cx={m === 'thinking' ? 39.2 : 39} cy={m === 'thinking' ? 22.4 : 23} r="1.35" fill="#ffffff" />
              <circle cx="36.7" cy="26.4" r="0.55" fill="#ffffff" opacity="0.8" />
            </g>
          </g>
        )
  const mouth = m === 'excited' || m === 'ouch'
    ? <ellipse cx="32" cy="32.4" rx="2" ry="2.3" fill="#3b1d10" />
    : m === 'playful'
      ? <path d="M27.6 31.2Q32 36.6 36.4 31.2Z" fill="#3b1d10" />
      : m === 'sleep'
        ? <path d="M30.4 32.4q1.6.8 3.2 0" stroke="#3b1d10" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        : m === 'thinking'
          ? <path d="M30.6 32.6q2.4-.8 4 .2" stroke="#3b1d10" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          : <path d="M28.8 31.6q3.2 2.8 6.4 0" stroke="#3b1d10" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  const cheeks = <><ellipse cx="21.6" cy="29.6" rx="2.2" ry="1.3" fill="#f9a8b8" opacity="0.7" /><ellipse cx="42.4" cy="29.6" rx="2.2" ry="1.3" fill="#f9a8b8" opacity="0.7" /></>

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`${BOT_NAME}, Learnbay's virtual guide`} className={`lumi-mascot woody woody-${m}`}>
      <defs>
        <radialGradient id={`bg${id}`} cx="0.5" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#f0fdf4" />
          <stop offset="1" stopColor="#e3e9fb" />
        </radialGradient>
        <linearGradient id={`bark${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#d6a874" />
          <stop offset="0.55" stopColor="#b9834f" />
          <stop offset="1" stopColor="#94623a" />
        </linearGradient>
        <linearGradient id={`leaf${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
        <clipPath id={`clip${id}`}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#clip${id})`}>
        <rect width="64" height="64" fill={`url(#bg${id})`} />
        {m === 'innocent' ? (
          // Just his face resting on his hands, close up.
          <g className="woody-bot" transform="translate(32 34) scale(1.38) translate(-32 -24)">
            {head}
            {eyes}{cheeks}{mouth}
            <path d="M18.6 46q1.6-6.4 6.6-8.6M45.4 46q-1.6-6.4-6.6-8.6" stroke={twig} strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d="M25.2 37.4l.4-2.6M25.2 37.4l1.8-1.8M25.2 37.4l2.4-.6M38.8 37.4l-.4-2.6M38.8 37.4l-1.8-1.8M38.8 37.4l-2.4-.6" stroke={twig} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          <g className="woody-bot">
            <ellipse cx="32" cy="60" rx="10" ry="1.8" fill="#94a3b8" opacity="0.3" />
            {/* legs and root feet */}
            <path d="M29 50.5v5.2M35 50.5v5.2" stroke="#8a5a34" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M25.6 57.4q3.2-2.4 6 .2M32.4 57.6q2.8-2.6 6-.2" stroke="#6f4423" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {/* slim trunk body */}
            <path d="M27.4 37q-1.2 7.4 1.2 14h6.8q2.4-6.6 1.2-14z" fill={`url(#bark${id})`} />
            <path d="M30 39.5q-.6 5 .4 9.6M33.6 39.5q.6 5-.4 9.6" stroke="#7a4f2c" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.5" />
            {head}
            {eyes}{cheeks}{mouth}
            {/* arms, by mood (drawn over the head so a hand on the chin or raised arms show) */}
            {m === 'idle' && <>{arm('M28.4 40.5Q24.6 44.4 23.4 49')}{arm('M35.6 40.5Q39.4 44.4 40.6 49')}</>}
            {m === 'sleep' && <>{arm('M28.4 40.5Q25.6 45 26.6 49.4')}{arm('M35.6 40.5Q38.4 45 37.4 49.4')}</>}
            {m === 'wave' && <>{arm('M28.4 40.5Q24.6 44.4 23.4 49')}<g className="woody-wave">{arm('M35.6 40.5Q41.4 37.6 43.4 31.4')}{fingers(43.4, 31.4, 1)}</g></>}
            {(m === 'excited' || m === 'ouch') && <g className="woody-arms-up">{arm('M28.4 40.5Q20.6 39 15.4 31.2')}{fingers(15.4, 31.2, -1)}{arm('M35.6 40.5Q43.4 39 48.6 31.2')}{fingers(48.6, 31.2, 1)}</g>}
            {m === 'thinking' && <>{arm('M28.4 40.5Q25 44.4 26.8 47.6')}{arm('M35.6 40.5Q42.6 41.2 38.2 35.6')}{fingers(38.2, 35.6, -1)}</>}
            {m === 'playful' && <g className="woody-arms-out">{arm('M28.4 40.5Q22.4 40.2 17.8 36.2')}{fingers(17.8, 36.2, -1)}{arm('M35.6 40.5Q41.6 40.2 46.2 36.2')}{fingers(46.2, 36.2, 1)}</g>}
            {m === 'present' && <>{arm('M28.4 40.5Q24.6 44.4 23.4 49')}<g className="woody-present">{arm('M35.6 40.5Q43.4 42.4 49.4 40')}{fingers(49.4, 40, 1)}<path className="woody-glint" d="M52.6 34.6l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="#fbbf24" /></g></>}
            {m === 'sleep' && <g className="woody-zzz" fill="#6366f1" fontFamily="system-ui, sans-serif" fontWeight="700"><text x="45" y="16" fontSize="6">z</text><text x="49.5" y="10.5" fontSize="4.6">z</text></g>}
            {m === 'ouch' && <g className="woody-stars" fill="#fbbf24"><path d="M14 13l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" /><path d="M50 15l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7z" /></g>}
          </g>
        )}
      </g>
    </svg>
  )
}

function Person({ size, look, name }: { size: number; look: Look; name: string }) {
  const id = useId().replace(/:/g, '')
  const { skin, hair, top, style, beard } = look
  const shade = 'rgba(0,0,0,0.12)'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`${name}, AI career counsellor`}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e0e7ff" /><stop offset="1" stopColor="#f3e8ff" /></linearGradient>
        <clipPath id={`c${id}`}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="64" height="64" fill={`url(#g${id})`} />
        {/* hair behind the head */}
        {style === 'long' && <path d="M14 30c0-12 8-20 18-20s18 8 18 20v18H14z" fill={hair} />}
        {style === 'wavy' && <path d="M13 32c-1-13 8-22 19-22s20 9 19 22c2 6-1 12-3 16H16c-2-4-5-10-3-16z" fill={hair} />}
        {style === 'curly' && <g fill={hair}><circle cx="18" cy="26" r="8" /><circle cx="46" cy="26" r="8" /><circle cx="16" cy="37" r="7" /><circle cx="48" cy="37" r="7" /><circle cx="32" cy="17" r="11" /></g>}
        {style === 'bun' && <circle cx="32" cy="10.5" r="6.5" fill={hair} />}
        <path d="M8 64c2-11 11-17 24-17s22 6 24 17z" fill={top} />
        <path d="M27 41h10v8c-2 2-8 2-10 0z" fill={skin} />
        <path d="M27 44h10v3c-3 1.5-7 1.5-10 0z" fill={shade} />
        <ellipse cx="32" cy="31" rx="11" ry="13" fill={skin} />
        {beard && <path d="M21.5 33c1 8 5 12 10.5 12s9.5-4 10.5-12c-2 3-5 4-10.5 4s-8.5-1-10.5-4z" fill={hair} opacity="0.85" />}
        {/* hair on top */}
        {(style === 'long' || style === 'wavy') && <path d="M20 30c1-9 6-14 13-14 6 0 11 4 12 11-5-1-10-4-13-8-2 5-7 9-12 11z" fill={hair} />}
        {style === 'curly' && <path d="M20.5 28c0-8 5-13 11.5-13S43.5 20 43.5 28c-3-4-7-6-11.5-6s-8.5 2-11.5 6z" fill={hair} />}
        {style === 'bun' && <path d="M20.5 29c0-8 5-13 11.5-13s11.5 5 11.5 13c-2-4-6-7-11.5-7s-9.5 3-11.5 7z" fill={hair} />}
        {style === 'short' && <path d="M20.5 28c-.5-8 4.5-13.5 11.5-13.5S44 20 43.5 28c-1.5-3.5-4-5.5-7-6-3 2-9 2.5-13 .5-1.5 1.5-2.5 3.5-3 5.5z" fill={hair} />}
        <circle cx="27.5" cy="32" r="1.3" fill="#2b1d1a" />
        <circle cx="36.5" cy="32" r="1.3" fill="#2b1d1a" />
        <path d="M28.5 37.5c2 1.6 5 1.6 7 0" stroke="#8a3b2e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {!beard && <><circle cx="24.5" cy="36" r="2" fill="#f0a08a" opacity="0.4" /><circle cx="39.5" cy="36" r="2" fill="#f0a08a" opacity="0.4" /></>}
      </g>
    </svg>
  )
}
