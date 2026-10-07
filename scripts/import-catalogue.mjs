// Imports Learnbay's program catalogue (learnbay_catalogue_v2.json, the data behind the Lead–Course Map) into
// src/config/catalogue.json, keeping only what learners may hear: programs, lead types, routing and the project
// library. Fees, internal review notes, brochure errata and change logs are left out on purpose.
// Usage: node scripts/import-catalogue.mjs "C:\path\to\learnbay_catalogue_v2.json"
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const src = process.argv[2]
if (!src) { console.error('Give the path to learnbay_catalogue_v2.json'); process.exit(1) }
const kb = JSON.parse(await readFile(src, 'utf8'))
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const programs = kb.programs.map((p) => ({
  code: p.id,
  name: p.name,
  family: p.family,
  tier: p.tier,
  durationMonths: p.duration_months,
  totalWeeks: p.total_weeks,
  whoFor: p.who_for,
  notFor: p.not_for,
  entry: p.entry_requirement,
  targetRoles: p.target_roles,
  certificates: p.certificates,
  modules: p.modules.map((m) => ({ name: m.name, weeks: m.weeks, topics: m.topics, projects: m.projects })),
  specialisations: p.specialisations.map((s) => ({ name: s.name, content: s.content, projects: s.projects })),
  capstones: p.capstones,
}))
const personas = kb.lead_personas.map((p) => ({
  id: p.id, group: p.group, name: p.name, signals: p.signals, pains: p.pains, primary: p.primary, why: p.why,
  upsell: p.upsell, alternative: p.alternative, avoid: p.avoid, probes: p.probe_questions, note: p.note, fdePriority: p.fde_priority,
}))
// The budget line quotes fees, which only a Senior Counsellor discusses: it stays out.
const routing = kb.routing.filter((r) => !/budget/i.test(r.question)).map((r) => ({ question: r.question, rule: r.rule }))
const projects = kb.project_library.map((x) => ({
  id: x.id, domain: x.domain, title: x.title, track: x.track, programs: x.programs, objective: x.objective, tools: x.tools, outcome: x.outcome,
}))
const retired = kb.old_to_new.filter((r) => /retire|merge/i.test(r.decision)).map((r) => ({ old: r.old, now: r.new }))

const out = { version: kb.version, generated: kb.generated, programs, personas, routing, projects, retired }
await writeFile(path.join(root, 'src/config/catalogue.json'), JSON.stringify(out, null, 1))
console.log(`catalogue ${kb.version}: ${programs.length} programs, ${personas.length} lead types, ${routing.length} routing rules, ${projects.length} projects`)
