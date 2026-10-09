// Work profiles: the kinds of people who come to Learnbay, finer than the lead types of the course map. Each profile
// has its own projects in the library (projects.profiles), so a robotics engineer sees robot and paint-shop projects
// and a chartered accountant sees audit and GST ones, whatever program they join. A learner is matched by their own
// words first (typed role, industry, tools, the problem they want AI to solve), then their role and industry.
// Add a profile here (and its projects in db/profile-projects.json) when a new kind of learner keeps showing up.

import type { Answers } from '@/lib/questions'

export type ProfileDef = {
  key: string
  label: string
  /** Words in what they typed (role, industry, tools, problem). */
  words?: RegExp
  /** Role ids from the start questions. */
  roles?: string[]
  /** Industry ids, used only when nothing more specific matched. */
  domains?: string[]
}

export const PROFILES: ProfileDef[] = [
  // Engineering and industry
  { key: 'robotics-automation', label: 'Robotics & automation engineer', words: /robot(?!ic process)|offline program|\bolp\b|\bplc\b|scada|\bdcs\b|\bhmi\b|automation engineer|industrial automation|mechatronic|virtual commission|paint shop|robotstudio|process simulate/i },
  { key: 'mechanical-design', label: 'Mechanical & design engineer', words: /mechanical|design engineer|\bcad\b|\bcae\b|\bfea\b|\bcfd\b|solidworks|catia|creo|ansys|product design engineer|tool design/i },
  { key: 'production-process', label: 'Production & process engineer', words: /production engineer|process engineer|industrial engineer|plant engineer|manufacturing engineer|shop ?floor|lean|kaizen|\boee\b|assembly line/i, domains: ['manufacturing'] },
  { key: 'quality-engineer', label: 'Quality engineer', words: /quality (engineer|control|assurance|inspector|analyst)|\bqc\b|six sigma|\b8d\b|\bspc\b|\bcapa\b|inspection engineer|supplier quality/i },
  { key: 'maintenance-reliability', label: 'Maintenance & reliability engineer', words: /maintenance|reliability|breakdown|\bmtbf\b|condition monitoring|\bcmms\b/i },
  { key: 'electrical-energy', label: 'Electrical, power & energy engineer', words: /electrical|power plant|power system|substation|solar|renewable|energy|grid|transmission|utility|utilities|oil|gas/i },
  { key: 'electronics-hardware', label: 'Electronics, embedded & semiconductor engineer', words: /electronics|embedded|firmware|vlsi|semiconductor|pcb|hardware engineer|chip|asic|fpga/i },
  { key: 'civil-construction', label: 'Civil, construction & real estate', words: /civil|construction|site engineer|structural|architect(?! ?\(software)|quantity survey|real estate|property|builder|infrastructure project/i },
  { key: 'automotive-mobility', label: 'Automotive & mobility', words: /automotive|automobile|vehicle|\bev\b|electric vehicle|service advisor|dealership|fleet|mobility|\boem\b/i },
  { key: 'telecom-network', label: 'Telecom & network engineer', words: /telecom|\bnoc\b|\bbss\b|\boss\b|\bran\b|\brf\b|5g|4g|lte|fiber|fibre|network engineer/i, roles: ['network-admin'], domains: ['telecom'] },
  // Healthcare and science
  { key: 'pharma-qa-regulatory', label: 'Pharma QA, QC & regulatory', words: /pharma|regulatory|\bgmp\b|\bgxp\b|validation|qa\/qc|drug|formulation|batch record|cdsco|\bfda\b/i },
  { key: 'clinical-healthcare', label: 'Doctor, nurse & hospital professional', words: /doctor|physician|nurse|clinical|hospital|patient|medical officer|dentist|physio|pharmacist|healthcare/i, domains: ['healthcare'] },
  { key: 'research-lab', label: 'Scientist & lab researcher', words: /scientist|research|laborator|\blab\b|chemist|biotech|microbiolog|phd|r ?& ?d/i },
  // Finance and business
  { key: 'chartered-accountant', label: 'Accountant, CA & auditor', words: /chartered accountant|\bca\b|accountant|accounts|audit|tax|\bgst\b|tally|bookkeep|finance controller|\bcfo\b/i },
  { key: 'banking-credit-risk', label: 'Banking, credit & risk', words: /bank|credit|loan|risk|\bkyc\b|\baml\b|branch|relationship manager|treasury|nbfc|underwrit(?!.*insur)/i, roles: ['banking-finance'], domains: ['bfsi'] },
  { key: 'insurance', label: 'Insurance professional', words: /insur|claims?\b|underwrit|actuar|policy servic/i },
  { key: 'sales-bd', label: 'Sales & business development', words: /sales|business development|\bbd\b|account manager|key account|inside sales|pre-?sales|channel/i, roles: ['sales'] },
  { key: 'marketing-digital', label: 'Marketing & digital marketing', words: /marketing|seo|sem|performance market|social media|brand|campaign|growth/i, roles: ['marketing'] },
  { key: 'hr-recruitment', label: 'HR & recruitment', words: /\bhr\b|human resource|recruit|talent|people ops|payroll|l ?& ?d/i, roles: ['hr'] },
  { key: 'supply-chain', label: 'Supply chain, logistics & procurement', words: /supply chain|logistic|warehouse|procure|purchase|inventory|planning|demand plan|freight|shipping|scm/i, roles: ['operations'] },
  { key: 'retail-ecommerce-ops', label: 'Retail & e-commerce professional', words: /retail|e-?commerce|store manager|category manager|merchandis|marketplace|fmcg|d2c|catalog/i, domains: ['retail'] },
  { key: 'customer-support', label: 'Customer support & service', words: /customer (support|service|success|care)|call cent|\bbpo\b|helpdesk|service desk|\bcsr\b/i },
  { key: 'operations-admin', label: 'Operations & administration', words: /operations|admin(?!istrator)|back office|office manager|coordinator|executive assistant/i },
  { key: 'legal-compliance', label: 'Legal & compliance', words: /lawyer|legal|advocate|compliance|contract|paralegal|company secretary|\bcs\b/i },
  { key: 'teacher-trainer', label: 'Teacher, trainer & academic', words: /teacher|trainer|lecturer|professor|faculty|tutor|educat|academic|school/i, roles: ['teacher'], domains: ['education'] },
  { key: 'content-media', label: 'Content, media & communications', words: /content|writer|journalis|editor|copy|media|video|youtube|podcast|communications|\bpr\b/i, roles: ['content'] },
  { key: 'designer-creative', label: 'Designer & creative', words: /design(er)?(?! engineer)|ui|ux|graphic|illustrat|animat|creative/i, roles: ['designer'] },
  { key: 'project-program-manager', label: 'Project & program manager', words: /project manager|program manager|programme|\bpmo\b|scrum|delivery manager|\bpmp\b/i, roles: ['project-manager'] },
  { key: 'consultant-strategy', label: 'Consultant & strategy', words: /consultant|strategy|advisory|analyst \(business\)|management consult/i, roles: ['consultant'] },
  { key: 'founder-business-owner', label: 'Founder & business owner', words: /founder|owner|entrepreneur|proprietor|\bceo\b|director|family business|startup/i },
  { key: 'aviation', label: 'Aviation professional', words: /pilot|aviation|airline|cabin crew|air traffic|aircraft|\bmro\b|airport/i },
  { key: 'hospitality-travel', label: 'Hospitality & travel', words: /hotel|hospitality|travel|tourism|restaurant|chef|food ?& ?bever|front office/i },
  { key: 'government-public', label: 'Government & public sector', words: /government|govt|psu|public sector|municipal|railway|defence|defense|civil servant|ias|police/i, domains: ['government'] },
  { key: 'agriculture', label: 'Agriculture & agri-business', words: /agri|farm|crop|dairy|fisher|horticult|food process/i },
]

const byKey = new Map(PROFILES.map((p) => [p.key, p]))
export const profileLabel = (key: string) => byKey.get(key)?.label ?? key

/** The learner's own words: typed role and industry, tools they use, the problem they want AI to solve. */
export function learnerWords(a: Answers): string {
  return [a.roleOther, a.domainOther, a.toolsUsed, a.workProblem].filter(Boolean).join(' ')
}

/** Profiles that fit this learner, most specific first (their own words, then role, then industry). */
export function profilesFor(a: Answers): string[] {
  const words = learnerWords(a)
  const typed = words ? PROFILES.filter((p) => p.words?.test(words)).map((p) => p.key) : []
  const role = PROFILES.filter((p) => a.role && p.roles?.includes(a.role)).map((p) => p.key)
  const domain = typed.length || role.length ? [] : PROFILES.filter((p) => a.domain && p.domains?.includes(a.domain)).map((p) => p.key)
  return [...new Set([...typed, ...role, ...domain])].slice(0, 3)
}
