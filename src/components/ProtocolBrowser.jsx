import { Link } from 'react-router-dom'
import { CATEGORIES, matchesCategory, matchesQuery } from '../lib/categories.js'

export default function ProtocolBrowser({
  protocols,
  query,
  onQueryChange,
  category,
  onCategoryChange,
}) {
  const filtered = protocols
    .filter((p) => matchesCategory(p.id, category) && matchesQuery(p, query))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section id="library" className="library">
      <div className="library-inner">
        <header className="section-head">
          <h2>Protocol library</h2>
          <p>
            Filter by research cluster or search by name. Open any entry for full
            structured fields.
          </p>
        </header>

        <div className="library-controls">
          <label className="search-field">
            <span className="visually-hidden">Filter protocols</span>
            <input
              type="search"
              placeholder="Filter protocols…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </label>
          <div className="category-row" role="tablist" aria-label="Categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={category === cat.id}
                className={
                  category === cat.id ? 'cat-btn is-active' : 'cat-btn'
                }
                onClick={() => onCategoryChange(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <p className="result-count">
          {filtered.length} protocol{filtered.length === 1 ? '' : 's'}
        </p>

        <ul className="protocol-list">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link to={`/protocol/${p.id}`} className="protocol-row">
                <span className="protocol-name">{p.name}</span>
                <span className="protocol-meta">
                  <span className="entry-type">{p.entry_type}</span>
                  {p.blend ? <span className="blend-tag">Blend</span> : null}
                </span>
                <span className="protocol-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className="empty-state">
            No protocols match that filter. Try another category or clear the
            search.
          </p>
        )}
      </div>
    </section>
  )
}
