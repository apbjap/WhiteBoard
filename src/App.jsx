import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import ProtocolPage from './pages/ProtocolPage.jsx'
import SiteFooter from './components/SiteFooter.jsx'

export default function App() {
  const [dataset, setDataset] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/data/protocols.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load protocols (${r.status})`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setDataset(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="boot-state">
        <p>Could not load protocol data.</p>
        <p className="muted">{error}</p>
      </div>
    )
  }

  if (!dataset) {
    return (
      <div className="boot-state">
        <p className="loading-label">Loading PeptideInfo…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage dataset={dataset} />} />
        <Route
          path="/protocol/:id"
          element={<ProtocolPage dataset={dataset} />}
        />
      </Routes>
      <SiteFooter meta={dataset.meta} resources={dataset.related_resources} />
    </div>
  )
}
