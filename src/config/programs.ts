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
]

export function getProgram(id: string | null | undefined): Program {
  return PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0]
}

export function programsForInterest(interest: string | undefined): Program[] {
  const list = PROGRAMS.filter((p) => interest && p.interests.includes(interest))
  return list.length ? list : PROGRAMS
}
