import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import guestTableApi from '../api/guestTableApi'
import publicApi from '../api/publicApi'
import { errorMessage } from '../api/axiosClient'
import { BrandLogo } from './HomeLayout'
import { DEFAULT_HOME } from '../pages/home/homeDefaults'
import GuestItemModal from '../pages/guest/GuestItemModal'
import { loadCart, newRequestKey, sameOptions, saveCart, setGuestToken } from '../utils/guestSession'
import { unitTotal } from '../utils/orderOptions'
import '../styles/guest.css'

const GuestContext = createContext(null)
/** Dữ liệu chung của trang khách tại bàn: bàn, menu, giỏ hàng. */
export const useGuest = () => useContext(GuestContext)

let lineSeq = 0

/**
 * Khung trang khách gọi món tại bàn (mở bằng QR: /menu?table=<mã QR bàn>).
 * Gọn cho điện thoại, tách riêng trang chủ và hệ thống quản lý.
 */
export default function GuestLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [brand, setBrand] = useState(DEFAULT_HOME)
  const [table, setTable] = useState(null)
  const [tableChecked, setTableChecked] = useState(false)
  const [tableError, setTableError] = useState('')
  const [menu, setMenu] = useState(null)
  const [menuError, setMenuError] = useState('')
  const [cart, setCart] = useState([])
  const [picking, setPicking] = useState(null) // { item, key?, initial? }
  const requestKey = useRef(null)

  useEffect(() => {
    publicApi.getHome().then((res) => setBrand({ ...DEFAULT_HOME, ...res.data })).catch(() => {})
  }, [])

  const loadMenu = useCallback(() => {
    setMenuError('')
    guestTableApi.getMenu()
      .then((res) => setMenu(res.data))
      .catch((e) => setMenuError(errorMessage(e, 'Chưa tải được thực đơn.')))
  }, [])
  useEffect(loadMenu, [loadMenu])

  // Quét QR (?table=...) -> xác nhận bàn; không có thì hỏi server phiên đang dùng.
  useEffect(() => {
    const qr = new URLSearchParams(location.search).get('table')
    if (qr) {
      setTableError('')
      guestTableApi.openTable(qr)
        .then((res) => {
          setGuestToken(res.data.token)
          setTable(res.data)
          navigate(location.pathname, { replace: true })
        })
        .catch((e) => setTableError(errorMessage(e, 'Không xác nhận được bàn.')))
        .finally(() => setTableChecked(true))
    } else if (!table) {
      guestTableApi.getContext()
        .then((res) => setTable(res.status === 204 ? null : res.data))
        .catch(() => setTable(null))
        .finally(() => setTableChecked(true))
    }
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Giỏ hàng lưu theo từng bàn
  useEffect(() => { setCart(loadCart(table?.tableId)) }, [table?.tableId])
  useEffect(() => { if (table) saveCart(table.tableId, cart) }, [cart, table])

  useEffect(() => {
    const previous = document.title
    document.title = `Gọi món - ${brand['home.brand.name'] || 'Gạch Coffee'}`
    return () => { document.title = previous }
  }, [brand])

  /** Phiên hết hạn (backend trả 410): xóa bàn, khách quét lại QR. */
  const expire = useCallback((message) => {
    setGuestToken(null)
    setTable(null)
    setTableError(message || 'Phiên gọi món đã hết hạn. Vui lòng quét lại mã QR trên bàn.')
  }, [])

  const changeCart = (updater) => {
    requestKey.current = null // giỏ đổi -> lần gửi tới là đơn mới
    setCart(updater)
  }

  const value = useMemo(() => {
    const count = cart.reduce((s, l) => s + l.quantity, 0)
    const total = cart.reduce((s, l) => s + unitTotal(l) * l.quantity, 0)
    return {
      table, tableChecked, tableError, menu, menuError, loadMenu, cart, count, total, expire,
      /** Mở hộp tùy chỉnh để thêm món, hoặc sửa 1 dòng trong giỏ (truyền line). */
      pickItem: (item, line) => setPicking(line ? { item, key: line.key, initial: line } : { item }),
      setQty: (key, delta) => changeCart((cur) => cur.map((l) => (
        l.key === key ? { ...l, quantity: Math.min(50, Math.max(1, l.quantity + delta)) } : l))),
      removeLine: (key) => changeCart((cur) => cur.filter((l) => l.key !== key)),
      clearCart: () => changeCart([]),
      /** Mã chống gửi trùng: giữ nguyên khi gửi lại cùng giỏ hàng. */
      requestKey: () => (requestKey.current ||= newRequestKey()),
    }
  }, [table, tableChecked, tableError, menu, menuError, loadMenu, cart, expire])

  const confirmLine = (line) => {
    const editingKey = picking?.key
    lineSeq += 1
    const key = `g${Date.now()}${lineSeq}`
    changeCart((cur) => {
      if (editingKey) return cur.map((l) => (l.key === editingKey ? { ...line, key: editingKey } : l))
      const same = cur.find((l) => sameOptions(l, line))
      if (same) return cur.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l))
      return [...cur, { ...line, key }]
    })
    setPicking(null)
  }

  return (
    <GuestContext.Provider value={value}>
      <div className="gx-shell">
        <header className="gx-header">
          <div className="gx-header-inner">
            <Link to="/menu" className="gx-brand" aria-label="Thực đơn"><BrandLogo content={brand} size="sm" /></Link>
            {table
              ? <span className="gx-table-chip"><i className="bi bi-geo-alt-fill" />{table.tableNumber}</span>
              : <span className="gx-table-chip muted"><i className="bi bi-qr-code-scan" />Chưa quét QR</span>}
          </div>
          <nav className="gx-tabs" aria-label="Gọi món">
            <NavLink to="/menu"><i className="bi bi-cup-hot" /><span>Thực đơn</span></NavLink>
            <NavLink to="/cart">
              <i className="bi bi-bag" /><span>Giỏ hàng</span>
              {value.count > 0 && <b className="gx-badge">{value.count}</b>}
            </NavLink>
            <NavLink to="/orders"><i className="bi bi-receipt" /><span>Đơn của tôi</span></NavLink>
          </nav>
        </header>

        <main className="gx-main">
          {tableError && (
            <div className="gx-alert" role="alert"><i className="bi bi-exclamation-circle" />{tableError}</div>
          )}
          <Outlet />
        </main>
      </div>

      <GuestItemModal show={!!picking} item={picking?.item} options={menu} initial={picking?.initial}
                      confirmText={picking?.key ? 'Cập nhật' : 'Thêm vào giỏ'}
                      onClose={() => setPicking(null)} onConfirm={confirmLine} />
    </GuestContext.Provider>
  )
}
