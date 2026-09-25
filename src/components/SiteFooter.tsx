export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <span>© {new Date().getFullYear()} Learnbay. AI Career Navigator.</span>
        <span>
          AI-generated guidance. Salary figures are indicative market ranges, not guarantees.{' '}
          <a href="https://www.learnbay.co/" target="_blank" rel="noopener noreferrer">learnbay.co</a>
        </span>
      </div>
    </footer>
  )
}
