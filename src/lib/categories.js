/** Category clusters for browsing — organizational only; compounds come from protocols.json */
export const CATEGORIES = [
  {
    id: 'all',
    label: 'All',
  },
  {
    id: 'incretins',
    label: 'Incretins',
    ids: [
      'retatrutide',
      'tirzepatide',
      'semaglutide',
      'mazdutide',
      'survodutide',
      'cagrilintide',
    ],
  },
  {
    id: 'healing',
    label: 'Healing',
    ids: ['ghkcu', 'glow70', 'klow80', 'bpc157', 'tb500', 'regen', 'kpv'],
  },
  {
    id: 'gh-axis',
    label: 'GH axis',
    ids: [
      'tesamorelin',
      'sermorelin',
      'ipamorelin',
      'cjcnodac',
      'cjcipa',
      'cjcdac',
      'ghrp2',
      'ghrp6',
      'hgh',
    ],
  },
  {
    id: 'metabolic',
    label: 'Metabolic',
    ids: ['aod9604', '5amino1mq', 'motsc', 'slupp332', 'lcarnitine'],
  },
  {
    id: 'cognitive',
    label: 'Cognitive',
    ids: ['semax', 'selank', 'brainblend', 'pinealon', 'dsip', 'epitalon'],
  },
  {
    id: 'immune',
    label: 'Immune & cellular',
    ids: ['thymosinalpha1', 'll37', 'glutathione', 'nad', 'ss31'],
  },
  {
    id: 'melanocortin',
    label: 'Melanocortin',
    ids: ['melanotan2', 'melanotan1', 'pt141'],
  },
  {
    id: 'igf',
    label: 'IGF',
    ids: ['igf1des', 'igf1lr3'],
  },
  {
    id: 'hormones',
    label: 'Hormones',
    ids: ['hcg', 'hmg', 'testcyp', 'testenan', 'kisspeptin10'],
  },
]

export function categoryForProtocol(id) {
  return CATEGORIES.find((c) => c.id !== 'all' && c.ids?.includes(id)) ?? null
}

export function matchesCategory(protocolId, categoryId) {
  if (!categoryId || categoryId === 'all') return true
  const cat = CATEGORIES.find((c) => c.id === categoryId)
  return Boolean(cat?.ids?.includes(protocolId))
}

export function matchesQuery(protocol, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [protocol.name, protocol.id, ...(protocol.aliases || [])]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}
