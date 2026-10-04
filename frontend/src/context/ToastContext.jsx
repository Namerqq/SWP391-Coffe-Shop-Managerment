import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

// toast('Đã lưu')  hoặc  toast('Lỗi...', 'error')
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="cf-toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`cf-toast ${t.type}`}>
            <i className={`bi ${t.type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
