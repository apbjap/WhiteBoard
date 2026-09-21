import { useMemo, useState } from 'react'
import Hero from '../components/Hero.jsx'
import ProtocolBrowser from '../components/ProtocolBrowser.jsx'
import DisclaimerBanner from '../components/DisclaimerBanner.jsx'

export default function HomePage({ dataset }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const count = dataset.meta?.record_count ?? dataset.protocols.length

  const protocols = useMemo(() => dataset.protocols ?? [], [dataset])

  return (
    <>
      <Hero
        count={count}
        query={query}
        onQueryChange={setQuery}
        onBrowse={() => {
          document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
      <DisclaimerBanner text={dataset.meta?.hub_disclaimer} />
      <ProtocolBrowser
        protocols={protocols}
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
      />
    </>
  )
}
