import { useEffect, useState } from 'react'
import { UploadCloud, FileCheck2 } from 'lucide-react'
import { api } from '../api/client'
import { EVENT_COLORS } from '../components/RiskBadge'

const EVENT_TYPES = Object.keys(EVENT_COLORS)
const FORMATIONS = ['Girujan', 'Tipam', 'Barail', 'Kopili']

export default function KnowledgeDocuments() {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [draft, setDraft] = useState(null)
  const [message, setMessage] = useState('')

  function refresh() {
    api.listDocuments().then(setDocuments).catch(() => {})
  }
  useEffect(refresh, [])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    try {
      const res = await api.uploadDocument(file)
      setDraft({ document_id: res.document_id, notes: '', ...res.extracted })
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function updateDraft(field, value) {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  async function handleConfirm() {
    try {
      const res = await api.confirmDocument(draft)
      setMessage(res.message)
      setDraft(null)
      refresh()
    } catch (err) {
      alert('Save failed: ' + err.message)
    }
  }

  return (
    <div>
      <h1>Knowledge & Documents</h1>
      <p className="muted">Upload a WCR/DDR-style PDF, review the extracted fields, then commit to the knowledge repository. Nothing is auto-saved before your review.</p>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title"><UploadCloud size={13} strokeWidth={1.8} /> Upload document</div>
        <label
          htmlFor="pdf-upload"
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius)',
            background: '#fafafa', cursor: 'pointer',
          }}
        >
          <UploadCloud size={20} color="#71717a" />
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>Click to choose a PDF</div>
            <div className="small muted">WCR / DDR-style document — text extracted with PyMuPDF</div>
          </div>
          <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {uploading && <p className="muted small" style={{ marginTop: 10 }}>Extracting text (PyMuPDF)…</p>}
        {message && <p style={{ color: '#15803d', marginTop: 10 }}>{message}</p>}
      </div>

      {draft && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title"><FileCheck2 size={13} strokeWidth={1.8} /> Review extracted fields — human-in-the-loop</div>
          {draft.raw_excerpt && (
            <details style={{ marginBottom: 12 }}>
              <summary className="small muted">Raw extracted text excerpt</summary>
              <pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{draft.raw_excerpt}</pre>
            </details>
          )}
          <div className="grid grid-2">
            <label>
              <div className="small muted">Well</div>
              <input className="input" style={{ width: '100%' }} value={draft.well || ''} onChange={(e) => updateDraft('well', e.target.value)} />
            </label>
            <label>
              <div className="small muted">Depth (m)</div>
              <input className="input" style={{ width: '100%' }} type="number" value={draft.depth ?? ''} onChange={(e) => updateDraft('depth', parseFloat(e.target.value))} />
            </label>
            <label>
              <div className="small muted">Formation</div>
              <select className="input" style={{ width: '100%' }} value={draft.formation || ''} onChange={(e) => updateDraft('formation', e.target.value)}>
                <option value="">—</option>
                {FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label>
              <div className="small muted">Event type</div>
              <select className="input" style={{ width: '100%' }} value={draft.event_type || ''} onChange={(e) => updateDraft('event_type', e.target.value)}>
                <option value="">—</option>
                {EVENT_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 10 }}>
            <div className="small muted">Mitigation</div>
            <textarea className="input" rows={2} value={draft.mitigation || ''} onChange={(e) => updateDraft('mitigation', e.target.value)} />
          </label>
          <label style={{ display: 'block', marginTop: 10 }}>
            <div className="small muted">Notes / lesson</div>
            <textarea className="input" rows={2} value={draft.notes || ''} onChange={(e) => updateDraft('notes', e.target.value)} />
          </label>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleConfirm}>Add to Knowledge Repository</button>
            <button className="btn-outline" onClick={() => setDraft(null)}>Discard</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">Uploaded documents</div>
        {documents.length === 0 && <p className="muted">No documents uploaded yet. Try the sample PDFs in /documents.</p>}
        <table>
          <thead><tr><th>Filename</th><th>Uploaded</th><th>Well</th><th>Event</th><th>Reviewed</th></tr></thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.filename + d.uploaded_at}>
                <td>{d.filename}</td>
                <td>{new Date(d.uploaded_at).toLocaleString()}</td>
                <td>{d.extracted?.well}</td>
                <td>{d.extracted?.event_type}</td>
                <td>{d.reviewed ? 'Yes' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
