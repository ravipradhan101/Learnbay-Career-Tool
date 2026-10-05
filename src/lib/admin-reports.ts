import { query, queryOne } from './db'
import { costInr } from './ai-usage'

// Queries behind the admin reports. Every query is parameterised; the date range comes from a fixed whitelist.

export const RANGES = [
  { key: '24h', label: 'Last 24 hours', days: 1 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
] as const
export type RangeKey = (typeof RANGES)[number]['key']

export function parseRange(value: unknown): { key: RangeKey; label: string; since: Date } {
  const r = RANGES.find((x) => x.key === value) ?? RANGES[2]
  return { key: r.key, label: r.label, since: r.days === null ? new Date('2000-01-01T00:00:00Z') : new Date(Date.now() - r.days * 86_400_000) }
}

/** Numeric value from an event's props, ignoring anything that isn't a JSON number. */
const num = (key: string) => `(CASE WHEN jsonb_typeof(props->'${key}') = 'number' THEN (props->>'${key}')::numeric END)`
const n = (v: unknown) => Number(v ?? 0) || 0

export const PAGE_NAMES: Record<string, string> = {
  '/': 'Landing page', '/start': 'Quick start (4 questions)', '/login': 'Login page', '/dashboard': 'Studio home (AI advisor)',
  '/dashboard/skill-gap': 'Skill Gap Analysis', '/dashboard/salary': 'Salary Insights', '/dashboard/roadmap': 'Career Roadmap',
  '/dashboard/sessions': '1:1 session booking', '/dashboard/counselling': '1:1 counselling', '/dashboard/masterclasses': 'Masterclasses',
  '/dashboard/profile': 'Profile', '/dashboard/help': 'Help', '/r/[token]': 'Shared report (public link)',
}
export const pageName = (path: string | null) => (path ? PAGE_NAMES[path] ?? path : '—')

export const STEP_NAMES: Record<string, string> = {
  name: 'Name', goal: 'Career goal', domain: 'Industry / background', studyStage: 'Final year or graduated?',
  role: 'Current role', experience: 'Years of experience', programmer: 'Codes at work?', interest: 'Program area', contact: 'Contact details',
  targetRole: 'Target role', skills: 'Current skills', ctc: 'Current CTC', city: 'City', weeklyHours: 'Weekly hours', timeline: 'Timeline',
}

export const FEATURE_NAMES: Record<string, string> = {
  'skill-gap': 'Skill Gap Analysis', salary: 'Salary Insights', roadmap: 'Career Roadmap', 'resume-review': 'Resume review',
  'assistant:home': 'AI chat: studio home', 'assistant:advisor': 'AI chat: advisor', 'assistant:skill-gap': 'AI chat: on Skill Gap',
  'assistant:salary': 'AI chat: on Salary', 'assistant:roadmap': 'AI chat: on Roadmap', 'eligibility-test': 'Eligibility test questions',
}
export const featureName = (f: string) => FEATURE_NAMES[f] ?? f

// ---------- Overview ----------

export async function overview(since: Date) {
  const [kpi, tokens, daily] = await Promise.all([
    queryOne<Record<string, string>>(
      `SELECT
         (SELECT count(DISTINCT visitor_id) FROM analytics_events WHERE created_at >= $1) AS visitors,
         (SELECT count(DISTINCT session_id) FROM analytics_events WHERE created_at >= $1) AS visits,
         (SELECT count(*) FROM users WHERE created_at >= $1) AS signups,
         (SELECT count(DISTINCT user_id) FROM analytics_events WHERE created_at >= $1 AND user_id IS NOT NULL) AS active_users,
         (SELECT count(*) FROM tool_results WHERE status = 'ready' AND updated_at >= $1) AS tools_ready,
         (SELECT count(*) FROM counsellor_requests WHERE created_at >= $1) AS sessions_booked,
         (SELECT count(*) FROM resume_analyses WHERE created_at >= $1) AS resumes,
         (SELECT count(*) FROM chat_messages WHERE created_at >= $1 AND role = 'user') AS chat_questions,
         (SELECT avg(${num('duration_ms')}) FROM analytics_events WHERE created_at >= $1 AND type = 'page_leave') AS avg_page_ms`,
      [since],
    ),
    queryOne<Record<string, string>>(
      `SELECT count(*) AS calls, coalesce(sum(total_tokens), 0) AS total, coalesce(sum(prompt_tokens), 0) AS prompt,
              coalesce(sum(output_tokens + thought_tokens), 0) AS output
         FROM ai_usage WHERE created_at >= $1`,
      [since],
    ),
    query<{ d: string; visitors: string; signups: string; tokens: string }>(
      `WITH days AS (
         SELECT generate_series((now() AT TIME ZONE 'Asia/Kolkata')::date - 13, (now() AT TIME ZONE 'Asia/Kolkata')::date, interval '1 day')::date AS d
       ),
       v AS (SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS d, count(DISTINCT visitor_id) AS n FROM analytics_events WHERE created_at >= now() - interval '15 days' GROUP BY 1),
       s AS (SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS d, count(*) AS n FROM users WHERE created_at >= now() - interval '15 days' GROUP BY 1),
       t AS (SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS d, sum(total_tokens) AS n FROM ai_usage WHERE created_at >= now() - interval '15 days' GROUP BY 1)
       SELECT to_char(days.d, 'DD Mon') AS d, coalesce(v.n, 0) AS visitors, coalesce(s.n, 0) AS signups, coalesce(t.n, 0) AS tokens
         FROM days LEFT JOIN v USING (d) LEFT JOIN s USING (d) LEFT JOIN t USING (d) ORDER BY days.d`,
    ),
  ])
  return {
    visitors: n(kpi?.visitors), visits: n(kpi?.visits), signups: n(kpi?.signups), activeUsers: n(kpi?.active_users),
    toolsReady: n(kpi?.tools_ready), sessionsBooked: n(kpi?.sessions_booked), resumes: n(kpi?.resumes), chatQuestions: n(kpi?.chat_questions),
    avgPageSeconds: Math.round(n(kpi?.avg_page_ms) / 1000),
    tokens: { calls: n(tokens?.calls), total: n(tokens?.total), costInr: costInr(n(tokens?.prompt), n(tokens?.output)) },
    daily: daily.map((d) => ({ day: d.d, visitors: n(d.visitors), signups: n(d.signups), tokens: n(d.tokens) })),
  }
}

// ---------- Funnels and drop-off ----------

export type FunnelStep = { label: string; count: number; note?: string }

/** Visitors (anonymous or not) reaching each stage of the public journey. */
export async function acquisitionFunnel(since: Date): Promise<FunnelStep[]> {
  const r = await queryOne<Record<string, string>>(
    `SELECT
       count(DISTINCT visitor_id) AS visitors,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'page_view' AND path = '/') AS landing,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'page_view' AND path = '/start') AS tracks,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'step_view' AND name IN ('onboarding:name', 'onboarding:goal')) AS started,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'step_answer' AND name = 'onboarding:goal') AS goal,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'step_answer' AND name = 'onboarding:domain') AS domain,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'step_answer' AND name = 'onboarding:experience') AS experience,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'action' AND name = 'contact_field_focus') AS contact_started,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'action' AND name IN ('onboarding_completed', 'onboarding_existing_email')) AS submitted,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'action' AND name IN ('email_verified', 'login_completed')) AS verified,
       count(DISTINCT visitor_id) FILTER (WHERE type = 'page_view' AND path = '/dashboard') AS dashboard
     FROM analytics_events WHERE created_at >= $1`,
    [since],
  )
  return [
    { label: 'Visited any page', count: n(r?.visitors) },
    { label: 'Saw the landing page', count: n(r?.landing), note: 'Some visitors arrive on /start or /login directly' },
    { label: 'Saw the track picker', count: n(r?.tracks) },
    { label: 'Started chatting with Lumi', count: n(r?.started) },
    { label: 'Answered: career goal', count: n(r?.goal) },
    { label: 'Answered: industry / background', count: n(r?.domain) },
    { label: 'Answered: experience', count: n(r?.experience) },
    { label: 'Started typing contact details', count: n(r?.contact_started) },
    { label: 'Submitted contact details', count: n(r?.submitted) },
    { label: 'Confirmed email with the code', count: n(r?.verified) },
    { label: 'Opened Career Studio', count: n(r?.dashboard), note: 'Includes returning learners who logged in' },
  ]
}

/** The counsellor's conversation (Counsellor Conversation Playbook): learners reaching each stage in the range. */
export async function conversationFunnel(since: Date): Promise<FunnelStep[]> {
  const r = await queryOne<Record<string, string>>(
    `SELECT
       count(DISTINCT user_id) FILTER (WHERE type = 'page_view' AND path LIKE '/dashboard%') AS studio,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'counsel:why_now') AS why_now,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'counsel:probe') AS probe,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'counsel:need_agreed') AS need,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'counsel:need_agreed' AND props->>'value' = 'yes') AS need_yes,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'tool_ready' AND props->>'tool' = 'skill-gap') AS report,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'elig:push_shown') AS push,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'elig:push_accepted') AS accepted,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'elig:completed') AS tested,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'decision:asked') AS asked,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'decision:taken' AND props->>'choice' IN ('mentor', 'call')) AS decided,
       count(DISTINCT user_id) FILTER (WHERE type = 'action' AND name = 'decision:taken' AND props->>'choice' = 'email') AS emailed
     FROM analytics_events WHERE created_at >= $1 AND user_id IS NOT NULL`,
    [since],
  )
  return [
    { label: 'Opened Career Studio', count: n(r?.studio) },
    { label: 'Answered "why now?"', count: n(r?.why_now), note: 'Their own reason: the only urgency the counsellor uses' },
    { label: 'Answered their segment question', count: n(r?.probe) },
    { label: 'Reached the need check', count: n(r?.need), note: `${fmtN(r?.need_yes)} said "Yes, that's me"` },
    { label: 'Got the skill-gap report', count: n(r?.report) },
    { label: 'Saw "Check if I qualify"', count: n(r?.push) },
    { label: 'Said yes to the test', count: n(r?.accepted) },
    { label: 'Finished the test', count: n(r?.tested) },
    { label: 'Were asked to decide', count: n(r?.asked) },
    { label: 'Booked a counselling call or asked for a call', count: n(r?.decided), note: `${fmtN(r?.emailed)} more asked for the plan by email` },
  ]
}
const fmtN = (v: string | undefined) => n(v).toLocaleString('en-IN')

/** What people who signed up in the range went on to do. */
export async function activationFunnel(since: Date): Promise<FunnelStep[]> {
  const r = await queryOne<Record<string, string>>(
    `WITH c AS (SELECT id FROM users WHERE created_at >= $1),
     t AS (SELECT user_id, count(*) FILTER (WHERE status = 'ready') AS ready, count(*) AS started FROM tool_results WHERE user_id IN (SELECT id FROM c) GROUP BY user_id)
     SELECT
       (SELECT count(*) FROM c) AS signups,
       (SELECT count(*) FROM t WHERE started > 0) AS started_tool,
       (SELECT count(*) FROM t WHERE ready >= 1) AS one_tool,
       (SELECT count(*) FROM t WHERE ready >= 2) AS two_tools,
       (SELECT count(*) FROM t WHERE ready >= 3) AS all_tools,
       (SELECT count(*) FROM users WHERE id IN (SELECT id FROM c) AND email_verified_at IS NOT NULL) AS verified,
       (SELECT count(DISTINCT user_id) FROM eligibility_tests WHERE status = 'completed' AND user_id IN (SELECT id FROM c)) AS eligibility,
       (SELECT count(DISTINCT user_id) FROM chat_messages WHERE role = 'user' AND user_id IN (SELECT id FROM c)) AS chatted,
       (SELECT count(*) FROM resume_analyses WHERE user_id IN (SELECT id FROM c)) AS resume,
       (SELECT count(DISTINCT user_id) FROM counsellor_requests WHERE user_id IN (SELECT id FROM c)) AS booked`,
    [since],
  )
  return [
    { label: 'Left contact details (lead)', count: n(r?.signups) },
    { label: 'Confirmed email', count: n(r?.verified) },
    { label: 'Started a tool', count: n(r?.started_tool) },
    { label: 'Got 1+ tool result', count: n(r?.one_tool) },
    { label: 'Got 2+ tool results', count: n(r?.two_tools) },
    { label: 'Completed all 3 tools', count: n(r?.all_tools) },
    { label: 'Completed the eligibility test', count: n(r?.eligibility), note: 'Optional step' },
    { label: 'Asked the AI advisor a question', count: n(r?.chatted), note: 'Optional step' },
    { label: 'Uploaded a resume for review', count: n(r?.resume), note: 'Optional step' },
    { label: 'Booked a 1:1 session', count: n(r?.booked), note: 'The conversion goal' },
  ]
}

export async function dropOffs(since: Date) {
  const [onboardingExit, landingOnly, contact, toolSteps, toolGen, exits] = await Promise.all([
    // Last onboarding question seen by visitors who never submitted.
    query<{ step: string; visitors: string }>(
      `WITH v AS (
         SELECT visitor_id,
                (array_agg(name ORDER BY created_at DESC, id DESC) FILTER (WHERE type = 'step_view' AND name LIKE 'onboarding:%'))[1] AS last_step,
                bool_or(type = 'action' AND name IN ('onboarding_completed', 'onboarding_existing_email')) AS done
           FROM analytics_events WHERE created_at >= $1 GROUP BY visitor_id
       )
       SELECT split_part(last_step, ':', 2) AS step, count(*) AS visitors FROM v WHERE last_step IS NOT NULL AND NOT done GROUP BY 1 ORDER BY 2 DESC`,
      [since],
    ),
    // Visitors who saw the landing page and did nothing else of substance.
    queryOne<{ n: string }>(
      `WITH v AS (
         SELECT visitor_id,
                bool_or(type = 'page_view' AND path = '/') AS landed,
                bool_or(type IN ('step_view', 'step_answer') OR (type = 'action' AND name LIKE 'login%') OR (type = 'page_view' AND path <> '/')) AS moved
           FROM analytics_events WHERE created_at >= $1 GROUP BY visitor_id
       )
       SELECT count(*) AS n FROM v WHERE landed AND NOT coalesce(moved, false)`,
      [since],
    ),
    query<{ kind: string; field: string; visitors: string }>(
      `SELECT CASE WHEN type = 'error' THEN 'error' ELSE 'focus' END AS kind,
              CASE WHEN type = 'error' THEN split_part(name, ':', 2) ELSE props->>'field' END AS field,
              count(DISTINCT visitor_id) AS visitors
         FROM analytics_events
        WHERE created_at >= $1 AND ((type = 'action' AND name = 'contact_field_focus') OR (type = 'error' AND name LIKE 'contact:%'))
        GROUP BY 1, 2`,
      [since],
    ),
    query<{ tool: string; q: string; type: string; visitors: string }>(
      `SELECT split_part(name, ':', 1) AS tool, split_part(name, ':', 2) AS q, type, count(DISTINCT visitor_id) AS visitors
         FROM analytics_events
        WHERE created_at >= $1 AND type IN ('step_view', 'step_answer', 'step_back') AND name ~ '^(skill-gap|salary|roadmap):'
        GROUP BY 1, 2, 3`,
      [since],
    ),
    query<{ tool: string; started: string; ready: string; failed: string; avg_wait_ms: string | null }>(
      `SELECT props->>'tool' AS tool,
              count(DISTINCT visitor_id) FILTER (WHERE name = 'tool_generate_start') AS started,
              count(DISTINCT visitor_id) FILTER (WHERE name = 'tool_ready') AS ready,
              count(*) FILTER (WHERE name = 'tool_generate_failed') AS failed,
              avg(${num('wait_ms')}) FILTER (WHERE name = 'tool_ready') AS avg_wait_ms
         FROM analytics_events
        WHERE created_at >= $1 AND name IN ('tool_generate_start', 'tool_ready', 'tool_generate_failed')
        GROUP BY 1`,
      [since],
    ),
    // Where visits end: the last page of each visit, against how often that page is viewed.
    query<{ path: string; views: string; exits: string; bounces: string }>(
      `WITH pv AS (
         SELECT session_id, path,
                row_number() OVER (PARTITION BY session_id ORDER BY created_at DESC, id DESC) AS rn,
                count(*) OVER (PARTITION BY session_id) AS pages
           FROM analytics_events WHERE created_at >= $1 AND type = 'page_view'
       )
       SELECT path, count(*) AS views, count(*) FILTER (WHERE rn = 1) AS exits, count(*) FILTER (WHERE rn = 1 AND pages = 1) AS bounces
         FROM pv GROUP BY path ORDER BY exits DESC LIMIT 20`,
      [since],
    ),
  ])

  const byTool: Record<string, { q: string; viewed: number; answered: number; back: number }[]> = {}
  for (const row of toolSteps) {
    const list = (byTool[row.tool] ??= [])
    let item = list.find((x) => x.q === row.q)
    if (!item) { item = { q: row.q, viewed: 0, answered: 0, back: 0 }; list.push(item) }
    if (row.type === 'step_view') item.viewed = n(row.visitors)
    else if (row.type === 'step_answer') item.answered = n(row.visitors)
    else item.back = n(row.visitors)
  }
  const order = ['targetRole', 'skills', 'ctc', 'city', 'weeklyHours', 'timeline']
  for (const list of Object.values(byTool)) list.sort((a, b) => order.indexOf(a.q) - order.indexOf(b.q))

  const fields = ['c-name', 'c-email', 'Country code', 'c-phone']
  return {
    onboardingExit: onboardingExit.map((r) => ({ step: r.step, visitors: n(r.visitors) })),
    landingOnly: n(landingOnly?.n),
    contactFields: fields.map((f) => ({
      field: f,
      label: f === 'c-name' ? 'Full name' : f === 'c-email' ? 'Email' : f === 'c-phone' ? 'Phone number' : 'Country code',
      focused: n(contact.find((c) => c.kind === 'focus' && c.field === f)?.visitors),
    })),
    contactErrors: contact.filter((c) => c.kind === 'error').map((c) => ({ field: c.field, visitors: n(c.visitors) })).sort((a, b) => b.visitors - a.visitors),
    toolSteps: byTool,
    toolGeneration: toolGen.filter((t) => t.tool).map((t) => ({
      tool: t.tool, started: n(t.started), ready: n(t.ready), failed: n(t.failed), avgWaitSeconds: t.avg_wait_ms ? Math.round(n(t.avg_wait_ms) / 1000) : null,
    })),
    exits: exits.map((e) => ({ path: e.path, views: n(e.views), exits: n(e.exits), bounces: n(e.bounces) })),
  }
}

// ---------- Navigation ----------

export async function navigation(since: Date) {
  const [pages, transitions, entries, clicks, sources, devices] = await Promise.all([
    query<{ path: string; views: string; visitors: string; avg_ms: string | null; median_ms: string | null; avg_scroll: string | null }>(
      `SELECT path,
              count(*) FILTER (WHERE type = 'page_view') AS views,
              count(DISTINCT visitor_id) FILTER (WHERE type = 'page_view') AS visitors,
              avg(${num('duration_ms')}) FILTER (WHERE type = 'page_leave') AS avg_ms,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY ${num('duration_ms')}) FILTER (WHERE type = 'page_leave') AS median_ms,
              avg(${num('scroll_pct')}) FILTER (WHERE type = 'page_leave') AS avg_scroll
         FROM analytics_events WHERE created_at >= $1 AND type IN ('page_view', 'page_leave')
        GROUP BY path ORDER BY views DESC LIMIT 30`,
      [since],
    ),
    query<{ from_path: string; to_path: string; n: string }>(
      `WITH pv AS (
         SELECT path, lag(path) OVER (PARTITION BY session_id ORDER BY created_at, id) AS prev
           FROM analytics_events WHERE created_at >= $1 AND type = 'page_view'
       )
       SELECT prev AS from_path, path AS to_path, count(*) AS n FROM pv WHERE prev IS NOT NULL AND prev <> path
        GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 25`,
      [since],
    ),
    query<{ path: string; n: string }>(
      `WITH pv AS (
         SELECT path, row_number() OVER (PARTITION BY session_id ORDER BY created_at, id) AS rn
           FROM analytics_events WHERE created_at >= $1 AND type = 'page_view'
       )
       SELECT path, count(*) AS n FROM pv WHERE rn = 1 GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      [since],
    ),
    query<{ label: string; path: string; href: string | null; clicks: string; visitors: string }>(
      `SELECT name AS label, path, props->>'href' AS href, count(*) AS clicks, count(DISTINCT visitor_id) AS visitors
         FROM analytics_events WHERE created_at >= $1 AND type = 'click'
        GROUP BY 1, 2, 3 ORDER BY clicks DESC LIMIT 40`,
      [since],
    ),
    query<{ source: string; medium: string | null; campaign: string | null; visitors: string }>(
      `SELECT coalesce(props->>'utm_source', props->>'referrer', 'Direct / unknown') AS source, props->>'utm_medium' AS medium,
              props->>'utm_campaign' AS campaign, count(DISTINCT visitor_id) AS visitors
         FROM analytics_events WHERE created_at >= $1 AND type = 'page_view' AND props->>'entry' = '1'
        GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 20`,
      [since],
    ),
    query<{ device: string; visitors: string }>(
      `SELECT coalesce(props->>'device', 'unknown') AS device, count(DISTINCT visitor_id) AS visitors
         FROM analytics_events WHERE created_at >= $1 AND type = 'page_view' GROUP BY 1 ORDER BY 2 DESC`,
      [since],
    ),
  ])
  return {
    pages: pages.map((p) => ({
      path: p.path, views: n(p.views), visitors: n(p.visitors),
      avgSeconds: p.avg_ms === null ? null : Math.round(n(p.avg_ms) / 1000),
      medianSeconds: p.median_ms === null ? null : Math.round(n(p.median_ms) / 1000),
      avgScroll: p.avg_scroll === null ? null : Math.round(n(p.avg_scroll)),
    })),
    transitions: transitions.map((t) => ({ from: t.from_path, to: t.to_path, count: n(t.n) })),
    entries: entries.map((e) => ({ path: e.path, count: n(e.n) })),
    clicks: clicks.map((c) => ({ label: c.label, path: c.path, href: c.href, clicks: n(c.clicks), visitors: n(c.visitors) })),
    sources: sources.map((s) => ({ source: s.source, medium: s.medium, campaign: s.campaign, visitors: n(s.visitors) })),
    devices: devices.map((d) => ({ device: d.device, visitors: n(d.visitors) })),
  }
}

// ---------- Feature usage and avoidance ----------

type CohortRow = {
  id: string
  paths: string[] | null
  ready: string[] | null
  lead_types: string[] | null
  names: string[] | null
  resume: boolean
  chatted: boolean
  booked: boolean
  eligibility: boolean
}

export async function featureUsage(since: Date) {
  const [rows, firstPicks] = await Promise.all([
    query<CohortRow>(
      `WITH c AS (SELECT id FROM users WHERE created_at >= $1)
       SELECT c.id,
              (SELECT array_agg(DISTINCT path) FROM analytics_events e WHERE e.user_id = c.id AND e.type = 'page_view') AS paths,
              (SELECT array_agg(tool) FROM tool_results t WHERE t.user_id = c.id AND t.status = 'ready') AS ready,
              (SELECT array_agg(DISTINCT type) FROM lead_events l WHERE l.user_id = c.id) AS lead_types,
              (SELECT array_agg(DISTINCT name) FROM analytics_events e WHERE e.user_id = c.id AND e.type IN ('action', 'step_view')) AS names,
              EXISTS (SELECT 1 FROM resume_analyses r WHERE r.user_id = c.id) AS resume,
              EXISTS (SELECT 1 FROM chat_messages m WHERE m.user_id = c.id AND m.role = 'user') AS chatted,
              EXISTS (SELECT 1 FROM counsellor_requests s WHERE s.user_id = c.id) AS booked,
              EXISTS (SELECT 1 FROM eligibility_tests t WHERE t.user_id = c.id AND t.status = 'completed') AS eligibility
         FROM c`,
      [since],
    ),
    query<{ tool: string; n: string }>(
      `SELECT detail->>'tool' AS tool, count(*) AS n FROM lead_events WHERE type = 'first_pick' AND created_at >= $1 GROUP BY 1 ORDER BY 2 DESC`,
      [since],
    ),
  ])

  const has = (list: string[] | null, v: string) => Boolean(list?.includes(v))
  const anyReady = (r: CohortRow) => Boolean(r.ready?.length)
  const features: { name: string; where: string; seen: (r: CohortRow) => boolean; used: (r: CohortRow) => boolean }[] = [
    { name: 'Skill Gap Analysis', where: 'Opened the tool page', seen: (r) => has(r.paths, '/dashboard/skill-gap'), used: (r) => has(r.ready, 'skill-gap') },
    { name: 'Salary Insights', where: 'Opened the tool page', seen: (r) => has(r.paths, '/dashboard/salary'), used: (r) => has(r.ready, 'salary') },
    { name: 'Career Roadmap', where: 'Opened the tool page', seen: (r) => has(r.paths, '/dashboard/roadmap'), used: (r) => has(r.ready, 'roadmap') },
    { name: 'Resume review', where: 'Had a Skill Gap result (where it is offered)', seen: (r) => has(r.ready, 'skill-gap'), used: (r) => r.resume },
    { name: 'AI Career Advisor chat', where: 'Opened the studio', seen: (r) => Boolean(r.paths?.some((p) => p.startsWith('/dashboard'))), used: (r) => r.chatted },
    { name: '1:1 session booking', where: 'Opened the booking page', seen: (r) => has(r.paths, '/dashboard/sessions') || has(r.paths, '/dashboard/counselling'), used: (r) => r.booked },
    { name: 'Eligibility test', where: 'Opened the test page', seen: (r) => has(r.paths, '/dashboard/eligibility'), used: (r) => r.eligibility },
    { name: 'Tool intro → questions', where: 'Saw a tool intro screen', seen: (r) => Boolean(r.names?.some((x) => /^(skill-gap|salary|roadmap):intro$/.test(x))), used: (r) => has(r.names, 'tool_intro_start') },
    { name: '“How Learnbay is different” popup', where: 'Opened the popup', seen: (r) => has(r.names, 'why:1'), used: (r) => has(r.lead_types, 'why_learnbay_completed') },
    { name: 'Masterclasses', where: 'Opened the page', seen: (r) => has(r.paths, '/dashboard/masterclasses'), used: (r) => has(r.lead_types, 'masterclass_interest') },
    { name: 'Email me this report', where: 'Had at least one tool result', seen: anyReady, used: (r) => has(r.lead_types, 'report_emailed') },
    { name: 'Share report link', where: 'Had at least one tool result', seen: anyReady, used: (r) => has(r.lead_types, 'share_created') },
    { name: 'Program / brochure links', where: 'Had at least one tool result', seen: anyReady, used: (r) => has(r.lead_types, 'program_click') || has(r.lead_types, 'brochure_click') },
    { name: '“What to check first” pop-up', where: 'Pop-up was shown', seen: (r) => has(r.names, 'first_pick:modal'), used: (r) => has(r.lead_types, 'first_pick') },
    { name: 'Exit pop-up offer', where: 'Pop-up was shown', seen: (r) => has(r.lead_types, 'exit_popup_shown'), used: (r) => has(r.lead_types, 'exit_popup_action') },
  ]
  const cohort = rows.length
  const table = features.map((f) => {
    const seen = rows.filter(f.seen).length
    const used = rows.filter((r) => f.seen(r) && f.used(r)).length
    return { name: f.name, where: f.where, cohort, seen, used, avoided: seen - used, neverSeen: cohort - seen, useRate: seen ? used / seen : null }
  })
  const dismissedFirstPick = rows.filter((r) => has(r.names, 'first_pick_dismissed')).length
  return { cohort, table, firstPicks: firstPicks.map((f) => ({ tool: f.tool, count: n(f.n) })), dismissedFirstPick }
}

// ---------- AI token usage ----------

export async function tokenUsage(since: Date, search: string) {
  const q = search.trim().toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`)
  const [byFeature, users, daily, anon] = await Promise.all([
    query<Record<string, string>>(
      `SELECT feature, count(*) AS calls, count(*) FILTER (WHERE status <> 'ok') AS failed, count(DISTINCT user_id) AS users,
              sum(prompt_tokens) AS prompt, sum(output_tokens) AS output, sum(thought_tokens) AS thought, sum(total_tokens) AS total,
              avg(latency_ms) AS latency
         FROM ai_usage WHERE created_at >= $1 GROUP BY feature ORDER BY total DESC`,
      [since],
    ),
    query<Record<string, string>>(
      `SELECT u.id, u.name, u.email, count(*) AS calls, sum(a.total_tokens) AS total, sum(a.prompt_tokens) AS prompt,
              sum(a.output_tokens + a.thought_tokens) AS output,
              coalesce(sum(a.total_tokens) FILTER (WHERE a.feature = 'skill-gap'), 0) AS skill_gap,
              coalesce(sum(a.total_tokens) FILTER (WHERE a.feature = 'salary'), 0) AS salary,
              coalesce(sum(a.total_tokens) FILTER (WHERE a.feature = 'roadmap'), 0) AS roadmap,
              coalesce(sum(a.total_tokens) FILTER (WHERE a.feature = 'resume-review'), 0) AS resume,
              coalesce(sum(a.total_tokens) FILTER (WHERE a.feature LIKE 'assistant:%'), 0) AS assistant,
              max(a.created_at) AS last_used
         FROM ai_usage a JOIN users u ON u.id = a.user_id
        WHERE a.created_at >= $1
          AND ($2 = '' OR u.email ILIKE '%' || $2 || '%' OR coalesce(u.name, '') ILIKE '%' || $2 || '%')
        GROUP BY u.id ORDER BY total DESC LIMIT 300`,
      [since, q],
    ),
    query<Record<string, string>>(
      `SELECT to_char((created_at AT TIME ZONE 'Asia/Kolkata')::date, 'DD Mon YYYY') AS day, count(*) AS calls,
              sum(total_tokens) AS total, sum(prompt_tokens) AS prompt, sum(output_tokens + thought_tokens) AS output
         FROM ai_usage WHERE created_at >= $1
        GROUP BY (created_at AT TIME ZONE 'Asia/Kolkata')::date ORDER BY (created_at AT TIME ZONE 'Asia/Kolkata')::date DESC LIMIT 90`,
      [since],
    ),
    queryOne<{ calls: string; total: string }>(`SELECT count(*) AS calls, coalesce(sum(total_tokens), 0) AS total FROM ai_usage WHERE created_at >= $1 AND user_id IS NULL`, [since]),
  ])

  const features = byFeature.map((f) => ({
    feature: f.feature, calls: n(f.calls), failed: n(f.failed), users: n(f.users),
    prompt: n(f.prompt), output: n(f.output), thought: n(f.thought), total: n(f.total),
    avgLatencyMs: Math.round(n(f.latency)), costInr: costInr(n(f.prompt), n(f.output) + n(f.thought)),
  }))
  // Group per AI tool: the three report tools, resume review, and all assistant contexts together.
  const group = (f: string) => (f.startsWith('assistant:') ? 'AI Career Advisor chat' : featureName(f))
  const byTool = new Map<string, { tool: string; calls: number; failed: number; prompt: number; output: number; total: number; costInr: number }>()
  for (const f of features) {
    const key = group(f.feature)
    const t = byTool.get(key) ?? { tool: key, calls: 0, failed: 0, prompt: 0, output: 0, total: 0, costInr: 0 }
    t.calls += f.calls; t.failed += f.failed; t.prompt += f.prompt; t.output += f.output + f.thought; t.total += f.total; t.costInr += f.costInr
    byTool.set(key, t)
  }
  const totals = features.reduce((a, f) => ({ calls: a.calls + f.calls, failed: a.failed + f.failed, prompt: a.prompt + f.prompt, output: a.output + f.output + f.thought, total: a.total + f.total, costInr: a.costInr + f.costInr }),
    { calls: 0, failed: 0, prompt: 0, output: 0, total: 0, costInr: 0 })

  return {
    totals,
    tools: [...byTool.values()].sort((a, b) => b.total - a.total),
    features,
    users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email, calls: n(u.calls), total: n(u.total), costInr: costInr(n(u.prompt), n(u.output)),
      skillGap: n(u.skill_gap), salary: n(u.salary), roadmap: n(u.roadmap), resume: n(u.resume), assistant: n(u.assistant),
      lastUsed: u.last_used as unknown as Date,
    })),
    daily: daily.map((d) => ({ day: d.day, calls: n(d.calls), total: n(d.total), costInr: costInr(n(d.prompt), n(d.output)) })),
    anonymous: { calls: n(anon?.calls), total: n(anon?.total) },
  }
}

