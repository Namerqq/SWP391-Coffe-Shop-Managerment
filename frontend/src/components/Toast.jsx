import { useCallback, useEffect, useState } from 'react'

// Hook hiện thông báo nhỏ 2.5 giây. Dùng: const [toast, showToast] = useToast(); showToast('Đã lưu')
export function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = useCallback((text, type = 'success') => setToast({ text, type, key: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])
  return [toast, showToast]
}

export default function Toast({ toast }) {
  if (!toast) return null
  return <div key={toast.key} className={`app-toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.text}</div>
}
