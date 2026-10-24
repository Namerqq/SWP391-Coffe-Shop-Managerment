import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import guestTableApi from '../api/guestTableApi'
import publicApi from '../api/publicApi'
import { errorMessage } from '../api/axiosClient'
import usePolling from '../utils/usePolling'
import { useToast } from '../context/ToastContext'
import { BrandLogo } from './HomeLayout'
import { DEFAULT_HOME } from '../pages/home/homeDefaults'
import GuestItemModal from '../pages/guest/GuestItemModal'
import {
  clearAllCarts, getGuestQr, getGuestToken, loadCart, markEndedHandled, newRequestKey, sameOptions, saveCart,
  setGuestQr, setGuestToken, SESSION_ENDED_CODE, wasEndedHandled,
} from '../utils/guestSession'
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
  const toast = useToast()
  const [brand, setBrand] = useState(DEFAULT_HOME)
  const [table, setTable] = useState(null)
  const [tableChecked, setTableChecked] = useState(false)
  const [tableError, setTableError] = useState('')
  const [sessionEnded, setSessionEnded] = useState(false) // lượt đã xong nhưng không tự mở lại được bàn -> cần quét QR
  const [menu, setMenu] = useState(null)
  const [menuError, setMenuError] = useState('')
  const [cart, setCart] = useState([])
  const [picking, setPicking] = useState(null)
  const orderRequestKey = useRef(null) // Giữ mã chống gửi trùng qua các lần render.
  const renewing = useRef(null) // Promise khi đang tự mở phiên mới sau khi lượt trước xong (null = không)
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
          setSessionEnded(false)
          response = await guestTableApi.openTable(qrCode)
        } else {
          response = await guestTableApi.getContext()
        }
        if (cancelled) return
        const tableData = response.status === 204 ? null : response.data
        if (qrCode) {
          setGuestToken(tableData.token)
          setGuestQr(qrCode)
        }
        orderRequestKey.current = null
        setTable(tableData)
        setCart(tableData ? loadCart(tableData.tableId) : [])
        if (qrCode) navigate(location.pathname, { replace: true })
      } catch (error) {
        if (cancelled) return
        if (qrCode) {
          setTableError(errorMessage(error, 'Không xác nhận được bàn.'))
        } else if (error.response?.status === 410) {
          expire(error) // lượt khách đã xong: xóa phiên + giỏ, hiện lời cảm ơn
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

  // Đang có phiên thì hỏi lại server mỗi 3 giây (+ ngay khi quay lại tab): lượt khách xong (đã phục vụ + thanh toán)
  // thì xóa ngay ở mọi trang (Thực đơn, Giỏ hàng, Đơn của tôi), không chờ khách bấm gì.
  usePolling(async () => {
    if (!table || renewing.current) return
    try {
      const response = await guestTableApi.getContext()
      if (response.status === 204) expire(null) // phiên hết hạn / backend khởi động lại
    } catch (error) {
      if (error.response?.status === 410) expire(error)
    }
  }, 3000)

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

  /**
   * Phiên không dùng được nữa (nhận lỗi 410 từ server, hoặc null khi phiên hết hạn).
   * Lượt khách đã xong (mã GUEST_SESSION_ENDED): bàn đã được giải phóng -> xoá đơn cũ và giỏ đã lưu trên máy,
   * rồi tự mở phiên mới cho đúng bàn vừa quét để khách gọi tiếp, không cần quét lại QR.
   * Không mở được phiên mới (bàn tạm ngưng, mất mạng...) thì mới yêu cầu quét lại QR.
   *
   * Trả về Promise<boolean>: true = đã có phiên mới dùng được (trang Giỏ hàng dựa vào đó để gửi lại đơn).
   * options.keepCart = true: giữ giỏ đang chọn (khách vừa bấm Gửi đơn đúng lúc lượt trước kết thúc).
   */
  function expire(error, options = {}) {
    const headers = error?.config?.headers
    const sentToken = headers?.get?.('X-Guest-Token') ?? headers?.['X-Guest-Token'] ?? null
    const current = getGuestToken()
    // Phản hồi trễ của phiên cũ: trang đã chuyển sang phiên mới rồi -> không làm gì thêm.
    if (sentToken && sentToken !== current) return Promise.resolve(!!current)
    // Đang mở phiên mới (nhiều yêu cầu cùng nhận 410) -> chờ chung 1 lần mở.
    if (renewing.current) return renewing.current

    const ended = error?.response?.data?.code === SESSION_ENDED_CODE
    orderRequestKey.current = null
    if (!options.keepCart) setCart([])

    const savedQr = getGuestQr()
    if (!ended || !savedQr) {
      if (ended) clearAllCarts()
      setGuestToken(null)
      setTable(null)
      setSessionEnded(ended)
      setTableError(ended ? '' : (error ? errorMessage(error) : 'Phiên gọi món đã hết hạn. Vui lòng quét lại mã QR trên bàn.'))
      return Promise.resolve(false)
    }

    // Lượt đã xong: mở phiên mới cho đúng bàn. "Cảm ơn quý khách" chỉ báo 1 lần cho mỗi lượt.
    const firstTime = !wasEndedHandled(sentToken)
    markEndedHandled(sentToken)
    clearAllCarts()
    renewing.current = (async () => {
      try {
        // Gửi kèm token cũ (đã kết thúc) cũng được: server không dùng lại mà cấp token mới.
        const response = await guestTableApi.openTable(savedQr)
        setGuestToken(response.data.token)
        setTable(response.data)
        setTableError('')
        setSessionEnded(false)
        if (firstTime) toast(`Cảm ơn quý khách! ${response.data.tableNumber} sẵn sàng, bạn có thể gọi món mới.`)
        return true
      } catch {
        // Không mở lại được: yêu cầu quét lại QR.
        setGuestToken(null)
        setTable(null)
        setCart([])
        setSessionEnded(true)
        return false
      } finally {
        renewing.current = null
      }
    })()
    return renewing.current
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
          {sessionEnded && !table && (
            <div className="gx-notice" role="status">
              <i className="bi bi-emoji-smile" />
              <div>
                <strong>Cảm ơn quý khách!</strong>
                <span>Quét lại mã QR trên bàn để gọi món mới.</span>
              </div>
            </div>
          )}
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
