// Learnbay's 13 programs (2026 catalogue, see config/catalogue.ts). Names, audiences, entry rules, syllabus and
// certificates come from the catalogue; each program links to its page on learnbay.co. The AI may only recommend
// programs from this list. Program ids are the ones the app has always used, so saved choices and links keep working;
// retired programs resolve to the program that replaced them (RETIRED_IDS).

import { CODE_TO_ID, CODING, MIN_YEARS, catalogueProgram } from './catalogue'

export type Program = {
  id: string
  /** Catalogue code (AAP, DABA, GAI-M…). */
  code: string
  interests: string[]
  name: string
  url: string
  summary: string
  features: string[]
  focusAreas: string[]
  bestFor: string
  durationMonths: number | null
  /** Years of work experience needed to join (0 = open to freshers). */
  minYears: number
  coding: 'no' | 'some' | 'yes'
}

type Def = Omit<Program, 'id' | 'name' | 'durationMonths' | 'minYears' | 'coding'>

const DEFS: Def[] = [
  {
    code: 'AAP', interests: ['ai', 'analytics'],
    url: 'https://www.learnbay.co/artificial-intelligence/applied-ai-practitioner-program',
    summary: 'Use AI in the job you already do, without coding: prompting, AI content, Claude connectors and MCP, Claude Code for non-developers, agents and automation, a function track and a startup capstone.',
    features: ['No coding, no experience needed', 'Function track: Marketing, Sales, HR or Finance & Ops', 'IBM, IIT Patna and AI CoLab certificates'],
    focusAreas: ['Prompting & context engineering', 'AI content (image, video, voice)', 'Connectors & MCP', 'Claude Code for non-developers', 'Agents & workflow automation'],
    bestFor: 'Non-tech professionals, freelancers, business owners and students who want to use AI in their own work',
  },
  {
    code: 'DABA', interests: ['analytics', 'data-science'],
    url: 'https://www.learnbay.co/artificial-intelligence/generative-ai-analytics-course',
    summary: 'Become a data or business analyst: Excel with Copilot, statistics, SQL, Python for analysts, Power BI and Tableau, then GenAI and agents for analytics, with a domain track and a startup capstone.',
    features: ['Open to any graduate, no coding needed', 'Domain track: Marketing, HR, Finance & BFSI, Supply Chain or Product', 'IBM, IIT Patna and AI CoLab certificates'],
    focusAreas: ['Excel & Copilot', 'Statistics & A/B testing', 'SQL', 'Power BI & Tableau', 'GenAI & agents for analytics'],
    bestFor: 'Graduates of any stream, career-gap returnees and non-tech professionals moving into analyst roles',
  },
  {
    code: 'DSG-C', interests: ['data-science', 'ai'],
    url: 'https://www.learnbay.co/data-science-genai-program',
    summary: 'Start in data science: Python, statistics, machine learning, SQL and BI, deep learning, GenAI with RAG, agentic AI and PySpark, ending with one ML and one GenAI capstone.',
    features: ['Open to freshers; Python taught from scratch', 'Two capstones: classic ML and GenAI', 'IBM and IIT Patna certificates'],
    focusAreas: ['Python', 'Statistics', 'Machine learning', 'Deep learning & NLP', 'GenAI, RAG & agents'],
    bestFor: 'CS, IT, engineering or maths graduates, and analysts moving into data science and ML',
  },
  {
    code: 'DSG-M', interests: ['data-science'],
    url: 'https://www.learnbay.co/datascience/data-science-and-ai-master-certification-program',
    summary: 'The full data science and AI path for working professionals: ML, deep learning, GenAI and agents, computer vision and MLOps/LLMOps, with two domain electives and four capstones.',
    features: ['For 1+ year of experience', 'Two domain electives: BFSI, Retail, Manufacturing & Supply Chain, Healthcare & Pharma', 'IBM, Microsoft, IIT Patna and 2 AI CoLab certificates'],
    focusAreas: ['Machine learning', 'Deep learning & computer vision', 'GenAI, RAG & agents', 'MLOps & LLMOps', 'Domain AI'],
    bestFor: 'Working professionals in tech, analytics or engineering, and domain specialists, aiming for data scientist, ML or AI roles',
  },
  {
    code: 'GAI-SD', interests: ['ai'],
    url: 'https://www.learnbay.co/artificial-intelligence/genai-software-developers',
    summary: 'For working developers: AI-engineering Python, Claude Code and Copilot, LLM engineering and RAG, agentic AI with MCP and A2A, LLMOps, evals and guardrails, and AI system design.',
    features: ['For developers with 1+ year', 'Developer-only: no beginner modules', 'IBM and Microsoft Azure AI Fundamentals'],
    focusAreas: ['LLM engineering & RAG', 'Agentic AI, MCP & A2A', 'LLMOps, evals & guardrails', 'AI system design'],
    bestFor: 'Software developers (1–5 years) and QA automation engineers who code daily and want GenAI engineering roles',
  },
  {
    code: 'SDE-M', interests: ['ai'],
    url: 'https://www.learnbay.co/artificial-intelligence/sde-master-program-genai-agentic-ai',
    summary: 'Crack product-company interviews: DSA in Java, C++ or Python, low- and high-level system design, then the GenAI developer core, electives and a mock-interview sprint.',
    features: ['For developers with 1+ year', 'DSA and system design first, then GenAI', 'IBM, Microsoft, IIT Patna and AI CoLab certificates'],
    focusAreas: ['DSA', 'LLD & HLD system design', 'GenAI & agentic AI', 'Interview preparation'],
    bestFor: 'Developers in service companies who want SDE roles at product companies, or keep failing DSA and system-design rounds',
  },
  {
    code: 'FDE-M', interests: ['fde', 'ai'],
    url: 'https://www.learnbay.co/artificial-intelligence/forward-deployed-engineer-course',
    summary: 'Become a Forward Deployed AI Engineer: Python and software engineering for FDE, LLM engineering, advanced enterprise RAG, agentic AI, cloud and LLMOps, AI system design and client solution engineering.',
    features: ['For engineers with 1+ year who code', 'Elective: Software & SaaS, Data & Analytics, or Cloud & Enterprise', 'IBM, Microsoft, IIT Patna and 2 AI CoLab certificates'],
    focusAreas: ['Enterprise RAG', 'Agentic AI engineering', 'Cloud, LLMOps & AIOps', 'AI system design', 'Client solution engineering'],
    bestFor: 'Backend, full-stack, data, ML, solutions and cloud engineers who want to build and deploy AI with clients',
  },
  {
    code: 'GAI-M', interests: ['ai'],
    url: 'https://www.learnbay.co/genai-and-agentic-ai-master-program',
    summary: 'The broad GenAI master for tech and domain professionals (Python taught from scratch): Python for GenAI, Claude Code and MCP, ML and transformers, LLMs and RAG, agentic AI, LLMOps and responsible AI, then two specialisations you pick after the core.',
    features: ['For tech and domain professionals with 1+ year; no coding background needed', 'Pick 2 of 7 specialisations: Developers, Cloud & DevOps, QA & Test, BFSI, Retail, Manufacturing, Healthcare', 'IBM, Microsoft, IIT Patna and 2 AI CoLab certificates'],
    focusAreas: ['LLM engineering & RAG', 'Agentic AI & automation', 'LLMOps', 'Responsible AI', 'Role or domain specialisations'],
    bestFor: 'Tech professionals (developers, QA, data, cloud) and domain professionals or engineers who want to build GenAI and agents with a role or industry specialisation; coding is taught from scratch',
  },
  {
    code: 'GAI-CD', interests: ['cloud-devops', 'ai'],
    url: 'https://www.learnbay.co/genai-agentic-ai-for-cloud-devops',
    summary: 'AI for people who already run cloud: Claude Code and Copilot for infrastructure, RAG over runbooks and logs, agents for operations, LLM serving on Kubernetes and AI FinOps.',
    features: ['For cloud/DevOps engineers with 1+ year', 'Agents, LLMOps and AI infrastructure', 'IBM GenAI certificate'],
    focusAreas: ['AI for infrastructure', 'RAG over runbooks', 'Agentic AI for operations', 'LLM serving on Kubernetes', 'AI FinOps'],
    bestFor: 'Cloud, DevOps, SRE and platform engineers already working on AWS/Azure, CI/CD and Kubernetes',
  },
  {
    code: 'CD', interests: ['cloud-devops'],
    url: 'https://www.learnbay.co/cloud-and-devops/advanced-cloud-computing-and-devops-program',
    summary: 'Move from IT into cloud and DevOps through your own role track: Linux, AWS to Solutions Architect Associate, Azure Administrator, the DevOps toolchain, AIOps, then four capstones for your role.',
    features: ['For IT professionals with 1+ year', 'Role track: IT Support & ITOps, System Admin, Network, DBA, QA & Test, or General IT & Developers', 'Microsoft Azure certification track'],
    focusAreas: ['Linux & scripting', 'AWS & Azure', 'Docker, Kubernetes & Terraform', 'CI/CD & monitoring', 'AIOps'],
    bestFor: 'IT support, system admins, network engineers, DBAs, QA engineers and developers moving into cloud and DevOps',
  },
  {
    code: 'CD-M', interests: ['cloud-devops'],
    url: 'https://www.learnbay.co/cloud-and-devops/ai-powered-cloud-devops-masters-certification',
    summary: 'The cloud architect path: AWS and Azure architecture, GitOps, Kubernetes and platform engineering, cloud system design, DevSecOps, multicloud and FinOps, and AI for cloud with agents and LLMOps.',
    features: ['For IT professionals with 1+ year', 'One full role specialisation', 'IBM, Microsoft Azure, IIT Patna and 2 AI CoLab certificates'],
    focusAreas: ['AWS & Azure architecture', 'Kubernetes & platform engineering', 'DevSecOps', 'Multicloud & FinOps', 'AIOps & LLMOps'],
    bestFor: 'Infra, DevOps and developer professionals aiming for cloud architect, platform, DevSecOps or SRE roles',
  },
  {
    code: 'AIL', interests: ['ai'],
    url: 'https://www.learnbay.co/genai-agentic-ai-managers-leaders',
    summary: 'Lead AI adoption without coding: AI literacy, personal AI productivity, no-code agents, AI strategy and ROI, AI product and delivery management, governance and responsible AI, and an AI plan for your own organisation.',
    features: ['No coding; for 2+ years with people, project or business responsibility', 'Capstone: an AI transformation plan for your organisation', 'IBM and AI CoLab certificates'],
    focusAreas: ['AI strategy & ROI', 'No-code agents', 'AI product & delivery', 'AI governance & risk', 'Leading AI transformation'],
    bestFor: 'Managers, team and delivery leads, MBAs in manager roles, business heads and founders who lead AI adoption',
  },
  {
    code: 'MCS', interests: ['data-science'],
    url: 'https://www.learnbay.co/datascience/data-science-and-ai-masters-in-cs',
    summary: "A Master's degree in Computer Science (Data Science & AI) via Woolf University, for graduates who need a formal degree for promotion, HR policy or immigration.",
    features: ["Master's degree via Woolf University (90 ECTS)", "Needs a bachelor's degree with 60%+", 'Specialise in Data Science & Analytics, or AI & ML'],
    focusAreas: ['Python', 'Statistics & ML', 'Data Science & Analytics or AI & ML'],
    bestFor: "Graduates with 60%+ who need a formal master's degree",
  },
]

