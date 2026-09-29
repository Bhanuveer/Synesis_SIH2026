import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, MapPinned, GitCompareArrows, BookOpenText,
  ActivitySquare, BellRing, Search, ShieldCheck,
} from 'lucide-react'
import { api } from '../api/client'

const PAGES = [
  { to: '/', label: 'Decision Support', icon: LayoutDashboard },
  { to: '/nearby-wells', label: 'Nearby Wells', icon: MapPinned },
  { to: '/correlation', label: 'Well Correlation', icon: GitCompareArrows },
  { to: '/knowledge', label: 'Knowledge & Documents', icon: BookOpenText },
  { to: '/risk-live', label: 'Risk & Live eRTMAC', icon: ActivitySquare },
  { to: '/alerts', label: 'Alerts & Feedback', icon: BellRing },
  { to: '/query', label: 'Query', icon: Search },
  { to: '/validation', label: 'Validation', icon: ShieldCheck },
]

export default function Layout() {
  const [resetting, setResetting] = useState(false)
  const location = useLocation()

  async function handleReset() {
    if (!confirm('Reset all demo data? This clears wells, alerts, feedback and the knowledge repository back to the seeded baseline.')) return
    setResetting(true)
    try {
      await api.resetDemo()
      window.location.reload()
    } catch (e) {
      alert('Reset failed: ' + e.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="name">SYNESIS</div>
          <div className="sub">eRTMAC-NWIS</div>
        </div>
        {PAGES.map((p, i) => {
          const isActive = p.to === '/' ? location.pathname === '/' : location.pathname.startsWith(p.to)
          const Icon = p.icon
          return (
            <NavLink
              key={p.to}
              to={p.to}
              end={p.to === '/'}
              className={'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-num">{String(i + 1).padStart(2, '0')}</span>
              <Icon size={15} strokeWidth={1.8} />
              <span>{p.label}</span>
            </NavLink>
          )
        })}
      </aside>
      <div className="main-area">
        <div className="topbar">
          <div className="proto-strip">
            <span className="badge badge-blue">PROTOTYPE</span>
            <span className="badge badge-gray">DEMO DATA</span>
            <span className="badge badge-gray">SIMULATED eRTMAC</span>
          </div>
          <button className="btn-danger" onClick={handleReset} disabled={resetting}>
            {resetting ? 'Resetting…' : 'Reset demo data'}
          </button>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
