// The career path for each track, shown when the counsellor explains a track (and before a track switch).
// Stages describe the order people usually learn in; they are not a syllabus and carry no durations.
// Edit here when the programs change.

import type { IconName } from '@/components/Icon'

export type PathStage = { title: string; skills: string }

export const TRACK_PATHS: Record<string, { why: string; stages: PathStage[]; icon: IconName }> = {
  ai: {
    icon: 'sparkles',
    why: 'Build GenAI apps and AI agents that companies are putting into production.',
    stages: [
      { title: 'Foundations', skills: 'Python, data handling, APIs' },
      { title: 'LLMs & prompting', skills: 'How LLMs work, prompt design, evaluation' },
      { title: 'RAG & AI agents', skills: 'Embeddings, vector DBs, tool-using agents' },
      { title: 'Ship it', skills: 'LLMOps, deployment, a capstone for your portfolio' },
    ],
  },
  fde: {
    icon: 'briefcase',
    why: 'Take AI from demo to production inside real client environments, working with the business side.',
    stages: [
      { title: 'Engineering base', skills: 'Python, APIs, cloud basics' },
      { title: 'GenAI solutions', skills: 'LLMs, RAG, evaluation on real data' },
      { title: 'Agents & integration', skills: 'Agents wired into business systems and workflows' },
      { title: 'Deploy with clients', skills: 'Rollout, guardrails, observability, stakeholder skills' },
    ],
  },
  'cloud-devops': {
    icon: 'cloud',
    why: 'Run and automate modern cloud platforms, with AI in the CI/CD and ops workflow.',
    stages: [
      { title: 'Systems base', skills: 'Linux, networking, scripting' },
      { title: 'Cloud & containers', skills: 'AWS / Azure, Docker, Kubernetes' },
      { title: 'Automation', skills: 'CI/CD, Terraform, monitoring' },
      { title: 'AI-powered ops', skills: 'LLMs and agents in pipelines and operations' },
    ],
  },
}
