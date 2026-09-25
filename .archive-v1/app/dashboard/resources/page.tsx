import { Icon } from '@/components/Icon'
import { getResources } from '@/config/resources'
import { getReadyDashboard } from '@/lib/data'

export const metadata = { title: 'Resources & Tutorials' }

export default async function ResourcesPage() {
  const { report } = await getReadyDashboard()
  const r = report.data
  const resources = getResources(r.resourceIds)
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Resources & Tutorials</h1>
          <p>Free, hand-picked resources matched to your roadmap, plus industry use cases to learn from.</p>
        </div>
      </div>
      <section className="stack">
        <h2 className="card-title"><Icon name="book" className="text-primary" /> Tutorials & courses for your gaps</h2>
        <div className="resource-list">
          {resources.map((res) => (
            <a key={res.id} className="resource" href={res.url} target="_blank" rel="noopener noreferrer">
              <span className="fc-icon"><Icon name={res.type === 'Documentation' ? 'file' : res.type === 'Course' ? 'award' : 'book'} /></span>
              <span style={{ flex: 1 }}>
                <b>{res.title}</b>
                <span>{res.provider} • {res.type}</span>
                <span className="tag-list" style={{ marginTop: '0.375rem' }}>{res.topics.map((t) => <span className="pill" key={t}>{t}</span>)}</span>
              </span>
              <Icon name="external" size="1rem" className="muted" />
            </a>
          ))}
        </div>
      </section>
      <section className="stack">
        <h2 className="card-title"><Icon name="briefcase" className="text-primary" /> Case studies: how AI is applied in your field</h2>
        <div className="grid-2">
          {r.caseStudies.map((c) => (
            <article className="card stack" key={c.title} style={{ gap: '0.5rem' }}>
              <span className="pill primary" style={{ alignSelf: 'flex-start' }}>{c.industry}</span>
              <h3 style={{ fontSize: '1.0625rem' }}>{c.title}</h3>
              <p className="small muted">{c.summary}</p>
              <p className="small"><b>What you can take from it:</b> {c.takeaway}</p>
            </article>
          ))}
        </div>
        <p className="xsmall muted">Use-case briefs are written by AI to illustrate common industry patterns; they do not describe a specific company.</p>
      </section>
    </>
  )
}
