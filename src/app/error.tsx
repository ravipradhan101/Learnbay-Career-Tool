'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
        <h1>Something went wrong</h1>
        <p className="muted">Please try again. If it keeps happening, come back in a few minutes.</p>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  )
}
