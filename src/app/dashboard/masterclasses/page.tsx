import { Icon } from '@/components/Icon'
import { ProofStrip } from '@/components/ProofStrip'
import { Testimonials } from '@/components/Testimonials'
import { MasterclassInterest } from '@/components/studio/MasterclassInterest'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { RESOURCES } from '@/config/resources'
import { getStudio } from '@/lib/data'
import { interestLabel } from '@/lib/questions'

export const metadata = { title: 'Masterclasses' }

// Topics from the resource catalog that matter most for each program area.
const TOPICS: Record<string, string[]> = {
  ai: ['GenAI / LLMs', 'Agentic AI', 'RAG', 'Prompt engineering', 'Python', 'LLM evaluation'],
  'cloud-devops': ['Cloud (AWS/Azure)', 'Docker', 'Kubernetes', 'Deployment', 'MLOps', 'LLMOps'],
  fde: ['GenAI / LLMs', 'RAG', 'Agentic AI', 'API Development', 'AI apps', 'Deployment'],
  'data-science': ['Python', 'Machine Learning', 'Deep Learning', 'Data analysis', 'GenAI / LLMs'],
  analytics: ['SQL', 'Data analysis', 'Python', 'Databases', 'Prompt engineering'],
}

export default async function MasterclassesPage() {
  const { answers } = await getStudio()
  const topics = TOPICS[answers.interest ?? 'ai'] ?? TOPICS.ai
  const picked = RESOURCES.filter((r) => r.topics.some((t) => topics.includes(t))).slice(0, 10)
  return (
    <>
      <StudioHeader title="Masterclasses" subtitle={`Free learning material for ${interestLabel(answers)}, plus live masterclasses from Learnbay.`} />
      <MasterclassInterest interest={interestLabel(answers)} />
      <section className="stack">
        <h2 className="card-title"><Icon name="book" className="text-primary" /> Free tutorials & courses to start with</h2>
        <div className="resource-list">
          {picked.map((res) => (
            <a key={res.id} className="resource" href={res.url} target="_blank" rel="noopener noreferrer">
              <span className="fc-icon"><Icon name={res.type === 'Course' ? 'award' : res.type === 'Documentation' ? 'file' : 'book'} /></span>
              <span style={{ flex: 1 }}>
                <b>{res.title}</b>
                <span>{res.provider} • {res.type}</span>
              </span>
              <Icon name="external" size="1rem" className="muted" />
            </a>
          ))}
        </div>
        <p className="xsmall muted">Free third-party resources, hand-picked and link-checked by Learnbay.</p>
      </section>
      <Testimonials />
      <ProofStrip />
    </>
  )
}
