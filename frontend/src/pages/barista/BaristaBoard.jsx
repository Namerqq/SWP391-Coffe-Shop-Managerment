import { useEffect, useState } from 'react'
import baristaApi from '../../api/baristaApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { ON_BOARD, isItemCancelled, isItemDone, isItemReady, isItemWaiting } from '../../utils/itemStatus'
import { itemOptionsText } from '../../utils/orderFormat'
import { DEFAULT_LEVEL } from '../../utils/orderOptions'
import ConfirmModal from '../../components/ConfirmModal'
import OrderTicket from '../serving/OrderTicket'
import BaristaOrderModal from './BaristaOrderModal'
import RecipeModal from './RecipeModal'
import '../../styles/danmt.css'

// Barista Dashboard + Order Queue (Kanban) — SRS 1.5.1.1 / 1.5.1.2. UC-B01, UC-B03.
// Pha chế theo TỪNG MÓN, không còn bước "Bắt đầu pha": tích món nào xong thì món đó sang "Chờ mang ra" ngay,
// nên 1 đơn có thể nằm ở cả 2 cột (món chưa xong ở Chờ pha, món đã xong ở Chờ mang ra).
const COLUMNS = [
  { key: 'pending', label: 'Chờ pha', tone: 'pending', pick: (o) => o.items.filter(isItemWaiting), empty: 'Không còn món nào cần pha' },
  { key: 'ready', label: 'Chờ mang ra', tone: 'ready', pick: (o) => o.items.filter(isItemReady), empty: 'Không có món chờ mang ra' },
]

const activeItems = (o) => o.items.filter((i) => !isItemCancelled(i))

// Khóa nhóm ở "Tổng cần pha": chỉ gộp những ly GIỐNG HỆT nhau
// (cùng món, size, mức đường, mức đá, topping và ghi chú). Khác 1 trong các thứ đó thì tách dòng riêng.
const groupKey = (i) => {
  const toppingNames = (i.toppings || []).map((t) => t.name).sort().join('+')
  return [
    i.menuItemId,
    i.sizeName || '',
    i.sugarLevel || DEFAULT_LEVEL,
    i.iceLevel || DEFAULT_LEVEL,
    toppingNames,
    (i.note || '').trim(),
  ].join('|')
}

