import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import ConfirmModal from '../../components/ConfirmModal'
import ItemOptionsModal from '../../components/order/ItemOptionsModal'
import { formatMoney, formatTime, itemOptionsText } from '../../utils/orderFormat'
import { findMenuItem, toItemRequest, unitTotal } from '../../utils/orderOptions'
import PaymentModal from './PaymentModal'
import QrPaymentDialog from './QrPaymentDialog'
import { markQrAnnounced } from './qrScreen'
import '../../styles/cashier.css'

// Take-away Order (Cashier POS) — SRS 1.3.3. UC-C01..C04. Khách trả tiền trước rồi đơn mới vào hàng chờ pha.
// Trả bằng mã QR payOS: đơn CHƯA được tạo cho tới khi tiền về. Trong lúc chờ, giỏ hàng bị khóa (muốn sửa
// hoặc thu cách khác thì hủy mã trước); "Bán đơn khác" để bán tiếp, mã cũ vẫn chờ ở danh sách phía trên.
const plain = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()

const sameOptions = (a, b) => a.menuItemId === b.menuItemId && a.sizeId === b.sizeId
  && [...a.toppingIds].sort().join(',') === [...b.toppingIds].sort().join(',')
  && a.sugarLevel === b.sugarLevel && a.iceLevel === b.iceLevel && (a.note || '') === (b.note || '')

let lineSeq = 0