export const PROGRAMS: Program[] = DEFS.map((d) => {
  const c = catalogueProgram(d.code)!
  return { ...d, id: CODE_TO_ID[d.code], name: c.name, durationMonths: c.durationMonths, minYears: MIN_YEARS[d.code] ?? 1, coding: CODING[d.code] ?? 'some' }
})

/** Programs that were retired or merged (2026 catalogue) → the program that replaced them. */
export const RETIRED_IDS: Record<string, string> = {
  'ai-engineering-master': 'forward-deployed-ai-engineer',
  'genai-agentic-ai-program': 'genai-agentic-ai-master',
  'advanced-cloud-devops': 'cloud-devops-engineering',
  'cloud-devops-network': 'cloud-devops-engineering',
  'cloud-devops-qa-testers': 'cloud-devops-engineering',
  'cloud-devops-sysadmin': 'cloud-devops-engineering',
  'cloud-devops-it-support-ops': 'cloud-devops-engineering',
  'cloud-devops-dba': 'cloud-devops-engineering',
}

export function resolveProgramId(id: string | null | undefined): string | undefined {
  if (!id) return undefined
  const now = RETIRED_IDS[id] ?? id
  return PROGRAMS.some((p) => p.id === now) ? now : undefined
}

export function getProgram(id: string | null | undefined): Program {
  const now = resolveProgramId(id)
  return PROGRAMS.find((p) => p.id === now) ?? PROGRAMS.find((p) => p.code === 'GAI-M')!
}

