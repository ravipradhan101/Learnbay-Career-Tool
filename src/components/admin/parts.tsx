import Link from 'next/link'
import { RANGES, type FunnelStep, type RangeKey } from '@/lib/admin-reports'

export const fmtInt = (v: number) => v.toLocaleString('en-IN')
export const fmtPct = (v: number | null) => (v === null || !Number.isFinite(v) ? 'None' : `${Math.round(v * 100)}%`)
export const fmtInr = (v: number) => (v < 1 ? `₹${v.toFixed(2)}` : `₹${v.toLocaleString('en-IN', { maximumFractionDigits: v < 100 ? 2 : 0 })}`)
export const fmtTokens = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 10_000 ? `${(v / 1000).toFixed(1)}k` : fmtInt(v))
export const fmtSecs = (v: number | null) => (v === null ? 'None' : v >= 60 ? `${Math.floor(v / 60)}m ${v % 60}s` : `${v}s`)
export const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'None'

export function PageHead({ title, sub, range, base }: { title: string; sub: string; range?: RangeKey; base?: string }) {
  return (
    <div className="row between" style={{ alignItems: 'flex-end' }}>
      <div>
        <h1 className="admin-h1">{title}</h1>
        <p className="muted small">{sub}</p>
      </div>
      {range && base && (
        <nav className="range-pills" aria-label="Date range">
          {RANGES.map((r) => <Link key={r.key} href={`${base}?range=${r.key}`} aria-current={r.key === range ? 'true' : undefined}>{r.label}</Link>)}
        </nav>
      )}
    </div>
  )
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="stat"><span className="small muted">{label}</span><b>{value}</b>{note && <small>{note}</small>}</div>
}

const OPTIONAL = 'Optional step'

/**
 * Horizontal funnel. Each row shows reach vs the first step and the drop from the previous required step.
 * Optional steps (AI chat, resume upload) show reach only, so they don't create false drop-offs.
 */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = steps[0]?.count || 0
  const prevOf = (i: number) => { for (let j = i - 1; j >= 0; j--) if (steps[j].note !== OPTIONAL) return steps[j].count; return 0 }
  const drops = steps.map((s, i) => (i === 0 || s.note === OPTIONAL ? 0 : Math.max(0, prevOf(i) - s.count)))
  const biggest = Math.max(...drops, 0)
  return (
    <div className="funnel">
      {steps.map((s, i) => {
        const prev = prevOf(i)
        const drop = drops[i]
        return (
          <div className="funnel-row" key={s.label}>
            <span>{s.label}{s.note && <span className="help-note" style={{ display: 'block' }}>{s.note}</span>}</span>
            <div className="funnel-bar" aria-hidden="true"><i style={{ width: `${top ? Math.min(100, (s.count / top) * 100) : 0}%` }} /></div>
            <span className="funnel-meta">
              <b>{fmtInt(s.count)}</b> <span className="muted small">{top ? fmtPct(s.count / top) : ''}</span>
              {prev > 0 && drop > 0 && <span className={`drop${drop === biggest ? ' big' : ''}`}>−{fmtInt(drop)} ({fmtPct(drop / prev)} dropped)</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="muted small">{children}</p>
}
