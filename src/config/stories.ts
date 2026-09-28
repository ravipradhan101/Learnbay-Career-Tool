// Content shown while Richa finds a counsellor, and in the studio's right pane.
//
// SAMPLE_STORIES are PLACEHOLDERS (stock photos, invented names and numbers) and are always labelled
// "Sample stories" on screen. Replace them with real, consented alumni stories and set `sample: false`.

export type Story = { name: string; photo: string; from: string; to: string; hike: string; sample: boolean }

export const SAMPLE_STORIES: Story[] = [
  { name: 'Ananya R.', photo: '/stories/story-1.jpg', from: 'QA Engineer', to: 'AI Engineer', hike: '+65%', sample: true },
  { name: 'Rohit M.', photo: '/stories/story-2.jpg', from: 'Support Engineer', to: 'Cloud Engineer', hike: '+48%', sample: true },
  { name: 'Karthik S.', photo: '/stories/story-3.jpg', from: 'Java Developer', to: 'GenAI Developer', hike: '+72%', sample: true },
  { name: 'Imtiaz A.', photo: '/stories/story-4.jpg', from: 'System Admin', to: 'DevOps Engineer', hike: '+55%', sample: true },
]

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