export default function TakeawayPOS() {
  const navigate = useNavigate()
  const toast = useToast()
  const [menu, setMenu] = useState(null)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [cat, setCat] = useState('ALL')
  const [cart, setCart] = useState([])
  const [picking, setPicking] = useState(null) // { item, key?, initial? }
  const [note, setNote] = useState('')
  const [paying, setPaying] = useState(false)
  const [cartQr, setCartQr] = useState(null) // mã QR tạo từ giỏ hàng đang hiện trên màn
  const [pendingQrs, setPendingQrs] = useState([]) // mọi mã QR mang đi đang chờ khách quét
  const [viewQr, setViewQr] = useState(null) // { qr, cart }: mã đang mở lại để khách quét
  const [cancelQr, setCancelQr] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const locked = cartQr?.status === 'PENDING'

  useEffect(() => {
    staffApi.getMenu()
      .then((res) => setMenu(res.data))
      .catch((e) => setError(errorMessage(e, 'Không tải được menu.')))
  }, [])

  const loadPending = useCallback(async () => {
    try {
      setPendingQrs((await cashierApi.getPendingQrs({ target: 'TAKEAWAY' })).data)
    } catch {
      // bỏ qua, lần sau hỏi lại
    }
  }, [])
  usePolling(loadPending, 5000)

  // Mã của giỏ hiện tại không còn chờ (khách trả lúc hộp QR đã đóng, hoặc hết hạn) -> cập nhật, mở khóa giỏ.
  useEffect(() => {
    if (!locked || paying || viewQr || pendingQrs.some((q) => q.id === cartQr.id)) return
    cashierApi.getQr(cartQr.id).then((res) => {
      if (res.data.status === 'PAID') {
        setCart([])
        setNote('')
        setCartQr(null)
      } else if (res.data.status !== 'PENDING') {
        setCartQr(res.data)
      }
    }).catch(() => {})
  }, [pendingQrs]) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(() => menu?.categories || [], [menu])
  const items = useMemo(() => {
    const kw = plain(keyword.trim())
    return categories
      .filter((c) => cat === 'ALL' || c.id === cat)
      .flatMap((c) => c.items)
      .filter((i) => !kw || plain(i.name).includes(kw))
  }, [categories, cat, keyword])

  const subtotal = cart.reduce((s, l) => s + unitTotal(l) * l.quantity, 0)
  const count = cart.reduce((s, l) => s + l.quantity, 0)
  const otherQrs = pendingQrs.filter((q) => !(cartQr && q.id === cartQr.id))

  const confirmLine = (line) => {
    const editingKey = picking?.key
    lineSeq += 1
    const newKey = `l${lineSeq}`
    setCart((cur) => {
      if (editingKey) return cur.map((l) => (l.key === editingKey ? { ...line, key: editingKey } : l))
      const same = cur.find((l) => sameOptions(l, line))
      if (same) return cur.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l))
      return [...cur, { ...line, key: newKey }]
    })
    setPicking(null)
  }

  const setQty = (key, delta) => setCart((cur) => cur.map((l) => (
    l.key === key ? { ...l, quantity: Math.min(50, Math.max(1, l.quantity + delta)) } : l)))
  const removeLine = (key) => setCart((cur) => cur.filter((l) => l.key !== key))
  const clearAll = () => { setCart([]); setNote('') }

  const editLine = (l) => setPicking({
    item: findMenuItem(menu, l.menuItemId) || { id: l.menuItemId, name: l.itemName, price: l.unitPrice },
    key: l.key,
    initial: l,
  })

  const paid = (result) => {
    setPaying(false)
    setViewQr(null)
    setCartQr(null)
    const no = result.orderNumber ? `#${result.orderNumber.split('-').pop()}` : ''
    toast(`Đã thu ${formatMoney(result.amount)}. Đơn ${no} đã gửi pha chế.`)
    clearAll()
    navigate(`/cashier/receipt/${result.paymentId}`)
  }

  /** Bán tiếp cho khách sau: bỏ giỏ hiện tại khỏi màn hình, mã QR của giỏ này vẫn chờ ở danh sách phía trên. */
  const releaseCart = () => {
    setCartQr(null)
    clearAll()
    toast('Mã QR của giỏ trước vẫn chờ khách quét ở danh sách phía trên.')
  }

  const confirmCancelQr = async () => {
    setCancelling(true)
    try {
      const v = (await cashierApi.cancelQr(cancelQr.id)).data
      const isCart = cartQr && v.id === cartQr.id
      if (v.status === 'PAID') {
        markQrAnnounced(v.id)
        toast(`Khách vừa thanh toán xong ${formatMoney(v.amount)}, đơn đã gửi pha chế.`)
        if (isCart) {
          clearAll()
          setCartQr(null)
        }
      } else {
        toast(isCart ? 'Đã hủy mã QR. Giỏ hàng đã mở lại để sửa hoặc thu cách khác.' : 'Đã hủy mã QR.')
        if (isCart) setCartQr(null)
      }
      setCancelQr(null)
      loadPending()
    } catch (e) {
      toast(errorMessage(e, 'Không hủy được mã QR.'), 'error')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title">Bán mang đi</h1>
        <p className="page-subtitle">Khách trả tiền trước. Đơn mang đi không sửa hay hủy được sau khi thu tiền.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {otherQrs.length > 0 && (
        <div className="cf-card qr-strip mb-3">
          <div className="qr-strip-title"><i className="bi bi-qr-code-scan me-1" aria-hidden="true" />Mã QR mang đi đang chờ khách quét</div>
          {otherQrs.map((q) => (
            <div className="qr-strip-row" key={q.id}>
              <span className="fw-semibold">{formatMoney(q.amount)}</span>
              <span className="cell-sub">{q.itemCount} món, hết hạn lúc {formatTime(q.expiresAt)}</span>
              <span className="ms-auto d-flex gap-2">
                <button type="button" className="btn btn-light-soft btn-sm" onClick={() => setViewQr({ qr: q, cart: false })}>Xem mã</button>
                <button type="button" className="btn btn-light-soft btn-sm" onClick={() => setCancelQr(q)}>Hủy mã</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pos-layout">
        <div className="cf-card p-3" style={{ minWidth: 0 }}>
          <div className="input-icon mb-3">
            <i className="bi bi-search" />
            <input className="form-control" placeholder="Tìm món (gõ không dấu cũng được)" value={keyword}
                   aria-label="Tìm món" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="chip-tabs mb-3" role="tablist" aria-label="Danh mục">
            <button type="button" role="tab" aria-selected={cat === 'ALL'} className={cat === 'ALL' ? 'active' : ''} onClick={() => setCat('ALL')}>Tất cả</button>
            {categories.map((c) => (
              <button type="button" role="tab" key={c.id} aria-selected={cat === c.id} className={cat === c.id ? 'active' : ''}
                      onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>

          {!menu && !error && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải menu...</div>}
          <div className="pos-grid">
            {items.map((i) => (
              <button type="button" key={i.id} className="pos-item" disabled={locked} onClick={() => setPicking({ item: i })}>
                <span className="pos-item-name">{i.name}</span>
                <span className="pos-item-price">{formatMoney(i.price)}</span>
              </button>
            ))}
          </div>
          {menu && items.length === 0 && (
            <div className="empty-state py-4">{keyword ? 'Không tìm thấy món phù hợp.' : 'Chưa có món nào đang bán.'}</div>
          )}
        </div>

        <aside className={`cf-card pos-cart${locked ? ' is-locked' : ''}`}>
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <span className="fw-semibold">Món đã chọn</span>
            <span className="cell-sub">{count} món</span>
          </div>
          <div className="px-3 pos-cart-lines">
            {cart.length === 0 && <div className="cell-sub py-3">Chưa có món nào. Bấm vào món để thêm.</div>}
            {cart.map((l) => (
              <div className="cart-line" key={l.key}>
                <div className="d-flex justify-content-between gap-2">
                  <button type="button" className="cart-line-name" title="Sửa lựa chọn" disabled={locked} onClick={() => editLine(l)}>{l.itemName}</button>
                  <span className="text-nowrap fw-semibold">{formatMoney(unitTotal(l) * l.quantity)}</span>
                </div>
                {itemOptionsText(l) && <div className="cell-sub">{itemOptionsText(l)}</div>}
                {l.note && <div className="order-note">{l.note}</div>}
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <div className="qty-stepper">
                    <button type="button" aria-label="Giảm" disabled={locked || l.quantity <= 1} onClick={() => setQty(l.key, -1)}>−</button>
                    <span>{l.quantity}</span>
                    <button type="button" aria-label="Tăng" disabled={locked || l.quantity >= 50} onClick={() => setQty(l.key, 1)}>+</button>
                  </div>
                  <button type="button" className="btn btn-link btn-sm p-0 cart-remove" disabled={locked} onClick={() => removeLine(l.key)}>Bỏ món</button>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="px-3 pt-2">
              <input className="form-control form-control-sm" placeholder="Ghi chú cho cả đơn (không bắt buộc)" maxLength={500}
                     value={note} aria-label="Ghi chú cho cả đơn" disabled={locked} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          {locked && (
            <div className="cart-qr-banner">
              <div className="fw-semibold"><i className="bi bi-qr-code-scan me-1" aria-hidden="true" />Đang chờ khách quét mã QR {formatMoney(cartQr.amount)}</div>
              <div className="cell-sub">Khách trả xong, đơn tự gửi pha chế. Muốn sửa giỏ hoặc thu cách khác thì hủy mã trước.</div>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setViewQr({ qr: cartQr, cart: true })}>Xem mã QR</button>
                <button type="button" className="btn btn-light-soft btn-sm" onClick={() => setCancelQr(cartQr)}>Hủy mã</button>
                <button type="button" className="btn btn-light-soft btn-sm" onClick={releaseCart}>Bán đơn khác</button>
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span>Tạm tính</span>
              <span className="fs-4 fw-bold">{formatMoney(subtotal)}</span>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light-soft" disabled={cart.length === 0 || locked} onClick={clearAll}>Xóa hết</button>
              <button type="button" className="btn btn-primary flex-grow-1 py-2" disabled={cart.length === 0}
                      onClick={() => (locked ? setViewQr({ qr: cartQr, cart: true }) : setPaying(true))}>
                {locked ? 'Xem mã QR' : 'Thanh toán'}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <ItemOptionsModal show={!!picking} item={picking?.item} options={menu} initial={picking?.initial}
                        confirmText={picking?.key ? 'Cập nhật' : 'Thêm vào đơn'}
                        onClose={() => setPicking(null)} onConfirm={confirmLine} />
      <PaymentModal show={paying} title="Thanh toán đơn mang đi" subtotal={subtotal} transferNote="Mang di"
                    onClose={() => { setPaying(false); loadPending() }}
                    onSubmit={(payload) => cashierApi.takeaway({ ...payload, items: cart.map(toItemRequest), note: note.trim() || null })}
                    onCreateQr={(payload) => cashierApi.createTakeawayQr({ ...payload, items: cart.map(toItemRequest), note: note.trim() || null })}
                    onQrChange={(v) => setCartQr(v)}
                    onPaid={paid} />
      <QrPaymentDialog qr={viewQr?.qr} title="Thanh toán QR mang đi"
                       autoContinue={!!viewQr?.cart || cart.length === 0}
                       onChange={(v) => { if (viewQr?.cart) setCartQr(v) }}
                       onPaid={paid}
                       onClose={() => { setViewQr(null); loadPending() }} />
      <ConfirmModal show={!!cancelQr} title="Hủy mã QR?" danger confirmText="Hủy mã" loading={cancelling}
                    message="Chỉ hủy khi khách chưa chuyển tiền. Hủy xong có thể thu bằng cách khác."
                    onConfirm={confirmCancelQr} onClose={() => setCancelQr(null)} />
    </>
  )
}
