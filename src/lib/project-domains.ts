// Domain specialisations used by the project library (from the brochures). Safe to import in the browser (no database).

/** Industry specialisations: shown to learners from that industry. */
export const INDUSTRY_DOMAINS: Record<string, string> = {
  bfsi: 'BFSI (Banking, Financial Services & Insurance)',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
  'supply-chain': 'Supply Chain',
  'retail-ecommerce': 'Retail & E-commerce',
  media: 'Media & Entertainment',
  hr: 'HR',
  'sales-marketing': 'Sales & Marketing',
  telecom: 'Telecom',
}

/** Role and technical specialisations: shown to learners in that role, or always for programs where they are core. */
export const ROLE_DOMAINS: Record<string, string> = {
  'project-management': 'Project Management',
  management: 'Management',
  'product-management': 'Product Management',
  'cloud-devops': 'Cloud & DevOps',
  'qa-testing': 'QA & Testing',
  'software-development': 'Software Development',
  'genai-software-development': 'GenAI Software Development',
  'ai-cloud-devops-llm-infra': 'AI Cloud, DevOps & LLM Infrastructure',
  'ai-backend-engineering': 'AI Backend Engineering',
  'distributed-systems-ai': 'Distributed Systems for AI',
  'multi-agent-workflow-automation': 'Multi-agent Workflow Automation',
  'genai-product-management': 'GenAI Product Management',
}

export const PROJECT_DOMAINS: Record<string, string> = { ...INDUSTRY_DOMAINS, ...ROLE_DOMAINS }

/** Short labels for the tags on project cards. */
export const DOMAIN_TAG: Record<string, string> = {
  bfsi: 'BFSI', healthcare: 'Healthcare', manufacturing: 'Manufacturing', 'supply-chain': 'Supply chain', 'retail-ecommerce': 'Retail & e-commerce',
  media: 'Media', hr: 'HR', 'sales-marketing': 'Sales & marketing', telecom: 'Telecom', 'project-management': 'Project management', management: 'Management', 'product-management': 'Product management',
  'cloud-devops': 'Cloud & DevOps', 'qa-testing': 'QA & testing', 'software-development': 'Software development',
  'genai-software-development': 'GenAI software', 'ai-cloud-devops-llm-infra': 'LLM infrastructure', 'ai-backend-engineering': 'AI backend',
  'distributed-systems-ai': 'Distributed systems', 'multi-agent-workflow-automation': 'Multi-agent automation', 'genai-product-management': 'GenAI product',
  design: 'Design', 'data-analytics': 'Data & MIS', education: 'Education',
}

/** The learner's industry (Bruce's question) → industry specialisation. */
const FOR_INDUSTRY: Record<string, string> = { bfsi: 'bfsi', healthcare: 'healthcare', manufacturing: 'manufacturing', retail: 'retail-ecommerce', telecom: 'telecom' }
/** The learner's role → role specialisations. */
const FOR_ROLE: Record<string, string[]> = {
  'qa-engineer': ['qa-testing'], 'devops-cloud': ['cloud-devops', 'ai-cloud-devops-llm-infra'], 'software-engineer': ['software-development', 'genai-software-development', 'ai-backend-engineering'],
  'product-manager': ['product-management', 'project-management', 'genai-product-management'], 'business-non-tech': ['management', 'project-management'],
}
/** Specialisations that are a core part of a program (every learner takes them). */
const CORE_FOR_PROGRAM: Record<string, string[]> = {
  'genai-software-developers': ['software-development'],
  'genai-agentic-ai-managers-leaders': ['project-management'],
  'sde-genai-agentic-ai': ['genai-software-development', 'ai-cloud-devops-llm-infra', 'ai-backend-engineering', 'distributed-systems-ai', 'multi-agent-workflow-automation', 'genai-product-management'],
}

/** Which specialisation projects this learner should see for this program: their industry first, then their role, then the program's core ones. */
export function domainsFor(programId: string, industry?: string, role?: string): string[] {
  return [...new Set([
    ...(industry && FOR_INDUSTRY[industry] ? [FOR_INDUSTRY[industry]] : []),
    ...(role ? FOR_ROLE[role] ?? [] : []),
    ...(CORE_FOR_PROGRAM[programId] ?? []),
  ])]
}
