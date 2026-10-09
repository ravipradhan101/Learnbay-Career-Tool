// Regression test: 50 unusual and everyday profiles. For each one it checks the recommended program (Learnbay's course
// map and entry rules), the work profile we detect (which decides the projects they see), and that their profile has
// at least 5 projects, at least one in the recommended program. Run it whenever the routing rules, the catalogue,
// the profiles or db/profile-projects.json change.  Usage: npm run test:profiles
import { stripTypeScriptTypes } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

process.removeAllListeners('warning')
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const out = mkdtempSync(path.join(tmpdir(), 'lb-profiles-'))
copyFileSync(path.join(root, 'src/config/catalogue.json'), path.join(out, 'catalogue.json'))
const files = [['config/catalogue.ts', 'catalogue'], ['config/programs.ts', 'programs'], ['lib/questions.ts', 'questions'], ['config/map-questions.ts', 'map-questions'], ['lib/lead-match.ts', 'lead-match'], ['config/profiles.ts', 'profiles']]
for (const [src, name] of files) {
  let code = stripTypeScriptTypes(readFileSync(path.join(root, 'src', src), 'utf8'), { mode: 'strip' })
  code = code.replace(/from '(?:@\/config\/|@\/lib\/|\.\/)([a-z-]+)'/g, (m, n) => `from './${n}.mjs'`)
    .replace(/import data from '\.\/catalogue\.json'/, "import data from './catalogue.json' with { type: 'json' }")
  writeFileSync(path.join(out, `${name}.mjs`), code)
}
const load = (n) => import(pathToFileURL(path.join(out, `${n}.mjs`)).href)
const { pathFor } = await load('lead-match')
const { profilesFor } = await load('profiles')
const { CODE_TO_ID } = await load('catalogue')
const library = JSON.parse(readFileSync(path.join(root, 'db/profile-projects.json'), 'utf8')).profiles
const LEVEL_PROGRAMS = {
  nocode: ['applied-ai-practitioner'], lead: ['genai-agentic-ai-managers-leaders', 'applied-ai-practitioner'],
  analytics: ['data-business-analytics-genai', 'data-science-genai-program'], build: ['genai-agentic-ai-master'],
  ml: ['data-science-genai-master', 'ms-cs-data-science-ai', 'data-science-genai-program'],
  cloud: ['cloud-devops-engineering', 'cloud-devops-network', 'ai-cloud-devops-master'],
}

