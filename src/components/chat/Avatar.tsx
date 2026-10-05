'use client'

import { useId, useState } from 'react'
import { BOT_NAME, GUIDE_PHOTO, getCounsellor, photoOf, type Look } from '@/lib/counsellors'

/**
 * Avatars: Lumi, the guide (before sign-up, and floating in the studio) and the AI counsellors (after). Each counsellor shows a stock photo from
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

/** Lumi, the guide: a smiling young Indian woman on a bright sunrise-gradient disc, with a small spark (her name means light). */
function BotMark({ size }: { size: number }) {
  const id = useId().replace(/:/g, '')
  const skin = '#c68a63'
  const hair = '#1b1210'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`${BOT_NAME}, Learnbay's virtual career guide`}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="0.5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <clipPath id={`c${id}`}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="64" height="64" fill={`url(#b${id})`} />
        {/* long hair behind the shoulders */}
        <path d="M13 33c0-13 8.5-22 19-22s19 9 19 22v20c0 3-2 5-5 5H18c-3 0-5-2-5-5z" fill={hair} />
        {/* kurta with a gold neckline */}
        <path d="M9 64c1.5-10 10-15.5 23-15.5S53.5 54 55 64z" fill="#0d9488" />
        <path d="M26 49.3c1.6 3.6 3.7 5.2 6 5.2s4.4-1.6 6-5.2" stroke="#fbbf24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M27.5 41h9v8.3c-2.5 2.1-6.5 2.1-9 0z" fill={skin} />
        <path d="M27.5 44h9v3c-3 1.5-6 1.5-9 0z" fill="rgba(0,0,0,0.12)" />
        {/* ears and jhumka earrings */}
        <circle cx="20.6" cy="32" r="2.3" fill={skin} />
        <circle cx="43.4" cy="32" r="2.3" fill={skin} />
        <circle cx="20.4" cy="35.4" r="1.1" fill="#fbbf24" /><path d="M18.6 37.2h3.6l-1.8 2.6z" fill="#fbbf24" />
        <circle cx="43.6" cy="35.4" r="1.1" fill="#fbbf24" /><path d="M41.8 37.2h3.6l-1.8 2.6z" fill="#fbbf24" />
        <ellipse cx="32" cy="31" rx="11.4" ry="13" fill={skin} />
        {/* side-parted hair framing the face */}
        <path d="M20.4 30.5c-.8-9.5 4.8-16.2 12-16.2 7.6 0 12.3 5.8 11.6 14.6-4-1.2-7.6-3.8-9.8-7.4-2.8 4.4-8 7.6-13.8 9z" fill={hair} />
        <path d="M20.2 27.5c-2.3 5.3-2.2 11.6.4 16.6l2.2-1.1c-1.8-5-1.7-10.4.3-14.8z" fill={hair} />
        <path d="M43.8 27.5c2 5 2 10.8-.2 15.6l-2-1c1.5-4.6 1.4-9.6-.1-13.8z" fill={hair} />
        {/* eyebrows, smiling eyes, bindi */}
        <path d="M25 26.6c1.3-1 3.2-1.2 4.6-.5M34.4 26.1c1.4-.7 3.3-.5 4.6.5" stroke={hair} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M25.6 31.2c1-1.4 2.9-1.4 3.9 0M34.5 31.2c1-1.4 2.9-1.4 3.9 0" stroke="#2b1d1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="27.4" r="0.9" fill="#e11d48" />
        <path d="M31.3 34.6c.4.3 1 .3 1.4 0" stroke="rgba(0,0,0,0.25)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        {/* big open smile */}
        <path d="M27 37.2c1.3 3.8 8.7 3.8 10 0z" fill="#7f1d1d" />
        <path d="M27.8 37.5c1.6.6 6.8.6 8.4 0l-.3 1c-2.2.5-5.6.5-7.8 0z" fill="#fff" />
        <circle cx="24.6" cy="35.4" r="2.2" fill="#fb7185" opacity="0.4" />
        <circle cx="39.4" cy="35.4" r="2.2" fill="#fb7185" opacity="0.4" />
        {/* her spark */}
        <path d="M51 9.5l1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3z" fill="#fde047" />
        <circle cx="12.5" cy="15" r="1.3" fill="#fef3c7" opacity="0.9" />
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
