import { query, queryOne, transaction } from '../db'
import { pathKindLabel } from '../lead-match'
import {
  CITIES, COUNTRY_CODES, CTC_BANDS, EDU_LEVELS, PROGRAMMER, SKILLS, TIMELINES, WEEKLY_HOURS,
  domainLabel, experienceLabel, goalLabel, interestLabel, isValidPhone, labelOf, roleLabel, targetRoleLabel, type Answers,
} from '../questions'
import { cleanText, normalizeEmail } from '../security'
import type { ApiKey } from './api-keys'
import { allocateNewLead, logActivity } from './allocate'
import { recordCrmMatch } from './connector'
import { leadInsights } from './insights'
import { isLeadStatus, statusLabel } from './roles'
import { emitLeadEvent } from './webhooks'
import { emailProblem } from '../email-check'

/**
 * The data behind /api/v1: find, read, list and add leads for tools outside this app. The golden rule matches the
 * webhooks: a person who already exists (same email, or same phone) is never overwritten. Only empty fields are
 * filled, and anything else sent is kept as a note.
 */

const digits = (v: string) => v.replace(/\D/g, '')

/** "+91 98765 43210" or ("+91", "9876543210") → { country, phone }, or null when it isn't a valid number. */
export function parsePhone(raw: unknown, country?: unknown): { country: string; phone: string } | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const cc = typeof country === 'string' && country.startsWith('+') ? country : null
  let s = raw.trim().replace(/[\s().-]/g, '')
  let code = cc
  if (!code && s.startsWith('+')) {
    code = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length).find((c) => s.startsWith(c.code))?.code ?? null
    if (code) s = s.slice(code.length)
  } else if (code && s.startsWith(code)) s = s.slice(code.length)
  code ??= '+91'
  s = digits(s)
  if (code === '+91' && s.length === 12 && s.startsWith('91')) s = s.slice(2)
  if (code === '+91' && s.length === 11 && s.startsWith('0')) s = s.slice(1)
  return isValidPhone(code, s) ? { country: code, phone: s } : null
}

/** The lead with this email, or else this phone (last 10 digits). */
export async function findLead(email: string | null, phone: { country: string; phone: string } | null): Promise<{ id: string; matchedBy: 'email' | 'phone' } | null> {
  if (email) {
    const r = await queryOne<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email])
    if (r) return { id: r.id, matchedBy: 'email' }
  }
  if (phone) {
    const tail = digits(`${phone.country}${phone.phone}`).slice(-10)
    if (tail.length >= 8) {
      const r = await queryOne<{ id: string }>(
        `SELECT id FROM users WHERE phone IS NOT NULL AND right(regexp_replace(coalesce(phone_country, '') || phone, '\\D', '', 'g'), 10) = $1
          ORDER BY created_at LIMIT 1`,
        [tail],
      )
      if (r) return { id: r.id, matchedBy: 'phone' }
    }
  }
  return null
}

function profileOf(a: Answers) {
  return {
    currentRole: roleLabel(a), experience: experienceLabel(a), codes: labelOf(PROGRAMMER, a.programmer) ?? null, education: labelOf(EDU_LEVELS, a.eduLevel) ?? null,
    industry: domainLabel(a) ?? null, interest: interestLabel(a), goal: goalLabel(a) ?? null, targetRole: targetRoleLabel(a),
    skills: (a.skills ?? []).map((x) => labelOf(SKILLS, x) ?? x), ctc: labelOf(CTC_BANDS, a.ctc) ?? null, city: labelOf(CITIES, a.city) ?? null,
    weeklyHours: labelOf(WEEKLY_HOURS, a.weeklyHours) ?? null, timeline: labelOf(TIMELINES, a.timeline) ?? null,
  }
}