const w = (experience, roleOther, domain, programmer, interest = 'ai', extra = {}) => ({ experience, role: 'other', roleOther, domain, programmer, interest, goal: 'switch', ...extra })
// [name, answers, recommended program(s) allowed, expected work profile (or null when none is expected)]
const CASES = [
  // Engineering and industry
  ['Robotics OLP engineer, some code', w('6-9', 'Senior Robotics & Offline Programming Engineer', 'manufacturing', 'some', 'ai', { toolsUsed: 'ABB RobotStudio, Process Simulate' }), ['GAI-M'], 'robotics-automation'],
  ['Robotics engineer, no code', w('6-9', 'Robot programmer (paint shop)', 'manufacturing', 'no'), ['GAI-M'], 'robotics-automation'],
  ['PLC automation engineer', w('3-5', 'PLC Automation Engineer', 'manufacturing', 'some'), ['GAI-M'], 'robotics-automation'],
  ['Mechanical design engineer', w('3-5', 'Mechanical Design Engineer (CAD)', 'manufacturing', 'no'), ['GAI-M'], 'mechanical-design'],
  ['Production engineer', w('6-9', 'Production Engineer', 'manufacturing', 'no'), ['GAI-M'], 'production-process'],
  ['Quality engineer, auto parts', w('3-5', 'Quality Engineer', 'manufacturing', 'no'), ['GAI-M'], 'quality-engineer'],
  ['Maintenance engineer', w('6-9', 'Maintenance Engineer', 'manufacturing', 'no'), ['GAI-M'], 'maintenance-reliability'],
  ['Electrical engineer, power utility', w('6-9', 'Electrical Engineer', 'other', 'no', 'ai', { domainOther: 'Power utility' }), ['GAI-M'], 'electrical-energy'],
  ['Embedded firmware engineer', w('3-5', 'Embedded Firmware Engineer', 'product', 'yes'), ['GAI-SD', 'GAI-M', 'SDE-M'], 'electronics-hardware'],
  ['Civil site engineer', w('3-5', 'Civil site engineer', 'other', 'no', 'ai', { domainOther: 'Construction' }), ['DABA', 'AAP', 'GAI-M'], 'civil-construction'],
  ['Automotive service advisor', w('3-5', 'Service Advisor at car dealership', 'other', 'no', 'ai', { domainOther: 'Automobile dealership' }), ['DABA', 'AAP', 'GAI-M'], 'automotive-mobility'],
  ['Telecom NOC engineer, no code, cloud', w('3-5', 'NOC Engineer', 'telecom', 'no', 'cloud-devops'), ['GAI-M'], 'telecom-network'],
  ['Telecom RF engineer, scripts, cloud', w('3-5', 'RF Engineer', 'telecom', 'some', 'cloud-devops'), ['CD', 'CD-M'], 'telecom-network'],
  // Healthcare and science
  ['Pharma QA officer', w('3-5', 'QA Officer (GMP)', 'healthcare', 'no', 'ai', { workProblem: 'deviation reports take too long' }), ['DABA', 'AAP', 'GAI-M'], 'pharma-qa-regulatory'],
  ['Doctor', w('6-9', 'Doctor (MBBS)', 'healthcare', 'no'), ['DABA', 'AAP', 'GAI-M'], 'clinical-healthcare'],
  ['Staff nurse', w('3-5', 'Staff Nurse', 'healthcare', 'no', 'ai', { goal: 'upskill' }), ['AAP', 'DABA'], 'clinical-healthcare'],
  ['Research scientist, biotech', w('3-5', 'Research Scientist', 'healthcare', 'some'), ['GAI-M', 'DSG-M'], 'research-lab'],
  // Finance and business
  ['Chartered accountant', w('6-9', 'Chartered Accountant', 'bfsi', 'no'), ['DABA', 'AAP', 'GAI-M'], 'chartered-accountant'],
  ['Bank credit manager', w('6-9', 'Credit Analyst', 'bfsi', 'no'), ['DABA', 'AAP', 'GAI-M'], 'banking-credit-risk'],
  ['Insurance claims executive', w('3-5', 'Claims Executive', 'bfsi', 'no'), ['DABA', 'AAP', 'GAI-M'], 'insurance'],
  ['Sales executive', { experience: '3-5', role: 'sales', programmer: 'no', interest: 'ai', goal: 'upskill' }, ['AAP', 'DABA'], 'sales-bd'],
  ['Digital marketer', { experience: '3-5', role: 'marketing', programmer: 'no', interest: 'ai', goal: 'upskill' }, ['AAP', 'DABA'], 'marketing-digital'],
  ['HR recruiter', { experience: '3-5', role: 'hr', programmer: 'no', interest: 'ai', goal: 'upskill' }, ['AAP', 'DABA'], 'hr-recruitment'],
  ['Supply chain planner', { experience: '6-9', role: 'operations', roleOther: undefined, programmer: 'no', interest: 'analytics', goal: 'switch' }, ['DABA'], 'supply-chain'],
  ['E-commerce category manager', w('6-9', 'Category Manager', 'retail', 'no'), ['DABA', 'AAP', 'GAI-M', 'AIL'], 'retail-ecommerce-ops'],
  ['Customer support lead (BPO)', w('3-5', 'Customer Support Executive (BPO)', 'it-services', 'no'), ['DABA', 'AAP'], 'customer-support'],
  ['Lawyer', w('6-9', 'Lawyer', 'other', 'no', 'ai', { domainOther: 'Law firm', goal: 'upskill' }), ['AAP', 'DABA'], 'legal-compliance'],
  ['Company secretary', w('3-5', 'Company Secretary', 'bfsi', 'no'), ['DABA', 'AAP', 'GAI-M'], 'legal-compliance'],
  ['School teacher', { experience: '6-9', role: 'teacher', programmer: 'no', interest: 'ai', goal: 'upskill' }, ['AAP', 'DABA'], 'teacher-trainer'],
  ['Journalist', w('3-5', 'Journalist', 'other', 'no', 'ai', { domainOther: 'News media', goal: 'upskill' }), ['AAP', 'DABA'], 'content-media'],
  ['UI/UX designer', { experience: '3-5', role: 'designer', programmer: 'no', interest: 'ai', goal: 'upskill' }, ['AAP', 'DABA'], 'designer-creative'],
  ['Project manager, IT services', { experience: '10-15', role: 'project-manager', programmer: 'no', interest: 'ai', domain: 'it-services' }, ['AIL'], 'project-program-manager'],
  ['Management consultant', { experience: '6-9', role: 'consultant', programmer: 'no', interest: 'ai' }, ['AAP', 'DABA', 'AIL'], 'consultant-strategy'],
  ['Founder, D2C brand', w('10-15', 'Founder & CEO', 'retail', 'no'), ['AIL'], 'founder-business-owner'],
  ['Airline pilot', w('6-9', 'Commercial Pilot', 'other', 'no', 'ai', { domainOther: 'Airline' }), ['DABA', 'AAP', 'GAI-M'], 'aviation'],
  ['Hotel front office manager', w('6-9', 'Front Office Executive', 'other', 'no', 'ai', { domainOther: 'Hotel', goal: 'upskill' }), ['AAP', 'DABA'], 'hospitality-travel'],
  ['Government officer', w('10-15', 'Section Officer', 'government', 'no', 'ai', { goal: 'upskill' }), ['AAP', 'DABA', 'AIL'], 'government-public'],
  ['Agri-business executive', w('3-5', 'Agri Business Executive', 'other', 'no', 'ai', { domainOther: 'Agriculture' }), ['DABA', 'AAP', 'GAI-M'], 'agriculture'],
  // Tech, edge cases and entry rules
  ['RPA developer', w('3-5', 'RPA Developer (UiPath)', 'it-services', 'yes'), ['GAI-SD', 'GAI-M', 'SDE-M'], null],
  ['Test automation engineer', w('3-5', 'Test Automation Engineer', 'it-services', 'some'), ['GAI-M', 'CD', 'CD-M'], null],
  ['Sysadmin, scripts, cloud', { experience: '6-9', role: 'sysadmin', programmer: 'some', interest: 'cloud-devops' }, ['CD', 'CD-M'], null],
  ['Sysadmin, no code, cloud', { experience: '6-9', role: 'sysadmin', programmer: 'no', interest: 'cloud-devops' }, ['GAI-M'], null],
  ['Developer wants FDE', { experience: '3-5', role: 'software-engineer', programmer: 'yes', interest: 'fde' }, ['FDE-M'], null],
  ['Marketer wants FDE', { experience: '3-5', role: 'marketing', programmer: 'no', interest: 'fde' }, ['AAP', 'DABA'], 'marketing-digital'],
  ['Non-graduate freelancer', { experience: '1-2', role: 'other', roleOther: 'Freelance video editor', eduLevel: 'diploma', programmer: 'no', interest: 'ai' }, ['AAP'], 'content-media'],
  ['Final-year mechanical student', { experience: '0', studyStage: 'final-year', roleOther: 'Mechanical engineering student', programmer: 'some', interest: 'ai' }, ['AAP'], null],
  ['Fresher B.Com', { experience: '0', studyStage: 'job-hunting', programmer: 'no', interest: 'analytics' }, ['DABA', 'AAP'], null],
  ['Career-break HR returnee', { experience: '3-5', role: 'hr', programmer: 'no', interest: 'ai', trigger: 'career-break' }, ['DABA', 'DSG-C'], 'hr-recruitment'],
  ['Manufacturing plant head', w('15+', 'Plant Head', 'manufacturing', 'no'), ['AIL'], null],
  ['Data analyst who codes daily (map: data pro → FDE first)', { experience: '6-9', role: 'data-analyst', programmer: 'yes', interest: 'ai' }, ['FDE-M', 'DSG-M', 'GAI-M'], null],
]

