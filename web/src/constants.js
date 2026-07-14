export const STATUSES = {
  active: { label: 'In funzione', color: '#16a34a' },
  inactive: { label: 'Inattiva', color: '#dc2626' },
  maintenance: { label: 'In manutenzione', color: '#d97706' },
  unknown: { label: 'Sconosciuta', color: '#6b7280' },
}

export const SEED_CATEGORIES = [
  { id: 'acqua', label: 'Acqua', emoji: '💧', subcategories: ['Fontanella', 'Macchinetta', 'Distributore'] },
  { id: 'spot-mangiare', label: 'Spot per mangiare', emoji: '🍽️' },
]

export const MAX_PHOTOS = 5
