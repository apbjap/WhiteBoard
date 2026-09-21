export default function Hero({ count, query, onQueryChange, onBrowse }) {
  return (
    <header className="hero">
      <div className="hero-atmosphere" aria-hidden="true" />
      <div className="hero-veil" aria-hidden="true" />
      <nav className="top-nav">
        <span className="nav-brand">PeptideInfo</span>
        <a className="nav-link" href="#library">
          Library
        </a>
      </nav>
      <div className="hero-content">
        <p className="hero-brand animate-rise">PeptideInfo</p>
        <h1 className="hero-headline animate-rise delay-1">
          Protocol sketches, organized for research browsing.
        </h1>
        <p className="hero-support animate-rise delay-2">
          Search {count} community-practice entries extracted from the Red Fox
          Peptides protocol library — dosing outlines, reconstitution notes, and
          storage guidance in one place.
        </p>
        <div className="hero-cta animate-rise delay-3">
          <label className="search-field hero-search">
            <span className="visually-hidden">Search protocols</span>
            <input
              type="search"
              placeholder="Search by name or alias…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onBrowse()
              }}
            />
          </label>
          <button type="button" className="btn-accent" onClick={onBrowse}>
            Browse library
          </button>
        </div>
      </div>
    </header>
  )
}
