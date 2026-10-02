import { useEffect } from 'react'

// Modal dùng chung (không cần bootstrap.js). Bấm nền tối hoặc phím Esc để đóng.
export default function AppModal({ show, title, onClose, children, footer, width = 560 }) {
  useEffect(() => {
    if (!show) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="app-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="app-modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="app-modal-header">
          <h5 className="app-modal-title">{title}</h5>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <div className="app-modal-body">{children}</div>
        {footer && <div className="app-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
