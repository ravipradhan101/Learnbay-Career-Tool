// Content shown while Lumi finds a counsellor, and in the studio's right pane.
//
// Only real content here. ALUMNI_STORIES is for real, consented learner stories (name, photo, before → after role,
// company, hike) once the team shares them; until then it stays empty and nothing invented is shown as a story.
// CAREER_MOVES are common transitions for each track: no names, photos or numbers, so they need no label.

export type Story = { name: string; photo?: string; from: string; to: string; company?: string; hike?: string }

export const ALUMNI_STORIES: Story[] = []

export const CAREER_MOVES: Record<string, { from: string; to: string }[]> = {
  ai: [{ from: 'QA Engineer', to: 'AI Engineer' }, { from: 'Java Developer', to: 'GenAI Developer' }, { from: 'Data Analyst', to: 'Data Scientist' }],
  fde: [{ from: 'Software Engineer', to: 'Forward Deployed AI Engineer' }, { from: 'Solutions Consultant', to: 'AI Solutions Engineer' }, { from: 'Backend Developer', to: 'AI Engineer' }],
  'cloud-devops': [{ from: 'Support Engineer', to: 'Cloud Engineer' }, { from: 'System Admin', to: 'DevOps Engineer' }, { from: 'QA Engineer', to: 'SDET / QA DevOps' }],
}

/** Example capstone-style projects per track (what learners build). Illustrative project themes, not guarantees. */
export const TRACK_PROJECTS: Record<string, { title: string; tools: string }[]> = {
  ai: [
    { title: 'RAG assistant over company documents', tools: 'LLMs · embeddings · vector DB' },
    { title: 'Multi-step AI agent that uses tools', tools: 'Agents · function calling · LangChain' },
    { title: 'LLM app deployed with monitoring', tools: 'FastAPI · Docker · LLMOps' },
  ],
  fde: [
    { title: 'Client-ready GenAI solution, end to end', tools: 'Requirements · RAG · APIs' },
    { title: 'AI copilot integrated into a business workflow', tools: 'Agents · integrations · evaluation' },
    { title: 'Production rollout with logging and guardrails', tools: 'Cloud · observability · security' },
  ],
  'cloud-devops': [
    { title: 'AI-assisted CI/CD pipeline', tools: 'GitHub Actions · Docker · LLMs' },
    { title: 'Kubernetes deployment with autoscaling', tools: 'Kubernetes · Helm · monitoring' },
    { title: 'Infrastructure as Code on multi-cloud', tools: 'Terraform · AWS · Azure' },
  ],
}

export const CERTIFICATIONS = ['IBM project certification', 'Microsoft certification (selected programs)', 'IIT Patna (Applied AI Practitioner)']