export function programsForInterest(interest: string | undefined): Program[] {
  const list = PROGRAMS.filter((p) => interest && p.interests.includes(interest))
  return list.length ? list : PROGRAMS
}

/** The Cloud & DevOps role track that matches their job (the program has one track per IT role). */
export const CLOUD_TRACK: Record<string, { track: string; url: string }> = {
  'it-support': { track: 'IT Support & ITOps', url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-it-support-and-it-operations' },
  sysadmin: { track: 'System Admin', url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-system-administrators' },
  'network-admin': { track: 'Network', url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-network-professionals' },
  dba: { track: 'DBA', url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-database-administrators' },
  'qa-engineer': { track: 'QA & Test', url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-qa-and-software-test-engineers' },
}
export const cloudTrackFor = (role: string | undefined) => (role && CLOUD_TRACK[role]) || { track: 'General IT & Developers', url: DEFS.find((d) => d.code === 'CD')!.url }

/** The flagship program for a track picked on the start screen. */
export function programFor(interest: string | null | undefined): Program | undefined {
  const flagship: Record<string, string> = { ai: 'GAI-M', fde: 'FDE-M', 'cloud-devops': 'CD', 'data-science': 'DSG-C', analytics: 'DABA' }
  const code = interest ? flagship[interest] : undefined
  return (code ? PROGRAMS.find((p) => p.code === code) : undefined) ?? programsForInterest(interest ?? undefined)[0]
}
