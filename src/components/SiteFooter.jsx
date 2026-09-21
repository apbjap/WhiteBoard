export default function SiteFooter({ meta, resources }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>PeptideInfo</strong>
          <p>
            Independent browser for the Red Fox Peptides protocol-library
            extract. Not affiliated as a clinical product; not medical advice.
          </p>
        </div>
        <div className="footer-meta">
          <p>
            Source:{' '}
            <a href={meta?.source_hub_url} target="_blank" rel="noreferrer">
              {meta?.source_name || 'Red Fox Peptides'}
            </a>
          </p>
          {meta?.extracted_at && (
            <p className="muted">Dataset extracted {meta.extracted_at}</p>
          )}
          {resources?.length > 0 && (
            <ul className="footer-links">
              {resources.map((r) => (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.h1 || r.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  )
}