let pass = 0
const failures = []
for (const [name, raw, allowed, profile] of CASES) {
  const a = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined))
  const p = pathFor(a)
  const rec = p.options[0]
  const mine = profilesFor(a)
  const problems = []
  if (!allowed.includes(rec.code)) problems.push(`recommended ${rec.code}, expected ${allowed.join(' or ')}`)
  if (a.programmer === 'no' && ['CD', 'CD-M', 'GAI-CD', 'FDE-M', 'SDE-M', 'GAI-SD'].includes(rec.code)) problems.push(`non-coder sent to ${rec.code}`)
  if (profile && !mine.includes(profile)) problems.push(`profile ${mine.join(', ') || 'none'}, expected ${profile}`)
  if (profile) {
    const projects = library[profile] ?? []
    if (projects.length < 5) problems.push(`only ${projects.length} projects for ${profile}`)
    const programId = CODE_TO_ID[rec.code]
    const inCourse = projects.filter((x) => LEVEL_PROGRAMS[x.level]?.includes(programId)).length
    if (!inCourse && !['AIL'].includes(rec.code)) problems.push(`no ${profile} project in ${rec.code}`)
  }
  if (problems.length) failures.push(`FAIL ${name}: ${problems.join('; ')}`)
  else pass++
}
for (const f of failures) console.log(f)
console.log(`\n${pass} passed, ${failures.length} failed (${CASES.length} profiles)`)
process.exitCode = failures.length ? 1 : 0
