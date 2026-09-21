import { Link, useParams } from 'react-router-dom'
import { categoryForProtocol } from '../lib/categories.js'
import ProtocolDetail from '../components/ProtocolDetail.jsx'

export default function ProtocolPage({ dataset }) {
  const { id } = useParams()
  const protocol = dataset.protocols.find((p) => p.id === id)

  if (!protocol) {
    return (
      <main className="detail-page">
        <div className="detail-inner">
          <Link to="/" className="back-link">
            ← Back to library
          </Link>
          <h1 className="detail-title">Protocol not found</h1>
          <p className="lede">
            No entry matches <code>{id}</code> in the extracted dataset.
          </p>
        </div>
      </main>
    )
  }

  const category = categoryForProtocol(protocol.id)

  return (
    <main className="detail-page">
      <div className="detail-hero-band" aria-hidden="true" />
      <div className="detail-inner">
        <Link to="/#library" className="back-link">
          ← Back to library
        </Link>
        <p className="detail-kicker">
          {category ? category.label : 'Protocol'} · {protocol.entry_type}
        </p>
        <h1 className="detail-title">{protocol.name}</h1>
        {protocol.aliases?.length > 0 && (
          <p className="aliases">
            Also searched as {protocol.aliases.slice(0, 6).join(', ')}
            {protocol.aliases.length > 6 ? '…' : ''}
          </p>
        )}
        <ProtocolDetail
          protocol={protocol}
          templates={dataset.shared_templates}
          resources={dataset.related_resources}
        />
      </div>
    </main>
  )
}