/** Everything a connected CRM needs about one lead (no AI call: the brief is whatever was last written). */
export async function apiLead(id: string) {
  const u = await queryOne<{
    id: string; email: string; name: string | null; phone_country: string | null; phone: string | null; created_at: Date; updated_at: Date; last_login_at: Date | null
    status: string | null; source: string | null; owner_email: string | null; owner_name: string | null; owner_role: string | null
    crm_id: string | null; existed: boolean | null; matched_by: string | null; answers: Answers | null
  }>(
    `SELECT u.id, u.email, u.name, u.phone_country, u.phone, u.created_at, u.updated_at, u.last_login_at, lo.status, lo.source,
            s.email AS owner_email, s.name AS owner_name, s.role AS owner_role, le.crm_id, le.existed, le.matched_by, a.answers
       FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id LEFT JOIN admin_users s ON s.id = lo.owner_id
       LEFT JOIN lead_external le ON le.user_id = u.id LEFT JOIN assessments a ON a.user_id = u.id
      WHERE u.id = $1`,
    [id],
  )
  if (!u) return null
  const intel = await leadInsights(id)
  const reports = await query<{ tool: string; status: string; updated_at: Date; generated_by: string | null }>(`SELECT tool, status, updated_at, generated_by FROM tool_results WHERE user_id = $1`, [id])
  const p = intel?.plan
  const test = p?.test
  return {
    id: u.id, email: u.email, name: u.name, phone: u.phone ? `${u.phone_country ?? ''}${u.phone}` : null,
    status: u.status ?? 'new', statusLabel: statusLabel(u.status), source: u.source,
    owner: u.owner_email ? { email: u.owner_email, name: u.owner_name, role: u.owner_role } : null,
    crm: { id: u.crm_id, existed: Boolean(u.existed), matchedBy: u.matched_by },
    signedUpAt: u.created_at, lastSeenAt: u.last_login_at,
    profile: profileOf(u.answers ?? {}),
    path: p ? { persona: p.path.persona.name, match: p.path.match, options: p.path.options.map((o) => ({ kind: o.kind, label: pathKindLabel(o.kind), program: o.name, fit: o.fit, later: Boolean(o.later) })) } : null,
    reports: reports.map((r) => ({ tool: r.tool, status: r.status, updatedAt: r.updated_at, builtBy: r.generated_by ? 'staff' : 'learner' })),
    skillGap: p?.skillGap ? { targetRole: p.skillGap.targetRole, readiness: p.skillGap.readiness?.score ?? null, gaps: (p.skillGap.gapDetails ?? []).map((g) => ({ skill: g.skill, weeks: g.weeks })) } : null,
    roadmap: p?.roadmap ? { targetRole: p.roadmap.targetRole, months: p.roadmap.durationMonths, phases: p.roadmap.phases.map((ph) => ({ title: ph.title, weeks: ph.weeks })) } : null,
    eligibility: test ? { track: test.track, attempt: test.attempt, attempts: p?.attempts ?? 1, score: test.score, band: test.band, correct: test.correct, total: test.total, completedAt: test.completed_at, byTopic: test.breakdown?.byTopic ?? [] } : null,
    intent: intel?.intent ?? null,
    insights: intel?.summary ? { ...intel.summary, generatedAt: intel.generatedAt } : null,
  }
}

const enc = (at: Date, id: string) => Buffer.from(`${new Date(at).toISOString()}|${id}`).toString('base64url')
function dec(c: string): { at: string; id: string } | null {
  try {
    const [at, id] = Buffer.from(c, 'base64url').toString().split('|')
    return at && !Number.isNaN(Date.parse(at)) && /^[0-9a-f-]{36}$/.test(id ?? '') ? { at, id } : null
  } catch { return null }
}

