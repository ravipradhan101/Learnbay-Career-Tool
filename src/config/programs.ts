// Learnbay's 13 programs (2026 catalogue, see config/catalogue.ts). Names, audiences, entry rules, syllabus and
// certificates come from the catalogue; each program links to its page on learnbay.co. The AI may only recommend
// programs from this list. Program ids are the ones the app has always used, so saved choices and links keep working;
// retired programs resolve to the program that replaced them (RETIRED_IDS).

import { CODE_TO_ID, CODING, MIN_YEARS, catalogueProgram, jobReadyLabel } from './catalogue'

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
  /** Time to job-ready ("5–6 months"), not the program's length. */
  jobReady: string
  /** Years of work experience needed to join (0 = open to freshers). */
  minYears: number
  coding: 'no' | 'some' | 'yes'
}

type Def = Omit<Program, 'id' | 'name' | 'durationMonths' | 'jobReady' | 'minYears' | 'coding'>

const DEFS: Def[] = [
  {
    code: 'AAP', interests: ['ai', 'analytics'],
    url: 'https://www.learnbay.co/artificial-intelligence/applied-ai-practitioner-program',
    summary: 'Use AI in the job you already do, without coding: AI reasoning and LLM workflows, generative and multimodal AI, Claude connectors and MCP, Claude Code for non-developers, agentic AI and automation, no-code AI apps, AIOps and a startup capstone through the AI CoLab.',
    features: ['No coding, no experience needed', 'Startup capstone through the AI CoLab', 'IBM and AI CoLab certificates, plus IIT Patna for graduates'],
    focusAreas: ['AI reasoning & LLM workflows', 'Generative & multimodal AI', 'Connectors, MCP & Claude Code', 'Agentic AI & automation', 'No-code AI apps'],
    bestFor: 'Non-tech professionals, freelancers, business owners and students who want to use AI in their own work',
  },
  {
    code: 'DABA', interests: ['analytics', 'data-science'],
    url: 'https://www.learnbay.co/artificial-intelligence/generative-ai-analytics-course',
    summary: 'Become a data or business analyst: AI reasoning and LLM workflows, AI copilots for analysts (Claude, Claude Code, Copilot and MCP), generative and multimodal AI, agentic AI and no-code automation, then Excel, SQL, Power BI and Tableau, with a startup capstone.',
    features: ['Open to any graduate, no coding needed', 'Domain specialisation and a startup capstone', 'IBM, IIT Patna and AI CoLab certificates'],
    focusAreas: ['AI & LLM workflows', 'Agentic AI & no-code automation', 'Excel', 'SQL', 'Power BI & Tableau'],
    bestFor: 'Graduates of any stream, career-gap returnees and non-tech professionals moving into analyst roles',
  },
  {
    code: 'DSG-C', interests: ['data-science', 'ai'],
    url: 'https://www.learnbay.co/data-science-genai-program',
    summary: 'Data science with GenAI: Python, AI-assisted data work with Claude Code, Copilot and MCP, ML and deep-learning foundations, generative AI with RAG and LangChain, agentic AI, statistics and machine learning, advanced ML and NLP, Power BI and Tableau, SQL and MongoDB, and big data with Hadoop and PySpark.',
    features: ['Open to freshers; Python taught from scratch', '15+ projects and 2 capstones', 'IBM certificate'],
    focusAreas: ['Python', 'Generative AI, RAG & agents', 'Statistics & machine learning', 'SQL, MongoDB, Power BI & Tableau', 'Big data: Hadoop & PySpark'],
    bestFor: 'CS, IT, engineering or maths graduates, and analysts moving into data science and ML',
  },
  {
    code: 'DSG-M', interests: ['data-science'],
    url: 'https://www.learnbay.co/datascience/data-science-and-ai-master-certification-program',
    summary: 'The full data science and GenAI path: Python, AI-assisted data work with Claude Code, Copilot and MCP, ML and deep-learning foundations, advanced GenAI and agentic AI, statistics, advanced data science (ML, NLP, time series), MLOps and cloud deployment, SQL, MongoDB, Power BI and Tableau, big data, project management and optional DSA, with two specialisations.',
    features: ['For 1+ year of experience; Python taught from scratch', 'Two specialisations: Developers, Managers & Leaders, Cloud & DevOps, BFSI, Healthcare, Manufacturing & Supply Chain, E-commerce & Retail', 'IBM, Microsoft Azure, IIT Patna and AI CoLab project certificates'],
    focusAreas: ['Generative & agentic AI', 'Advanced data science', 'MLOps & cloud deployment', 'Analytics tools & big data', 'Domain specialisations'],
    bestFor: 'Working professionals in tech, analytics or engineering, and domain specialists, aiming for data scientist, ML or AI roles',
  },
  {
    code: 'GAI-SD', interests: ['ai'],
    url: 'https://www.learnbay.co/artificial-intelligence/genai-software-developers',
    summary: 'GenAI for working developers: Python for GenAI, Claude Code, GitHub Copilot and MCP, ML and transformer foundations, advanced GenAI (LangChain, RAG, LlamaIndex, Hugging Face, Azure OpenAI), agentic AI (AutoGen, CrewAI, LangGraph, MCP, AWS Bedrock), LLMOps and deployment, and GenAI for software developers.',
    features: ['For developers with 1+ year', 'Specialisation: GenAI & agentic AI for software developers', 'IBM GenAI certificate'],
    focusAreas: ['LLM engineering & RAG', 'Agentic AI: AutoGen, CrewAI, LangGraph, MCP', 'LLMOps & deployment', 'AI system design for developers'],
    bestFor: 'Software developers (1–5 years) and QA automation engineers who code daily and want GenAI engineering roles',
  },
  {
    code: 'AIE', interests: ['ai'],
    url: 'https://www.learnbay.co/ai-engineering-master-program',
    summary: 'A 9-month master for developers who want to become AI Engineers: Python for GenAI, Claude Code, GitHub Copilot and MCP, ML and transformer foundations, advanced GenAI (LangChain, RAG, LlamaIndex, Hugging Face, fine-tuning), agentic AI (AutoGen, CrewAI, LangGraph, MCP, A2A), LLMOps and production reliability, and AI system architecture and platform engineering.',
    features: ['For developers with 1+ year who code daily', 'AI system architecture & platform engineering', 'Specialisation: GenAI & agentic AI for software developers & SDE', 'IBM + Microsoft Azure + IIT Patna certificates'],
    focusAreas: ['LLM engineering & RAG', 'Agentic AI: AutoGen, CrewAI, LangGraph, MCP', 'LLMOps & production reliability', 'AI system architecture & platform engineering'],
    bestFor: 'Software developers (1+ year) who code daily and want to become AI Engineers, building and running production GenAI systems',
  },
  {
    code: 'SDE-M', interests: ['ai'],
    url: 'https://www.learnbay.co/artificial-intelligence/sde-master-program-genai-agentic-ai',
    summary: 'Product-company SDE plus GenAI: Python for GenAI, Claude Code, GitHub Copilot and MCP, ML foundations, advanced GenAI and agentic AI, LLMOps, then data structures and algorithms and system design, with two specialisations.',
    features: ['For developers with 1+ year', 'DSA, system design and GenAI & agentic AI', 'IBM, Microsoft Azure, IIT Patna and AI CoLab project certificates'],
    focusAreas: ['GenAI & agentic AI', 'Data structures & algorithms', 'System design', 'Interview preparation'],
    bestFor: 'Developers in service companies who want SDE roles at product companies, or keep failing DSA and system-design rounds',
  },
  {
    code: 'FDE-M', interests: ['fde', 'ai'],
    url: 'https://www.learnbay.co/artificial-intelligence/forward-deployed-engineer-course',
    summary: 'Become a Forward Deployed AI Engineer: a no-code GenAI foundation, Claude Code, GitHub Copilot and MCP, Python for AI, software engineering for FDE (APIs, Git, SQL, FastAPI), AI foundations, GenAI and LLM engineering, advanced enterprise RAG, agentic AI, cloud, LLMOps and AIOps, AI system design and client solution engineering, then an elective and capstones.',
    features: ['For IT professionals with 1+ year who code', 'Elective: Software & SaaS, Data & Analytics, or Cloud & Enterprise', 'IBM, Microsoft Azure, IIT Patna and AI CoLab project certificates'],
    focusAreas: ['Enterprise RAG', 'Agentic AI engineering', 'Cloud, LLMOps & AIOps', 'AI system design', 'Client solution engineering'],
    bestFor: 'Backend, full-stack, data, ML, solutions and cloud engineers who want to build and deploy AI with clients',
  },
  {
    code: 'GAI-M', interests: ['ai'],
    url: 'https://www.learnbay.co/genai-and-agentic-ai-master-program',
    summary: 'The broad GenAI master for tech and non-tech professionals (Python taught from scratch): Python for GenAI, Claude Code, GitHub Copilot and MCP, ML and transformer foundations, advanced GenAI (LangChain, RAG, LlamaIndex, Hugging Face, Stable Diffusion, Azure OpenAI), agentic AI and automation (AutoGen, CrewAI, LangGraph, MCP, A2A, AWS Bedrock), LLMOps and responsible AI, then two specialisations.',
    features: ['For tech and non-tech professionals with 1+ year; no coding background needed', 'Pick 2 specialisations: Software Developers, Managers & Leaders, Cloud & DevOps, BFSI, Healthcare, Manufacturing & Supply Chain, E-commerce & Retail', 'IBM, Microsoft Azure, IIT Patna and AI CoLab project certificates'],
    focusAreas: ['Python for GenAI', 'Advanced GenAI & RAG', 'Agentic AI & automation', 'LLMOps & deployment', 'Role or domain specialisations'],
    bestFor: 'Tech professionals (developers, QA, data, cloud) and domain professionals or engineers who want to build GenAI and agents with a role or industry specialisation; coding is taught from scratch',
  },
  {
    code: 'GAI-CD', interests: ['cloud-devops', 'ai'],
    url: 'https://www.learnbay.co/genai-agentic-ai-for-cloud-devops',
    summary: 'GenAI for cloud and DevOps engineers: Python for GenAI, Claude Code, Copilot and MCP for infrastructure work, ML and transformer foundations, advanced GenAI and RAG, agentic AI and automation, LLMOps and deployment, and a GenAI specialisation for cloud and DevOps (AI for DevOps workflows, monitoring and incident resolution).',
    features: ['For cloud/DevOps engineers with 1+ year', 'Specialisation: GenAI & agentic AI for Cloud & DevOps', 'IBM GenAI certificate'],
    focusAreas: ['Advanced GenAI & RAG', 'Agentic AI & automation', 'LLMOps & deployment', 'AI for DevOps & incident response'],
    bestFor: 'Cloud, DevOps, SRE and platform engineers already working on AWS/Azure, CI/CD and Kubernetes',
  },
  {
    code: 'CD', interests: ['cloud-devops'],
    url: 'https://www.learnbay.co/cloud-and-devops/advanced-cloud-computing-and-devops-program',
    summary: 'Move from IT into cloud and DevOps through your own role track: cloud basics and Linux, Python for cloud, Claude Code, Copilot and MCP for infrastructure work, AWS Cloud Practitioner and Solutions Architect, optional Azure, DevOps mastery, MLOps, then a specialisation for your role.',
    features: ['For IT professionals with 1+ year who can code or script', 'Role track: IT Support & ITOps, System Admin, Network, DBA or QA & Test', 'Microsoft Azure certificate'],
    focusAreas: ['Linux & Python for cloud', 'AWS & Azure', 'DevOps: CI/CD, Docker, Kubernetes, Terraform', 'MLOps'],
    bestFor: 'IT support, system admins, network engineers, DBAs, QA engineers and developers moving into cloud and DevOps',
  },
  {
    code: 'CD-M', interests: ['cloud-devops'],
    url: 'https://www.learnbay.co/cloud-and-devops/ai-powered-cloud-devops-masters-certification',
    summary: 'The cloud and DevOps master: cloud basics and Linux, Python, Claude Code, Copilot and MCP for infrastructure work, AWS Practitioner to Solutions Architect, Azure, cloud system design, DevOps mastery, DevSecOps and cloud security, multicloud, MLOps and GenAI for cloud and DevOps, then two role specialisations.',
    features: ['For IT professionals with 1+ year who can code or script', 'Two specialisations: IT & ITOps, System Admin, Network, DBA', 'IBM, Microsoft Azure, IIT Patna and AI CoLab project certificates'],
    focusAreas: ['AWS & Azure architecture', 'Cloud system design', 'DevOps & DevSecOps', 'Multicloud & MLOps', 'GenAI for cloud & DevOps'],
    bestFor: 'Infra, DevOps and developer professionals aiming for cloud architect, platform, DevSecOps or SRE roles',
  },
  {
    code: 'AIL', interests: ['ai'],
    url: 'https://www.learnbay.co/genai-agentic-ai-managers-leaders',
    summary: 'GenAI and agentic AI for managers and leaders (Python taught from scratch): Python for GenAI, Claude, Claude Code and MCP for managers, ML and transformer foundations, generative AI for managers (prompting, LLMs, RAG, LangChain), agentic AI (AutoGen, CrewAI, LangGraph, MCP), GenAI for digital business transformation and GenAI for project management (Agile, Jira), with two capstones.',
    features: ['For 2+ years with people, project or business responsibility; no coding background needed', 'GenAI for business transformation and project management', 'IBM GenAI certificate'],
    focusAreas: ['Python for GenAI', 'Generative AI for managers', 'Agentic AI', 'GenAI for business transformation', 'GenAI for project management'],
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
  return { ...d, id: CODE_TO_ID[d.code], name: c.name, durationMonths: c.durationMonths, jobReady: jobReadyLabel(d.code), minYears: MIN_YEARS[d.code] ?? 1, coding: CODING[d.code] ?? 'some' }
})

/** Programs that were retired or merged (2026 catalogue) → the program that replaced them. */
export const RETIRED_IDS: Record<string, string> = {
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
