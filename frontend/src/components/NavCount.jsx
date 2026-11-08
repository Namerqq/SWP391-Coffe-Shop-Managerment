import { useCallback, useEffect, useState } from 'react'
import usePolling from '../utils/usePolling'

/** Sự kiện để màn hình báo menu trái đếm lại ngay (vd: vừa giao xong 1 đơn). */
export const NAV_COUNT_REFRESH = 'nav-count:refresh'
export const refreshNavCounts = () => window.dispatchEvent(new Event(NAV_COUNT_REFRESH))

/**
 * Chấm đỏ có số trên icon của 1 mục menu trái.
 * fetchCount: hàm trả về Promise<number>. Hỏi lại mỗi `ms`; số = 0 hoặc lỗi thì ẩn.
 */
export default function NavCount({ fetchCount, label = 'mục', ms = 5000 }) {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    try {
      setCount(await fetchCount())
    } catch {
      setCount(0)
    }
  }, [fetchCount])
  usePolling(load, ms)

  useEffect(() => {
    window.addEventListener(NAV_COUNT_REFRESH, load)
    return () => window.removeEventListener(NAV_COUNT_REFRESH, load)
  }, [load])

  if (!count) return null
  return (
    <span className="nav-count" title={`${count} ${label}`}>
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="visually-hidden">{count} {label}</span>
    </span>
  )
}
