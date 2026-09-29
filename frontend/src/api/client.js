const BASE = '/api'

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getWells: () => fetch(`${BASE}/wells`).then(handle),
  getActiveWell: () => fetch(`${BASE}/wells/active`).then(handle),
  getNearbyWells: (radiusKm) => fetch(`${BASE}/wells/nearby?radius_km=${radiusKm}`).then(handle),
  getWell: (name) => fetch(`${BASE}/wells/${name}`).then(handle),
  getCorrelation: (names) => fetch(`${BASE}/wells/correlation/data?names=${encodeURIComponent(names.join(','))}`).then(handle),

  listDocuments: () => fetch(`${BASE}/documents`).then(handle),
  uploadDocument: (file) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/documents/upload`, { method: 'POST', body: form }).then(handle)
  },
  confirmDocument: (entry) =>
    fetch(`${BASE}/documents/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).then(handle),

  runQuery: (text, radiusKm) =>
    fetch(`${BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, radius_km: radiusKm }),
    }).then(handle),

  listAlerts: () => fetch(`${BASE}/alerts`).then(handle),
  sendFeedback: (alertId, payload) =>
    fetch(`${BASE}/alerts/${alertId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),

  getValidation: () => fetch(`${BASE}/validation`).then(handle),

  resetDemo: () => fetch(`${BASE}/reset`, { method: 'POST' }).then(handle),
}
