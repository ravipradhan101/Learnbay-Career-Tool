// Learnbay program catalog. Names, URLs and features are taken from the
// Course structured data published on https://www.learnbay.co/ and program pages (checked 24 Sep 2026).
// The AI may only recommend programs from this list. Edit here when programs change.

export type Program = {
  id: string
  interests: string[]
  name: string
  url: string
  summary: string
  features: string[]
  focusAreas: string[]
  bestFor: string
}

export const PROGRAMS: Program[] = [
  {
    id: 'genai-agentic-ai-master',
    interests: ['ai'],
    name: 'GenAI & Agentic AI Master Program',
    url: 'https://www.learnbay.co/genai-and-agentic-ai-master-program',
    summary: 'For working professionals: build AI agents, RAG and LLMOps projects with career support.',
    features: ['Built for working professionals', 'AI agents, RAG & LLMOps projects', 'Career support'],
    focusAreas: ['GenAI', 'LLMs', 'AI agents', 'RAG', 'LLMOps'],
    bestFor: 'Working professionals (developers, QA, analysts) moving into GenAI and agentic AI roles',
  },
  {
    id: 'ai-engineering-master',
    interests: ['ai', 'fde'],
    name: 'AI Engineering Master Program',
    url: 'https://www.learnbay.co/ai-engineering-master-program',
    summary: 'Learn GenAI, Agentic AI, RAG and production AI through real projects.',
    features: ['GenAI & Agentic AI', 'RAG and production AI', 'Real projects'],
    focusAreas: ['GenAI', 'Agentic AI', 'RAG', 'Production AI'],
    bestFor: 'Engineers who want to build and ship production AI systems as AI Engineers',
  },
  {
    id: 'sde-genai-agentic-ai',
    interests: ['ai'],
    name: 'SDE Master Program With GenAI & Agentic AI',
    url: 'https://www.learnbay.co/artificial-intelligence/sde-master-program-genai-agentic-ai',
    summary: 'Master GenAI, Agentic AI, DSA and system design to crack top SDE roles.',
    features: ['DSA & system design', 'GenAI & Agentic AI', 'Real-world AI projects'],
    focusAreas: ['DSA', 'System design', 'GenAI', 'Agentic AI'],
    bestFor: 'Software developers targeting top SDE roles with AI skills',
  },
  {
    id: 'data-science-genai-master',
    interests: ['data-science', 'analytics'],
    name: 'Advanced Data Science & GenAI Master Program',
    url: 'https://www.learnbay.co/datascience/data-science-and-ai-master-certification-program',
    summary: 'Data science and GenAI skills through live training and hands-on projects.',
    features: ['Live training', 'Hands-on projects', 'Data Science & GenAI certification'],
    focusAreas: ['Data science', 'Machine learning', 'GenAI'],
    bestFor: 'Analysts and professionals moving into data science and GenAI roles',
  },
  {
    id: 'genai-agentic-ai-cloud-devops',
    interests: ['cloud-devops', 'ai'],
    name: 'GenAI & AgenticAI for Cloud & DevOps',
    url: 'https://www.learnbay.co/genai-agentic-ai-for-cloud-devops',
    summary: 'Become an AI-ready Cloud & DevOps engineer: LLMs, agents, and AI-powered CI/CD and ops workflows.',
    features: ['LLMs & agents', 'AI-powered CI/CD', 'AI-powered ops workflows'],
    focusAreas: ['LLMs', 'AI agents', 'CI/CD', 'Cloud operations'],
    bestFor: 'Cloud and DevOps engineers adding GenAI and agentic AI to their work',
  },
  {
    id: 'ai-cloud-devops-master',
    interests: ['cloud-devops'],
    name: 'AI-Powered Cloud & DevOps Master Program',
    url: 'https://www.learnbay.co/cloud-and-devops/ai-powered-cloud-devops-masters-certification',
    summary: 'Live classes, projects and multi-cloud training for Cloud & DevOps careers.',
    features: ['Live classes', 'Projects', 'Multi-cloud training'],
    focusAreas: ['Cloud', 'DevOps', 'Multi-cloud'],
    bestFor: 'Professionals building or switching into Cloud & DevOps careers',
  },
  {
    id: 'applied-ai-practitioner',
    interests: ['ai', 'analytics'],
    name: 'Applied AI Practitioner Program',
    url: 'https://www.learnbay.co/artificial-intelligence/applied-ai-practitioner-program',
    summary: '4-month applied AI program: master 35+ AI tools, IIT Patna certification, no coding required.',
    features: ['35+ AI tools', 'IIT Patna certification', 'No coding required'],
    focusAreas: ['AI tools', 'Applied AI', 'Workflow automation'],
    bestFor: 'Managers, business and non-technical professionals using AI in their work',
  },
  {
    id: 'forward-deployed-ai-engineer',
    interests: ['fde', 'ai'],
    name: 'Forward Deployed AI Engineer Program',
    url: 'https://www.learnbay.co/artificial-intelligence/forward-deployed-engineer-course',
    summary: '12 months of live mentor-led training in LLMs, RAG, Agentic AI and LLMOps with real AI startup projects.',
    features: ['100% live, mentor-led', '80+ live projects', 'Certification in collaboration with IBM and Microsoft'],
    focusAreas: ['GenAI', 'RAG', 'Agentic AI', 'LLMOps', 'Client solution engineering'],
    bestFor: 'Working professionals who want to build and deploy AI solutions directly with clients',
  },
  {
    id: 'data-business-analytics-genai',
    interests: ['analytics', 'data-science'],
    name: 'Data & Business Analytics Course with Gen AI',
    url: 'https://www.learnbay.co/artificial-intelligence/generative-ai-analytics-course',
    summary: 'Hands-on Data & Business Analytics course powered by Generative AI, with top tools and real-world projects.',
    features: ['Powered by Generative AI', 'Top analytics tools', 'Real-world projects'],
    focusAreas: ['Data analytics', 'Business analytics', 'BI tools', 'GenAI for analysis'],
    bestFor: 'Analysts and business professionals moving into data and business analytics roles',
  },
  {
    // From https://www.learnbay.co/genai-agentic-ai-managers-leaders (checked 29 Sep 2026). Prerequisites: Python, ML and basic deep learning.
    id: 'genai-agentic-ai-managers-leaders',
    interests: ['ai'],
    name: 'GenAI & Agentic AI Program for Managers & Leaders',
    url: 'https://www.learnbay.co/genai-agentic-ai-managers-leaders',
    summary: 'For managers and leaders: GenAI for business transformation, workflow automation and project management, with real projects.',
    features: ['150+ hours of live classes', '10+ guided projects', 'IBM certification in Generative AI'],
    focusAreas: ['GenAI for managers', 'Agentic AI', 'Digital business transformation', 'GenAI for project management'],
    bestFor: 'Managers and team leads with Python and ML basics who lead or will lead AI initiatives',
  },
  // Added 29 Sep 2026 from each program's page (see config/program-details.ts for modules, projects and tools).
  {
    id: 'genai-software-developers',
    interests: ['ai'],
    name: 'GenAI & Agentic AI Program for Software Developers',
    url: 'https://www.learnbay.co/artificial-intelligence/genai-software-developers',
    summary: 'For developers with 1+ years: add GenAI and agentic AI to the software you already build.',
    features: ['130+ hours of live classes', '40+ guided projects', 'IBM and Microsoft certification'],
    focusAreas: ['GenAI', 'Agentic AI', 'LLMOps', 'AI in software products'],
    bestFor: 'Software developers and engineers with 1+ years of experience moving into AI',
  },
  {
    id: 'genai-agentic-ai-program',
    interests: ['ai'],
    name: 'Generative AI & Agentic AI Program',
    url: 'https://www.learnbay.co/genai-agentic-ai-program',
    summary: 'GenAI and agentic AI for freshers, working professionals and developers starting their AI journey.',
    features: ['150+ hours of live classes', '10+ guided projects', 'IBM certification'],
    focusAreas: ['GenAI', 'Agentic AI', 'Automation'],
    bestFor: 'Freshers and early-career professionals who code a little and want to start in AI',
  },
  {
    id: 'data-science-genai-program',
    interests: ['data-science'],
    name: 'Data Science & GenAI Program',
    url: 'https://www.learnbay.co/data-science-genai-program',
    summary: 'IBM-certified data science and GenAI program, open to freshers and non-technical professionals.',
    features: ['250+ hours of live classes', '30+ guided projects', 'IBM certification'],
    focusAreas: ['Data science', 'Machine learning', 'GenAI'],
    bestFor: 'Freshers and non-technical professionals starting in data science',
  },
  {
    id: 'ms-cs-data-science-ai',
    interests: ['data-science'],
    name: 'MS in Computer Science (Data Science & AI specialisation)',
    url: 'https://www.learnbay.co/datascience/data-science-and-ai-masters-in-cs',
    summary: 'A master\'s degree in Computer Science with a Data Science & AI specialisation, for bachelor\'s degree holders.',
    features: ['Accredited master\'s degree', 'Data Science & AI specialisation', 'Projects and capstone'],
    focusAreas: ['Computer science', 'Data science', 'AI'],
    bestFor: 'Working professionals with a bachelor\'s degree who want a master\'s degree in data science and AI',
  },
  {
    id: 'advanced-cloud-devops',
    interests: ['cloud-devops'],
    name: 'Advanced Cloud & DevOps Program',
    url: 'https://www.learnbay.co/cloud-and-devops/advanced-cloud-computing-and-devops-program',
    summary: 'Beginner-friendly Cloud & DevOps training for IT and non-IT working professionals.',
    features: ['150+ hours of live classes', '10+ guided projects', 'Beginner-friendly'],
    focusAreas: ['Cloud', 'DevOps', 'Linux', 'CI/CD'],
    bestFor: 'Working professionals from any domain, including non-IT, starting Cloud & DevOps',
  },
  {
    id: 'cloud-devops-network',
    interests: ['cloud-devops'],
    name: 'Cloud & DevOps for Network Professionals',
    url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-network-professionals',
    summary: 'Cloud & DevOps built on networking experience: cloud networking, automation and multi-cloud.',
    features: ['150+ hours of live classes', '10+ guided projects', 'Network-specific projects'],
    focusAreas: ['Cloud networking', 'DevOps', 'Automation'],
    bestFor: 'Network engineers and admins with 1+ years moving into cloud and DevOps',
  },
  {
    id: 'cloud-devops-qa-testers',
    interests: ['cloud-devops'],
    name: 'Cloud & DevOps for QA & Software Test Engineers',
    url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-qa-and-software-test-engineers',
    summary: 'Cloud & DevOps for testers: CI/CD, test infrastructure automation and test observability.',
    features: ['150+ hours of live classes', '10+ QA-specific projects', 'Microsoft certification'],
    focusAreas: ['CI/CD', 'Test automation infrastructure', 'Cloud', 'Kubernetes'],
    bestFor: 'QA and test engineers with 1+ years moving into SDET and QA DevOps roles',
  },
  {
    id: 'cloud-devops-sysadmin',
    interests: ['cloud-devops'],
    name: 'Cloud & DevOps for System Administrators',
    url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-system-administrators',
    summary: 'Cloud & DevOps built on system administration: automation, infrastructure as code and cloud ops.',
    features: ['150+ hours of live classes', '10+ guided projects', 'Sysadmin-specific projects'],
    focusAreas: ['Cloud', 'Infrastructure as code', 'Automation'],
    bestFor: 'System administrators with 1+ years moving into cloud and DevOps',
  },
  {
    id: 'cloud-devops-it-support-ops',
    interests: ['cloud-devops'],
    name: 'Cloud & DevOps for IT Support & IT Operations',
    url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-it-support-and-it-operations',
    summary: 'Cloud & DevOps for support and operations teams: cloud operations, monitoring and automation.',
    features: ['150+ hours of live classes', '10+ guided projects', 'Cloud ops projects'],
    focusAreas: ['Cloud operations', 'Monitoring', 'DevOps'],
    bestFor: 'IT support and operations professionals with 1+ years moving into cloud ops and DevOps',
  },
  {
    id: 'cloud-devops-dba',
    interests: ['cloud-devops'],
    name: 'Cloud & DevOps for Database Administrators',
    url: 'https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-database-administrators',
    summary: 'Cloud & DevOps for DBAs: cloud databases, automation and data platform operations.',
    features: ['150+ hours of live classes', '10+ guided projects', 'Database-specific projects'],
    focusAreas: ['Cloud databases', 'Automation', 'DevOps'],
    bestFor: 'Database administrators with 1+ years moving into cloud and DevOps',
  },
]

export function getProgram(id: string | null | undefined): Program {
  return PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0]
}

export function programsForInterest(interest: string | undefined): Program[] {
  const list = PROGRAMS.filter((p) => interest && p.interests.includes(interest))
  return list.length ? list : PROGRAMS
}

/** The flagship program for a track picked on the start screen (falls back to the first match for other areas). */
export function programFor(interest: string | null | undefined): Program | undefined {
  const flagship: Record<string, string> = { ai: 'genai-agentic-ai-master', fde: 'forward-deployed-ai-engineer', 'cloud-devops': 'ai-cloud-devops-master' }
  const id = interest ? flagship[interest] : undefined
  return (id ? PROGRAMS.find((p) => p.id === id) : undefined) ?? programsForInterest(interest ?? undefined)[0]
}
