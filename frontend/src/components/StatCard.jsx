export default function StatCard({ icon: Icon, label, value, sub, color = 'var(--color-primary)', children }) {
  return (
    <div className="card">
      <div className="accent-bar" style={{ background: color }} />
      <div className="card-title">
        {Icon && <Icon size={13} strokeWidth={2} color={color} />}
        {label}
      </div>
      {value !== undefined ? <div className="big-number">{value}</div> : null}
      {sub && <div className="muted small" style={{ marginTop: 2 }}>{sub}</div>}
      {children}
    </div>
  )
}