export default function BaristaBoard() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyItemId, setBusyItemId] = useState(null) // món đang gửi lệnh tích / bỏ tích
  const [busyGroup, setBusyGroup] = useState(null) // nhóm (key) đang tích cả loạt ở "Tổng cần pha"
  const [selected, setSelected] = useState(null) // nhóm (key) đang chọn ở "Tổng cần pha"
  const [detailId, setDetailId] = useState(null)
  const [recipeFor, setRecipeFor] = useState(null) // { menuItemId, itemName }
  const [cancelling, setCancelling] = useState(null) // { order, item } đang chờ xác nhận hủy món
  const [cancelBusy, setCancelBusy] = useState(false)

  const load = async () => {
    try {
      const res = await baristaApi.getBoard()
      setOrders(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách đơn.'))
    } finally {
      setLoading(false)
    }
  }

  // Tải đơn ngay khi mở trang, sau đó cứ 5 giây tải lại 1 lần; rời trang thì dừng.
  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)//khoang cach thoi gian board gui yeu cau den database de lay du lieu
    return () => clearInterval(timer)
  }, [])

  // Tổng cần pha: gộp các ly còn chờ pha giống hệt nhau (xem groupKey), kèm id từng dòng món để tích xong cả loạt.
  const summary = []
  orders.forEach((o) => {
    o.items.filter(isItemWaiting).forEach((i) => {
      // Tìm nhóm giống hệt ly này, chưa có thì tạo nhóm mới
      const key = groupKey(i)
      let group = summary.find((g) => g.key === key)
      if (!group) {
        group = {
          key,
          name: i.itemName,
          options: itemOptionsText(i), // ví dụ: "Size M, 50% đường, + Trân châu"
          note: (i.note || '').trim(),
          total: 0,
          orderIds: [],
          itemIds: [],
        }
        summary.push(group)
      }
      group.total += i.quantity
      if (!group.orderIds.includes(o.id)) group.orderIds.push(o.id) // mỗi đơn chỉ đếm 1 lần
      group.itemIds.push(i.id)
    })
  })
  // Nhóm cần pha nhiều nhất lên đầu, bằng nhau thì xếp theo tên món rồi theo lựa chọn
  summary.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    if (a.name !== b.name) return a.name.localeCompare(b.name)
    return a.options.localeCompare(b.options)
  })

  const totalCups = summary.reduce((s, x) => s + x.total, 0)
  const workingCount = orders.filter((o) => o.items.some(isItemWaiting)).length
  const sel = summary.find((x) => x.key === selected) || null
  const detail = orders.find((o) => o.id === detailId) || null

  // Thay đơn cũ bằng đơn server vừa trả về; đơn đã hủy / đã xong thì bỏ khỏi bảng.
  const replaceOrder = (updated) => setOrders((list) => list
    .map((x) => (x.id === updated.id ? updated : x))
    .filter((x) => ON_BOARD.includes(x.status)))

  // Tích (done = true) món pha xong -> sang "Chờ mang ra". Bỏ tích (done = false) nếu tích nhầm.
  const toggleItem = async (order, item, done) => {
    setBusyItemId(item.id)
    try {
      const res = await baristaApi.checkItem(order.id, item.id, done)
      replaceOrder(res.data)
      if (done && res.data.status === 'READY') toast(`Đơn ${order.displayNumber} đã pha xong toàn bộ, đã báo mang ra`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      load()
    } finally {
      setBusyItemId(null)
    }
  }

  // Tích ở "Tổng cần pha": mọi ly của nhóm đó (giống hệt nhau, đang hiện trên màn hình) đều xong.
  const finishGroup = async (g) => {
    setBusyGroup(g.key)
    try {
      const res = await baristaApi.checkItems(g.itemIds)
      setOrders(res.data)
      toast(`Đã pha xong ${g.total} ${g.name}${g.options ? ` (${g.options})` : ''} ở ${g.orderIds.length} đơn`)
      if (selected === g.key) setSelected(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
      load()
    } finally {
      setBusyGroup(null)
    }
  }

  // BF-02: hết nguyên liệu -> hủy 1 món còn chờ pha (hủy hết món thì đơn tự hủy).
  const confirmCancel = async () => {
    const { order, item } = cancelling
    setCancelBusy(true)
    try {
      const res = await baristaApi.cancelItem(order.id, item.id)
      replaceOrder(res.data)
      toast(res.data.status === 'CANCELLED'
        ? `Đã hủy đơn ${order.displayNumber} vì hết nguyên liệu`
        : `Đã hủy ${item.itemName} ở đơn ${order.displayNumber}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      load()
    } finally {
      setCancelBusy(false)
      setCancelling(null)
    }
  }

  const recipeButton = (i) => (
    <button type="button" className="btn btn-light-soft btn-icon" title="Xem công thức"
            aria-label={`Công thức ${i.itemName}`} onClick={() => setRecipeFor(i)}>
      <i className="bi bi-journal-text" />
    </button>
  )

  const renderCard = (o, items, col) => {
    const all = activeItems(o)
    const doneCount = all.filter(isItemDone).length
    const waitingLeft = o.items.filter(isItemWaiting).length

    if (col.key === 'pending') {
      return (
        <OrderTicket key={o.id} order={o} items={items} tone={col.tone} onOpen={() => setDetailId(o.id)}
                     highlighted={sel && sel.orderIds.includes(o.id)} matchItem={(i) => groupKey(i) === selected}
                     renderLeft={(i) => (
                       <input type="checkbox" className="form-check-input kds-check" checked={false}
                              disabled={busyItemId === i.id} onChange={() => toggleItem(o, i, true)}
                              aria-label={`Đã pha xong ${i.itemName}`} title="Tích khi pha xong món này" />
                     )}
                     renderRight={(i) => (
                       <div className="kds-item-actions">
                         {recipeButton(i)}
                         <button type="button" className="btn btn-light-soft btn-icon kds-cancel-item"
                                 title="Hết nguyên liệu, hủy món" aria-label={`Hủy ${i.itemName}`}
                                 disabled={busyItemId === i.id} onClick={() => setCancelling({ order: o, item: i })}>
                           <i className="bi bi-x-lg" />
                         </button>
                       </div>
                     )}>
          <div className="kds-actions">
            <div className="kds-progress"><i className="bi bi-check2-square me-1" />Đã pha {doneCount}/{all.length} món</div>
            <div className="kds-bar"><span style={{ width: `${all.length ? (doneCount * 100) / all.length : 0}%` }} /></div>
          </div>
        </OrderTicket>
      )
    }
    return (
      <OrderTicket key={o.id} order={o} items={items} tone={col.tone} onOpen={() => setDetailId(o.id)}
                   renderLeft={(i) => (
                     <input type="checkbox" className="form-check-input kds-check" checked
                            disabled={busyItemId === i.id} onChange={() => toggleItem(o, i, false)}
                            aria-label={`Bỏ tích ${i.itemName}`} title="Bỏ tích nếu tích nhầm (món chưa được mang ra)" />
                   )}>
        <div className="kds-waiting">
          <i className="bi bi-check2-circle me-1" />Chờ phục vụ mang ra
          {waitingLeft > 0 && <span className="cf-muted">, còn {waitingLeft} món đang pha</span>}
        </div>
      </OrderTicket>
    )
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title">Đơn cần pha</h1>
        <p className="page-subtitle">Tự cập nhật mỗi 5 giây. Đơn đến trước nằm trên cùng. Tích món nào xong thì món đó chuyển sang Chờ mang ra.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="kds-layout">
        <aside className="cf-card kds-summary">
          <div className="p-3 border-bottom">
            <div className="fw-semibold">Tổng cần pha</div>
            <div className="cell-sub">{totalCups} món, {workingCount} đơn</div>
          </div>
          <div className="p-2">
            {summary.map((x) => (
              <div key={x.key} className={`kds-sum-item ${selected === x.key ? 'active' : ''}`}>
                <input type="checkbox" className="form-check-input kds-check" checked={false}
                       disabled={busyGroup === x.key} onChange={() => finishGroup(x)}
                       aria-label={`Đã pha xong tất cả ${x.name} ${x.options}`} title={`Tích: xong cả ${x.total} ${x.name}`} />
                <button type="button" className="kds-sum-pick"
                        onClick={() => setSelected(selected === x.key ? null : x.key)}>
                  <span className="flex-grow-1 text-start" style={{ minWidth: 0 }}>
                    <span className="fw-semibold d-block text-truncate">{x.name}</span>
                    <span className="cell-sub d-block">{x.options || 'Mặc định'}</span>
                    {x.note && <span className="cell-sub d-block fst-italic">{x.note}</span>}
                    <span className="cell-sub d-block">{x.orderIds.length} đơn</span>
                  </span>
                  <span className="kds-sum-qty">{x.total}</span>
                </button>
              </div>
            ))}
            {!loading && summary.length === 0 && <div className="cell-sub p-2">Chưa có món nào cần pha.</div>}
          </div>
          <div className="cell-sub px-3 pb-3">
            Gồm các món còn chờ pha, chỉ gộp những ly giống hệt nhau (size, đường, đá, topping, ghi chú). Tích ô bên trái để xong cả loạt ly đó ở mọi đơn; bấm vào tên món để xem ly đó nằm ở đơn nào.
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          {sel && (
            <div className="kds-banner">
              <span>Đang xem <strong>{sel.name}</strong>{sel.options && ` (${sel.options})`}: cần {sel.total}, nằm ở {sel.orderIds.length} đơn</span>
              <button type="button" className="btn btn-light-soft btn-sm" onClick={() => setSelected(null)}>
                <i className="bi bi-x-lg me-1" />Bỏ chọn
              </button>
            </div>
          )}
          <div className="kds-columns two">
            {COLUMNS.map((col) => {
              const list = orders.map((o) => ({ o, items: col.pick(o) })).filter((x) => x.items.length > 0)
              return (
                <section key={col.key} className={`tone-${col.tone}`} aria-label={col.label}>
                  <div className="kds-col-head"><span>{col.label}</span><span className="count">{list.length}</span></div>
                  {list.map(({ o, items }) => renderCard(o, items, col))}
                  {!loading && list.length === 0 && <div className="cell-sub py-2">{col.empty}</div>}
                </section>
              )
            })}
          </div>
        </div>
      </div>

      <BaristaOrderModal order={detail} busyItemId={busyItemId} onClose={() => setDetailId(null)}
                         onToggleItem={toggleItem} onCancelItem={(o, i) => setCancelling({ order: o, item: i })}
                         onRecipe={(i) => setRecipeFor(i)} />
      <RecipeModal target={recipeFor} onClose={() => setRecipeFor(null)} />
      <ConfirmModal show={!!cancelling} danger loading={cancelBusy} title="Hủy món" confirmText="Hủy món"
                    message={cancelling && (
                      <>
                        Hủy <strong>{cancelling.item.quantity}× {cancelling.item.itemName}</strong> ở đơn {cancelling.order.displayNumber} vì
                        hết nguyên liệu? Phục vụ sẽ báo lại cho khách. Nếu đơn không còn món nào khác thì cả đơn sẽ bị hủy.
                      </>
                    )}
                    onClose={() => setCancelling(null)} onConfirm={confirmCancel} />
    </>
  )
}
