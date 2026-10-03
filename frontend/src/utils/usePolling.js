import { useEffect, useRef } from 'react'

/** Gọi fn ngay khi mở trang rồi lặp lại mỗi `ms` (mặc định 5 giây). Tạm dừng khi tab bị ẩn. */
export default function usePolling(fn, ms = 5000) {
  const saved = useRef(fn)
  useEffect(() => { saved.current = fn }, [fn])

  useEffect(() => {
    const tick = () => { if (document.visibilityState !== 'hidden') saved.current() }
    tick()
    const id = setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [ms])
}
