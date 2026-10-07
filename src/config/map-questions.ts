// The one question per lead type (from the Lead–Course Map's "Questions the AI should ask") whose answer can change
// which program fits. The counsellor asks it after role and coding are known; lib/lead-match uses the answer.
// Options are written as the learner would say them. Kept free of server code: the chat shows these as choices.

export type MapQuestion = { id: string; question: string; options: { id: string; label: string }[] }

export const MAP_QUESTIONS: Record<string, MapQuestion> = {
  student: {
    id: 'student-code', question: 'Do you want to learn to code, or mainly use AI tools well?',
    options: [{ id: 'code', label: 'I want to learn to code' }, { id: 'tools', label: 'Use AI tools well' }, { id: 'unsure', label: 'Not sure yet' }],
  },
  'non-grad': {
    id: 'nongrad-work', question: 'Are you working, freelancing or running a business right now?',
    options: [{ id: 'working', label: 'Working in a job' }, { id: 'freelance', label: 'Freelancing' }, { id: 'business', label: 'Running a business' }, { id: 'job-seeking', label: 'Looking for a salaried job' }],
  },
  'fresher-tech': {
    id: 'fresher-pref', question: 'Do you enjoy working with data and numbers, or building apps more?',
    options: [{ id: 'data', label: 'Data and numbers' }, { id: 'apps', label: 'Building apps' }, { id: 'unsure', label: 'Not sure yet' }],
  },
  'fresher-nontech': {
    id: 'python-try', question: 'Would you be open to learning a little Python, step by step?',
    options: [{ id: 'yes', label: 'Yes, happy to try' }, { id: 'maybe', label: 'Maybe, if it’s gradual' }, { id: 'no', label: 'I’d rather avoid code' }],
  },
  'career-gap': {
    id: 'gap-role', question: 'What kind of role did you have before the break?',
    options: [{ id: 'tech', label: 'A tech role (developer, IT, data)' }, { id: 'nontech', label: 'A non-tech role' }],
  },
  creative: {
    id: 'creative-goal', question: 'Do you want to grow in your current role, or switch to something new?',
    options: [{ id: 'grow', label: 'Grow in my current role' }, { id: 'switch', label: 'Switch to a marketing-analyst role' }, { id: 'lead', label: 'I lead a creative team' }],
  },
  'nontech-upskill': {
    id: 'nontech-goal', question: 'Do you want to grow in your current role, or switch to a new one?',
    options: [{ id: 'grow', label: 'Grow in my current role' }, { id: 'switch', label: 'Switch to an analyst role' }],
  },
  'nontech-switch': {
    id: 'build-reports', question: 'Do you build reports or dashboards in your work today?',
    options: [{ id: 'yes', label: 'Yes, regularly' }, { id: 'some', label: 'Sometimes' }, { id: 'no', label: 'Not really' }],
  },
  analyst: {
    id: 'analyst-focus', question: 'Do you want to build ML models, or AI apps on top of data?',
    options: [{ id: 'models', label: 'ML models and data science' }, { id: 'ai-apps', label: 'AI apps and agents' }, { id: 'unsure', label: 'Not sure yet' }],
  },
  'data-pro': {
    id: 'datapro-focus', question: 'Do you want to ship GenAI solutions with clients, or go deeper into data science?',
    options: [{ id: 'genai', label: 'Ship GenAI solutions' }, { id: 'ds-depth', label: 'Deeper data science (CV, MLOps)' }],
  },
  'dev-junior': {
    id: 'dev-goal', question: 'Are you aiming for an AI role, or a switch to a product company?',
    options: [{ id: 'ai', label: 'An AI role' }, { id: 'product', label: 'A product-company switch' }, { id: 'unsure', label: 'Not sure yet' }],
  },
  'dev-product': {
    id: 'dev-round', question: 'Which interview round trips you up most?',
    options: [{ id: 'dsa', label: 'DSA / coding rounds' }, { id: 'design', label: 'System design' }, { id: 'both', label: 'Both' }],
  },
  'dev-senior': {
    id: 'client-work', question: 'Do you enjoy client and stakeholder work?',
    options: [{ id: 'yes', label: 'Yes, I like it' }, { id: 'no', label: 'I prefer core engineering' }],
  },
  qa: {
    id: 'qa-goal', question: 'Where do you want to take your testing career: CI/CD and cloud, or AI-driven testing?',
    options: [{ id: 'cloud', label: 'CI/CD and cloud (DevOps)' }, { id: 'ai', label: 'AI-driven testing' }],
  },
  'cloud-pro': {
    id: 'cloudpro-focus', question: 'Do you want to run AI platforms, or build AI apps?',
    options: [{ id: 'platforms', label: 'Run AI platforms (LLMOps)' }, { id: 'apps', label: 'Build AI apps' }],
  },
  'infra-ops': {
    id: 'linux-comfort', question: 'How comfortable are you with Linux and scripting?',
    options: [{ id: 'comfortable', label: 'Comfortable' }, { id: 'basic', label: 'The basics' }, { id: 'new', label: 'Quite new to it' }],
  },
  'nontech-cloud': {
    id: 'open-analytics', question: 'Cloud roles need IT experience first. Would analytics work for you as the way into tech?',
    options: [{ id: 'yes', label: 'Yes, tell me about analytics' }, { id: 'cloud', label: 'I still want cloud' }],
  },
  'tech-manager': {
    id: 'hands-on', question: 'Are you still hands-on, or fully managerial now?',
    options: [{ id: 'hands-on', label: 'Still hands-on, I code' }, { id: 'managerial', label: 'Fully managerial' }],
  },
  'biz-leader': {
    id: 'leader-build', question: 'Do you want to build AI things yourself, or lead a team that does?',
    options: [{ id: 'lead', label: 'Lead a team' }, { id: 'build', label: 'Build some myself' }],
  },
  'domain-pro': {
    id: 'domain-build', question: 'Do you want to build AI models yourself, or apply AI in your function?',
    options: [{ id: 'build', label: 'Build models and AI systems' }, { id: 'apply', label: 'Apply AI in my function' }],
  },
  'undecided-tech': {
    id: 'twelve-months', question: 'What do you want to be doing 12 months from now?',
    options: [{ id: 'build-ai', label: 'Building AI systems' }, { id: 'data-science', label: 'Data science' }, { id: 'sde', label: 'An SDE role at a product company' }, { id: 'lead', label: 'Leading AI work' }, { id: 'degree', label: 'A formal master’s degree' }],
  },
  degree: {
    id: 'degree-need', question: 'Do you need a formal degree, or would a certification work?',
    options: [{ id: 'degree', label: 'I need a degree' }, { id: 'cert', label: 'A certification works' }],
  },
}

/** Every question id with its valid option ids (for validating stored answers). */
export const MAP_ANSWER_OPTIONS: Record<string, string[]> = Object.fromEntries(Object.values(MAP_QUESTIONS).map((q) => [q.id, q.options.map((o) => o.id)]))
