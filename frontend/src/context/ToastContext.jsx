import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

// toast('Đã lưu')  hoặc  toast('Lỗi...', 'error')  hoặc  toast({ message, type })
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((messageOrObj, maybeType = 'success') => {
    let message = messageOrObj
    let type = maybeType
    if (typeof messageOrObj === 'object' && messageOrObj !== null) {
      message = messageOrObj.message
      type = messageOrObj.type || 'success'
    }
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  // Hỗ trợ cả 2 kiểu dùng: const toast = useToast() HOẶC const { addToast } = useToast()
  show.addToast = show
  show.show = show

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