/** Leads changed since a time, oldest change first, for syncing. */
export async function apiListLeads(opts: { updatedSince: string | null; limit: number; cursor: string | null }) {
  const c = opts.cursor ? dec(opts.cursor) : null
  const since = opts.updatedSince && !Number.isNaN(Date.parse(opts.updatedSince)) ? new Date(opts.updatedSince) : new Date(0)
  const rows = await query<{ id: string; email: string; name: string | null; phone: string | null; status: string; owner_email: string | null; intent: number | null; band: string | null; created_at: Date; changed_at: Date }>(
    `SELECT * FROM (
       SELECT u.id, u.email, u.name, CASE WHEN u.phone IS NULL THEN NULL ELSE coalesce(u.phone_country, '') || u.phone END AS phone,
              coalesce(lo.status, 'new') AS status, s.email AS owner_email, li.intent, li.band, u.created_at,
              greatest(u.updated_at, u.created_at, coalesce(u.last_login_at, u.created_at), coalesce(lo.updated_at, u.created_at), coalesce(li.updated_at, u.created_at)) AS changed_at
         FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id LEFT JOIN admin_users s ON s.id = lo.owner_id LEFT JOIN lead_insights li ON li.user_id = u.id
     ) x
     WHERE x.changed_at >= $1 AND ($2::timestamptz IS NULL OR (x.changed_at, x.id) > ($2::timestamptz, $3::uuid))
     ORDER BY x.changed_at, x.id LIMIT $4`,
    [since, c?.at ?? null, c?.id ?? '00000000-0000-0000-0000-000000000000', opts.limit + 1],
  )
  const more = rows.length > opts.limit
  const page = rows.slice(0, opts.limit)
  return {
    leads: page.map((r) => ({ id: r.id, email: r.email, name: r.name, phone: r.phone, status: r.status, owner: r.owner_email, intent: r.intent === null ? null : { score: r.intent, band: r.band }, signedUpAt: r.created_at, changedAt: r.changed_at })),
    nextCursor: more ? enc(page.at(-1)!.changed_at, page.at(-1)!.id) : null,
  }
}

type UpsertResult = { status: number; body: Record<string, unknown> }

/**
 * Creates a lead, or, when the email or phone already belongs to someone, enriches them without overwriting:
 * only an empty name or phone is filled; the note and anything else sent is kept as a note on the lead.
 */