// ---------- One learner's journey ----------

export async function userJourney(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null
  const user = await queryOne<{ id: string; name: string | null; email: string; phone_country: string | null; phone: string | null; created_at: Date; last_login_at: Date | null; answers: Record<string, unknown> | null }>(
    `SELECT u.id, u.name, u.email, u.phone_country, u.phone, u.created_at, u.last_login_at, a.answers
       FROM users u LEFT JOIN assessments a ON a.user_id = u.id WHERE u.id = $1`,
    [userId],
  )
  if (!user) return null
  const [events, tools, tokens, booked] = await Promise.all([
    // Includes what this person did anonymously before signing up, on the same browser.
    query<{ type: string; name: string | null; path: string; props: Record<string, unknown>; created_at: Date; session_id: string | null; signed_in: boolean }>(
      `SELECT type, name, path, props, created_at, session_id, user_id IS NOT NULL AS signed_in FROM analytics_events
        WHERE user_id = $1
           OR visitor_id IN (SELECT DISTINCT visitor_id FROM analytics_events WHERE user_id = $1 AND visitor_id IS NOT NULL)
        ORDER BY created_at DESC, id DESC LIMIT 500`,
      [userId],
    ),
    query<{ tool: string; status: string; updated_at: Date }>(`SELECT tool, status, updated_at FROM tool_results WHERE user_id = $1 ORDER BY created_at`, [userId]),
    query<Record<string, string>>(
      `SELECT feature, count(*) AS calls, sum(prompt_tokens) AS prompt, sum(output_tokens + thought_tokens) AS output, sum(total_tokens) AS total
         FROM ai_usage WHERE user_id = $1 GROUP BY feature ORDER BY total DESC`,
      [userId],
    ),
    query<{ preferred_date: string | null; preferred_time: string | null; created_at: Date }>(
      `SELECT to_char(preferred_date, 'YYYY-MM-DD') AS preferred_date, preferred_time, created_at FROM counsellor_requests WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    ),
  ])
  return {
    user,
    events,
    tools,
    tokens: tokens.map((t) => ({ feature: t.feature, calls: n(t.calls), total: n(t.total), costInr: costInr(n(t.prompt), n(t.output)) })),
    sessions: booked,
  }
}
