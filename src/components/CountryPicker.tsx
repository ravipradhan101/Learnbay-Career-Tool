'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES, type Country } from '@/config/countries'

/**
 * The phone country code: a button with the flag and code that opens a searchable list of every country (type a name,
 * "+44" or "uk"). Works with the keyboard (arrows, Enter, Escape) and on touch screens. The value is the dial code.
 */
export function CountryPicker({ value, onChange, id }: { value: string; onChange: (code: string) => void; id?: string }) {
  // Several countries share a code (+1 US/Canada): remember which one was picked so its flag shows.
  const [iso, setIso] = useState(() => COUNTRIES.find((c) => c.code === value)?.iso ?? 'IN')
  const current = COUNTRIES.find((c) => c.iso === iso && c.code === value) ?? COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0]
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const search = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    const t = query.trim().toLowerCase()
    if (!t) return COUNTRIES
    const digits = t.replace(/\D/g, '')
    return COUNTRIES.filter((c) => c.label.toLowerCase().includes(t) || c.iso.toLowerCase() === t || (digits && c.code.slice(1).startsWith(digits)) || (t === 'uk' && c.iso === 'GB') || (t === 'usa' && c.iso === 'US') || (t === 'uae' && c.iso === 'AE'))
  }, [query])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', away)
    return () => window.removeEventListener('pointerdown', away)
  }, [open])
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active])

  const pick = (c: Country) => { setIso(c.iso); onChange(c.code); setOpen(false); setQuery('') }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) pick(matches[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  return (
    <div className="ccp" ref={wrap}>
      <button type="button" id={id} className="ccp-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`Country code: ${current.label} ${current.code}`} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">{current.flag}</span> {current.code} <span className="ccp-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ccp-pop" onKeyDown={onKey}>
          <input ref={search} className="ccp-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search country or code" aria-label="Search country or code" aria-controls="ccp-list" autoComplete="off" />
          <ul id="ccp-list" ref={list} className="ccp-list" role="listbox" aria-label="Countries">
            {matches.length === 0 && <li className="ccp-none">No country found</li>}
            {matches.map((c, i) => (
              <li key={c.iso} data-i={i} role="option" aria-selected={c.iso === current.iso} className={`ccp-opt${i === active ? ' active' : ''}${c.iso === current.iso ? ' on' : ''}`}
                onPointerDown={(e) => e.preventDefault()} onClick={() => pick(c)} onMouseEnter={() => setActive(i)}>
                <span aria-hidden="true">{c.flag}</span><span className="ccp-name">{c.label}</span><span className="ccp-code">{c.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
