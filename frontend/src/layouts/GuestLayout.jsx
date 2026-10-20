import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import guestTableApi from '../api/guestTableApi'
import publicApi from '../api/publicApi'
import { errorMessage } from '../api/axiosClient'
import { BrandLogo } from './HomeLayout'
import { DEFAULT_HOME } from '../pages/home/homeDefaults'
import GuestItemModal from '../pages/guest/GuestItemModal'
import { loadCart, newRequestKey, sameOptions, saveCart, setGuestToken } from '../utils/guestSession'
import { isSizeItem, standaloneCategories, unitTotal } from '../utils/orderOptions'
import '../styles/guest.css'

const GuestContext = createContext(null)
const MAX_QUANTITY = 50
let lineSequence = 0

/** Lấy dữ liệu dùng chung cho trang Thực đơn, Giỏ hàng và Đơn của tôi. */
export function useGuest() {
  return useContext(GuestContext)
}

/** Tải menu lần đầu hoặc khi nhấn Thử lại; loại size khỏi món bán riêng. */
async function loadMenuData(setMenu, setMenuError) {
  setMenuError('')
  try {
    const response = await guestTableApi.getMenu()
    setMenu({ ...response.data, categories: standaloneCategories(response.data) })
  } catch (error) {
    setMenuError(errorMessage(error, 'Chưa tải được thực đơn.'))
  }
}

