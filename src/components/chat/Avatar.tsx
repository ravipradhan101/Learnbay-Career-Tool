'use client'

import { useId, useState } from 'react'
import { BOT_NAME, GUIDE_PHOTO, getCounsellor, photoOf, type Look } from '@/lib/counsellors'

/**
 * Avatars: LB-AIbot (before sign-up) and the AI counsellors (after). Each counsellor shows a stock photo from
 * /public/counsellors when one is there, otherwise an illustration. The "AI Career Counsellor" badge always
 * sits next to the name, so no one mistakes the AI for a real member of staff.
 */
export function Avatar({ who, size = 44, online = false }: { who: string; size?: number; online?: boolean }) {
  const isBot = who === 'bot'
  const c = getCounsellor(who)
  const [noPhoto, setNoPhoto] = useState(false)
  const photo = isBot ? GUIDE_PHOTO : photoOf(c.id)
  return (
    <span className="tanya-avatar" style={{ width: size, height: size }}>
      {isBot && (noPhoto || !photo)
        ? <BotMark size={size} />
        : noPhoto || !photo
          ? <Person size={size} look={c.look} name={c.name} />
          : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={isBot ? `${BOT_NAME}, career guide` : `${c.name}, career counsellor`} width={size} height={size} className="tc-photo" loading="lazy" onError={() => setNoPhoto(true)} />
          )}
      {online && <i className="tanya-online" aria-hidden="true" />}
    </span>
  )
}

/** LB-AIbot: a Learnbay-gradient disc with a chat bubble and an AI spark. */
function BotMark({ size }: { size: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`${BOT_NAME}, Learnbay's AI assistant`}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.6" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
        <radialGradient id={`s${id}`} cx="0.8" cy="0.15" r="0.6">
          <stop offset="0" stopColor="#fdba74" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fdba74" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#b${id})`} />
      <circle cx="32" cy="32" r="32" fill={`url(#s${id})`} />
      <path d="M17 22.5c0-3.6 2.9-6.5 6.5-6.5h17c3.6 0 6.5 2.9 6.5 6.5v12c0 3.6-2.9 6.5-6.5 6.5H30l-7.5 6.5V41h1c-3.6 0-6.5-2.9-6.5-6.5z" fill="#fff" />
      <path d="M32 20.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9z" fill="#f97316" />
      <circle cx="40.5" cy="21.5" r="1.8" fill="#a78bfa" />
      <circle cx="23.5" cy="33.5" r="1.3" fill="#a78bfa" />
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
