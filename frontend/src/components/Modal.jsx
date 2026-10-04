import { useEffect } from 'react'

// Modal Bootstrap điều khiển bằng React (không cần bootstrap.bundle.js).
export default function Modal({ show, title, onClose, children, footer, size }) {
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
    <>
      <div className="cf-modal-backdrop" onClick={onClose} />
      <div className="modal cf-modal" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
        <div className={`modal-dialog modal-dialog-centered ${size ? `modal-${size}` : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Đóng" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  )
}