export async function apiUpsertLead(key: ApiKey, b: Record<string, unknown>): Promise<UpsertResult> {
  const email = b.email === undefined ? null : normalizeEmail(b.email)
  if (b.email !== undefined && !email) return { status: 400, body: { error: 'email is not a valid address.' } }
  const phone = parsePhone(b.phone, b.phoneCountry)
  if (b.phone !== undefined && b.phone !== null && b.phone !== '' && !phone) return { status: 400, body: { error: 'phone is not a valid number. Use E.164, e.g. +919876543210.' } }
  if (!email && !phone) return { status: 400, body: { error: 'Send an email or a phone.' } }
  const name = cleanText(b.name, 80)
  const note = typeof b.note === 'string' ? b.note.replace(/\r\n/g, '\n').trim().slice(0, 2000) : ''
  const crmId = typeof b.crmId === 'string' || typeof b.crmId === 'number' ? String(b.crmId).slice(0, 120) : null
  const tag = `[API · ${key.name}]`

  const hit = await findLead(email, phone)
  if (hit) {
    const filled: string[] = []
    await transaction(async (db) => {
      const cur = (await db.query<{ name: string | null; phone: string | null }>(`SELECT name, phone FROM users WHERE id = $1 FOR UPDATE`, [hit.id])).rows[0]
      if (name.length >= 2 && !cur?.name) { await db.query(`UPDATE users SET name = $2, updated_at = now() WHERE id = $1`, [hit.id, name]); filled.push('name') }
      if (phone && !cur?.phone) { await db.query(`UPDATE users SET phone_country = $2, phone = $3, updated_at = now() WHERE id = $1`, [hit.id, phone.country, phone.phone]); filled.push('phone') }
      if (note) await db.query(`INSERT INTO lead_notes (user_id, author_id, body) VALUES ($1, NULL, $2)`, [hit.id, `${tag} ${note}`])
      await logActivity(db, null, hit.id, 'api_enriched', { key: key.name, filled, matchedBy: hit.matchedBy, ...(note ? { note: true } : {}) })
    })
    if (crmId) await recordCrmMatch(hit.id, { exists: true, crmId, matchedBy: hit.matchedBy })
    return { status: 200, body: { id: hit.id, existed: true, matchedBy: hit.matchedBy, filled, noteAdded: Boolean(note), message: 'Lead already exists. Nothing was overwritten.' } }
  }

  if (!email) return { status: 404, body: { error: 'No lead has this phone. Send an email too to create one.' } }
  // A new lead needs a real, reachable inbox (no test or temporary emails).
  const emailIssue = await emailProblem(email)
  if (emailIssue) return { status: 400, body: { error: `email is not accepted: ${emailIssue}` } }
  const created = await queryOne<{ id: string; inserted: boolean }>(
    `INSERT INTO users (email, name, phone_country, phone, source) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id, (xmax = 0) AS inserted`,
    [email, name.length >= 2 ? name : null, phone?.country ?? null, phone?.phone ?? null, JSON.stringify({ via: 'api', key: key.name })],
  )
  if (!created) return { status: 500, body: { error: 'Could not save the lead.' } }
  if (!created.inserted) return { status: 200, body: { id: created.id, existed: true, matchedBy: 'email', filled: [], noteAdded: false, message: 'Lead already exists. Nothing was overwritten.' } }
  if (crmId) await recordCrmMatch(created.id, { exists: true, crmId, matchedBy: 'email' })
  if (note) await query(`INSERT INTO lead_notes (user_id, author_id, body) VALUES ($1, NULL, $2)`, [created.id, `${tag} ${note}`])
  await logActivity(null, null, created.id, 'lead_created', { via: 'api', key: key.name })

  // The owner the main CRM names, when they work here; otherwise the usual allocation (main CRM lookup, then round robin).
  const ownerEmail = normalizeEmail(b.ownerEmail)
  const owner = ownerEmail ? await queryOne<{ id: string }>(`SELECT id FROM admin_users WHERE email = $1 AND active AND role <> 'admin'`, [ownerEmail]) : null
  if (owner) {
    await transaction(async (db) => {
      const r = await db.query(`INSERT INTO lead_owners (user_id, owner_id, source) VALUES ($1, $2, 'crm') ON CONFLICT (user_id) DO NOTHING RETURNING user_id`, [created.id, owner.id])
      if (!r.rowCount) return
      await db.query(`INSERT INTO lead_assignments (user_id, to_id, source) VALUES ($1, $2, 'crm')`, [created.id, owner.id])
      await logActivity(db, null, created.id, 'allocated', { source: 'crm', to: owner.id })
    })
    emitLeadEvent('lead.created', created.id, { via: 'api', key: key.name, assigned: 'main_crm_owner' })
  } else {
    await allocateNewLead(created.id, 'api')
  }
  return { status: 201, body: { id: created.id, existed: false, matchedBy: null, filled: [], noteAdded: Boolean(note), message: 'Lead created.' } }
}

export async function apiAddNote(key: ApiKey, id: string, text: unknown): Promise<UpsertResult> {
  const body = typeof text === 'string' ? text.replace(/\r\n/g, '\n').trim().slice(0, 2000) : ''
  if (body.length < 2) return { status: 400, body: { error: 'Send { "text": "…" }.' } }
  await query(`INSERT INTO lead_notes (user_id, author_id, body) VALUES ($1, NULL, $2)`, [id, `[API · ${key.name}] ${body}`])
  await logActivity(null, null, id, 'note_added', { via: 'api', key: key.name })
  return { status: 201, body: { ok: true } }
}

/** The main CRM is the source of truth for status: it can sync it here (staff can't change it in this app). */
export async function apiSyncStatus(key: ApiKey, id: string, status: unknown): Promise<UpsertResult> {
  if (!isLeadStatus(status)) return { status: 400, body: { error: 'status must be one of: new, contacted, interested, not_interested, enrolled, lost.' } }
  const from = (await queryOne<{ status: string }>(`SELECT status FROM lead_owners WHERE user_id = $1`, [id]))?.status ?? 'new'
  if (from === status) return { status: 200, body: { ok: true, changed: false } }
  await transaction(async (db) => {
    await db.query(
      `INSERT INTO lead_owners (user_id, owner_id, source, status) VALUES ($1, NULL, 'crm', $2)
       ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
      [id, status],
    )
    await logActivity(db, null, id, 'status_changed', { from, to: status, via: 'main_crm', key: key.name })
  })
  return { status: 200, body: { ok: true, changed: true, from, to: status } }
}
