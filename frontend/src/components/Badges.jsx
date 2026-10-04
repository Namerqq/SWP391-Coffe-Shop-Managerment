import { roleLabel, STATUS_LABELS } from '../utils/format'

export function StatusBadge({ status }) {
  const cls = { ACTIVE: 'badge-active', INACTIVE: 'badge-inactive', LOCKED: 'badge-locked' }[status] || 'badge-inactive'
  return (
    <span className={`cf-badge ${cls}`}>
      <span className="dot" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function RoleBadge({ role }) {
  return <span className="cf-badge badge-role">{roleLabel(role)}</span>
}