/** Khung trang khách tại bàn: quản lý phiên QR, menu, giỏ hàng và hộp chọn món. */
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
  const [picking, setPicking] = useState(null)
  const orderRequestKey = useRef(null) // Giữ mã chống gửi trùng qua các lần render.
  const qrCode = new URLSearchParams(location.search).get('table')
  const tableId = table ? table.tableId : null

  // Tải thông tin quán và menu khi mở trang; lỗi cấu hình thì dùng thương hiệu mặc định.
  useEffect(() => {
    async function loadBrand() {
      try {
        const response = await publicApi.getHome()
        setBrand({ ...DEFAULT_HOME, ...response.data })
      } catch {
        // Giữ DEFAULT_HOME nếu chưa tải được cấu hình quán.
      }
    }
    loadBrand()
    loadMenuData(setMenu, setMenuError)
  }, [])

  // Xác nhận bàn từ QR hoặc phiên cũ, rồi khôi phục đúng giỏ; bỏ phản hồi đã lỗi thời.
  useEffect(() => {
    if (!qrCode && table) return
    let cancelled = false
    async function checkTable() {
      try {
        let response
        if (qrCode) {
          setTableError('')
          response = await guestTableApi.openTable(qrCode)
        } else {
          response = await guestTableApi.getContext()
        }
        if (cancelled) return
        const tableData = response.status === 204 ? null : response.data
        if (qrCode) setGuestToken(tableData.token)
        orderRequestKey.current = null
        setTable(tableData)
        setCart(tableData ? loadCart(tableData.tableId) : [])
        if (qrCode) navigate(location.pathname, { replace: true })
      } catch (error) {
        if (cancelled) return
        if (qrCode) {
          setTableError(errorMessage(error, 'Không xác nhận được bàn.'))
        } else {
          setTable(null)
          setCart([])
        }
      } finally {
        if (!cancelled) setTableChecked(true)
      }
    }
    checkTable()
    return () => { cancelled = true }
  }, [qrCode, location.pathname, navigate, table])

  // Loại dòng size bán riêng trong giỏ cũ và lưu giỏ hợp lệ theo bàn.
  useEffect(() => {
    const validCart = []
    for (const line of cart) {
      if (!menu || !isSizeItem(line, menu)) validCart.push(line)
    }
    if (validCart.length !== cart.length) {
      orderRequestKey.current = null
      setCart(validCart)
    }
    if (tableId) saveCart(tableId, validCart)
  }, [tableId, cart, menu])

  // Đổi tiêu đề theo tên quán và khôi phục khi rời trang khách.
  useEffect(() => {
    const previousTitle = document.title
    document.title = `Gọi món - ${brand['home.brand.name'] || 'Gạch Coffee'}`
    return () => { document.title = previousTitle }
  }, [brand])

  /** Khi phiên hết hạn, xoá token và giỏ trên giao diện rồi yêu cầu quét lại QR. */
  function expire(message) {
    setGuestToken(null)
    setTable(null)
    setCart([])
    orderRequestKey.current = null
    setTableError(message || 'Phiên gọi món đã hết hạn. Vui lòng quét lại mã QR trên bàn.')
  }

  /** Tăng/giảm số lượng trong khoảng 1–50, không sửa trực tiếp state cũ. */
  function setQty(key, delta) {
    orderRequestKey.current = null
    setCart(function (currentCart) {
      const updatedCart = []
      for (const line of currentCart) {
        if (line.key === key) {
          const quantity = Math.min(MAX_QUANTITY, Math.max(1, line.quantity + delta))
          updatedCart.push({ ...line, quantity })
        } else {
          updatedCart.push(line)
        }
      }
      return updatedCart
    })
  }

  /** Lưu lựa chọn: sửa dòng cũ, gộp món trùng hoặc thêm dòng mới; giới hạn 50 phần. */
  function confirmLine(newLine) {
    const editingKey = picking ? picking.key : null
    lineSequence += 1
    const newKey = `g${Date.now()}${lineSequence}`
    orderRequestKey.current = null
    setCart(function (currentCart) {
      const updatedCart = []
      let matchingLine = null
      if (!editingKey) {
        for (const line of currentCart) {
          if (sameOptions(line, newLine)) {
            matchingLine = line
            break
          }
        }
      }

      for (const line of currentCart) {
        if (editingKey && line.key === editingKey) {
          updatedCart.push({ ...newLine, key: editingKey })
        } else if (!editingKey && line === matchingLine) {
          const quantity = Math.min(MAX_QUANTITY, line.quantity + newLine.quantity)
          updatedCart.push({ ...line, quantity })
        } else {
          updatedCart.push(line)
        }
      }
      if (!editingKey && !matchingLine) updatedCart.push({ ...newLine, key: newKey })
      return updatedCart
    })
    setPicking(null)
  }

  // Tính số món và tổng tiền trực tiếp bằng vòng lặp, không cần useMemo.
  let count = 0
  let total = 0
  for (const line of cart) {
    count += line.quantity
    total += unitTotal(line) * line.quantity
  }
  // Các thao tác ngắn đặt ngay trong Context, không tách thành hàm phụ.
  const guestData = {
    table, tableChecked, tableError, menu, menuError, cart, count, total, expire, setQty,
    loadMenu: () => loadMenuData(setMenu, setMenuError),
    pickItem(item, line) {
      if (!isSizeItem(item, menu)) {
        setPicking(line ? { item, key: line.key, initial: line } : { item })
      }
    },
    removeLine(key) {
      orderRequestKey.current = null
      setCart(function (currentCart) {
        const remainingCart = []
        for (const line of currentCart) {
          if (line.key !== key) remainingCart.push(line)
        }
        return remainingCart
      })
    },
    clearCart() {
      orderRequestKey.current = null
      setCart([])
    },
    requestKey() {
      if (!orderRequestKey.current) orderRequestKey.current = newRequestKey()
      return orderRequestKey.current
    },
  }
  let confirmText = 'Thêm vào giỏ'
  if (picking && picking.key) confirmText = 'Cập nhật'

  return (
    <GuestContext.Provider value={guestData}>
      <div className="gx-shell">
        <header className="gx-header">
          <div className="gx-header-inner">
            <Link to="/menu" className="gx-brand" aria-label="Thực đơn">
              <BrandLogo content={brand} size="sm" />
            </Link>
            {table ? (
              <span className="gx-table-chip">
                <i className="bi bi-geo-alt-fill" />{table.tableNumber}
              </span>
            ) : (
              <span className="gx-table-chip muted">
                <i className="bi bi-qr-code-scan" />Chưa quét QR
              </span>
            )}
          </div>
          <nav className="gx-tabs" aria-label="Gọi món">
            <NavLink to="/menu"><i className="bi bi-cup-hot" /><span>Thực đơn</span></NavLink>
            <NavLink to="/cart">
              <i className="bi bi-bag" /><span>Giỏ hàng</span>
              {count > 0 && <b className="gx-badge">{count}</b>}
            </NavLink>
            <NavLink to="/orders"><i className="bi bi-receipt" /><span>Đơn của tôi</span></NavLink>
          </nav>
        </header>
        <main className="gx-main">
          {tableError && (
            <div className="gx-alert" role="alert">
              <i className="bi bi-exclamation-circle" />{tableError}
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <GuestItemModal
        show={picking !== null} item={picking ? picking.item : null} options={menu}
        initial={picking ? picking.initial : null} confirmText={confirmText}
        onClose={() => setPicking(null)} onConfirm={confirmLine}
      />
    </GuestContext.Provider>
  )
}
