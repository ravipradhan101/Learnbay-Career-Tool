// Curriculum structure of the flagship programs, as published on each program page on learnbay.co (checked 28 Sep 2026).
// Module names only: durations change by batch, so the counsellor never quotes them. Edit here when the pages change.

export type Curriculum = {
  /** Published headline numbers. */
  liveHours: string
  projects: string
  modules: string[]
  /** Electives by background (where the program has them). */
  electives?: string[]
  /** Published capstone / industry project examples. */
  capstones: string[]
}

export const CURRICULUM: Record<string, Curriculum> = {
  'genai-agentic-ai-master': {
    liveHours: '300+ hours of live instructor-led classes',
    projects: '40+ guided hands-on projects',
    modules: [
      'Induction & orientation: AI career paths, role mapping, LinkedIn for AI hiring',
      'Python for GenAI',
      'Foundation for GenAI',
      'Advanced Generative AI',
      'Agentic AI & automation',
      'LLMOps & production deployment',
      'Ethics, guardrails & responsible AI',
    ],
    capstones: ['Smart hiring tool for recruitment', 'Financial report generator with GenAI', 'Project performance dashboard', 'Employee feedback insights'],
  },
  'forward-deployed-ai-engineer': {
    liveHours: '400+ hours of live instructor-led classes',
    projects: '80+ guided hands-on projects',
    modules: [
      'Induction & orientation: the FDE role, career path mapping, cloud sandbox labs',
      'GenAI foundation (no code)',
      'Python for AI',
      'Software engineering for FDE',
      'Foundation for AI',
      'Generative AI & LLM engineering',
      'Advanced RAG & enterprise AI systems',
      'Agentic AI & automation',
      'Cloud, deployment, LLMOps & AIOps',
      'AI system design & enterprise architecture',
      'FDE / client solution engineering',
      'Capstone projects & interview readiness',
    ],
    electives: ['FDE for Software & SaaS', 'FDE for Data & Analytics', 'FDE for Cloud & Enterprise', 'DSA & problem solving (optional)'],
    capstones: ['Real client problems end to end: discovery, build, deployment and handover', 'Agent workflows with approval gates before anything reaches the customer'],
  },
  'ai-cloud-devops-master': {
    liveHours: '250+ hours of live instructor-led classes',
    projects: '40+ guided hands-on projects',
    modules: [
      'Cloud basics & Linux fundamentals',
      'Python programming essentials',
      'AWS Cloud Practitioner',
      'AWS Associate & Professional Solutions Architect',
      'Microsoft Azure proficiency (optional)',
      'Cloud system design & distributed architecture',
      'DevOps mastery: infrastructure & automation',
      'DevSecOps & cloud security engineering',
      'Multicloud strategy & architecture',
      'MLOps engineering',
      'GenAI essentials for Cloud & DevOps',
    ],
    electives: ['Network professionals', 'System administrators', 'IT support & IT operations', 'Database administrators'],
    capstones: ['Multistage CI/CD pipeline for microservices', 'Cloud infrastructure automation with Terraform', 'Monitoring & logging with Prometheus, Grafana, ELK', 'Serverless application with a DevOps workflow'],
  },
}

CURRICULUM['genai-agentic-ai-managers-leaders'] = {
  liveHours: '150+ hours of live instructor-led classes',
  projects: '10+ guided hands-on projects',
  modules: [
    'Induction & orientation: AI career paths and role mapping',
    'Python for GenAI',
    'Foundation for GenAI',
    'Generative AI for managers',
    'Agentic AI',
    'GenAI for digital business transformation',
    'GenAI for project management',
  ],
  capstones: ['Business transformation use cases with GenAI', 'Workflow automation with AI agents'],
}

/** Published on every flagship program page ("Others Vs Learnbay" and the program highlights). */
export const CURRICULUM_EDGE = [
  'Live, mentor-led, interactive classes (not mostly recorded sessions)',
  'Domain specialisations: BFSI, Healthcare, Supply Chain, Manufacturing, HR, Project Management',
  'Project certificates issued by Learnbay with leading MNCs and startups',
  'A dedicated project mentor, plus 1:1 doubt clearing',
  'Real startup problems through the AI Co-Lab, not just case studies',
  'A 3-year flexible subscription: learn at your pace with unlimited access',
  'Microsoft and IBM certification on these programs',
  'Curriculum engineered to meet the expectations of leading tech companies',
]
