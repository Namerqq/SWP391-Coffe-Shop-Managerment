import { useEffect, useState } from 'react'
import Modal from '../Modal'
import { formatMoney } from '../../utils/orderFormat'
import { customizationForItem, sizesForItem, allowedValue, toppingsForItem, isSizeItem, isToppingItem } from '../../utils/orderOptions'

/**
 * Chọn size / đường / đá / topping / số lượng / ghi chú cho 1 món (dùng chung: bán mang đi, sửa đơn...).
 *  - item:    { id, name, price }                       món trong menu
 *  - options: { sizes: [{id,name,price}], toppings: [] } lấy từ /api/staff/menu
 *  - initial: giá trị đang có khi sửa (cùng dạng với kết quả trả về)
 * onConfirm(line) nhận: { menuItemId, itemName, unitPrice, quantity, sizeCode, sizeName, sizePrice,
 *                         toppingIds, toppings, sugarLevel, iceLevel, note }
 */
export default function ItemOptionsModal({ show, item, options, initial, confirmText = 'Thêm vào đơn', onClose, onConfirm }) {
  const sizeItem = isSizeItem(item, options)
  const standaloneTopping = isToppingItem(item, options)
  const config = customizationForItem(item, options)
  const configKey = JSON.stringify(config)
  const sizes = sizesForItem(item, options)
  const toppings = toppingsForItem(item, options)
  const [form, setForm] = useState(null)

  // Chỉ khởi tạo lại khi mở modal hoặc đổi món (tránh mất dữ liệu đang chọn khi trang cha cập nhật).
  useEffect(() => {
    if (!show || !item || sizeItem) return
    setForm({
      quantity: initial?.quantity || 1,
      sizeCode: allowedValue(initial?.sizeCode ?? initial?.sizeName, config.sizes, config.defaultSize),
      toppingIds: standaloneTopping ? [] : initial?.toppingIds || [],
      sugarLevel: allowedValue(initial?.sugarLevel, config.sugarLevels, config.defaultSugar),
      iceLevel: allowedValue(initial?.iceLevel, config.iceLevels, config.defaultIce),
      note: initial?.note || '',
    })
  }, [show, item?.id, sizeItem, standaloneTopping, configKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show || !item || sizeItem || !form) return null

  const size = sizes.find((s) => s.id === form.sizeCode) || null
  const chosenToppings = toppings.filter((t) => form.toppingIds.includes(t.id))
  const unit = item.price + (size?.price || 0) + chosenToppings.reduce((s, t) => s + t.price, 0)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const toggleTopping = (id) =>
    set({ toppingIds: form.toppingIds.includes(id) ? form.toppingIds.filter((x) => x !== id) : [...form.toppingIds, id] })

  const confirm = () => onConfirm({
    menuItemId: item.id,
    categoryType: standaloneTopping ? 'TOPPING' : item.categoryType,
    itemName: item.name,
    unitPrice: item.price,
    quantity: form.quantity,
    sizeCode: size?.id ?? null,
    sizeName: size?.name ?? null,
    sizePrice: size?.price ?? 0,
    toppingIds: chosenToppings.map((t) => t.id),
    toppings: chosenToppings,
    sugarLevel: standaloneTopping ? null : form.sugarLevel,
    iceLevel: standaloneTopping ? null : form.iceLevel,
    note: form.note.trim(),
  })

  const pills = (list, value, onPick, render = (x) => x) => (
    <div className="opt-pills">
      {list.map((x) => {
        const key = typeof x === 'object' ? x.id : x
        return (
          <button type="button" key={key} className={`opt-pill ${value === key ? 'active' : ''}`} disabled={list.length === 1} onClick={() => onPick(key)}>
            {render(x)}
          </button>
        )
      })}
    </div>
  )

  return (
    <Modal
      show
      title={item.name}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose}>Hủy</button>
          <button type="button" className="btn btn-primary" onClick={confirm}>
            {confirmText} · {formatMoney(unit * form.quantity)}
          </button>
        </>
      }
    >
      {sizes.length > 0 && (
        <div className="opt-group">
          <div className="opt-label">Size</div>
          {pills(sizes, form.sizeCode, (id) => set({ sizeCode: id }),
            (s) => <>{s.name}{s.price > 0 && <span className="opt-extra">+{formatMoney(s.price)}</span>}</>)}
        </div>
      )}
      {!standaloneTopping && config.sugarLevels.length > 0 && <div className="opt-group">
        <div className="opt-label">Đường</div>
        {config.sugarLevels.length === 0 && <span className="cf-muted">Không áp dụng</span>}
        {pills(config.sugarLevels, form.sugarLevel, (v) => set({ sugarLevel: v }))}
      </div>}
      {!standaloneTopping && config.iceLevels.length > 0 && <div className="opt-group">
        <div className="opt-label">Đá</div>
        {config.iceLevels.length === 0 && <span className="cf-muted">Không áp dụng</span>}
        {pills(config.iceLevels, form.iceLevel, (v) => set({ iceLevel: v }))}
      </div>}
      {toppings.length > 0 && (
        <div className="opt-group">
          <div className="opt-label">Topping</div>
          <div className="opt-pills">
            {toppings.map((t) => (
              <button type="button" key={t.id} className={`opt-pill ${form.toppingIds.includes(t.id) ? 'active' : ''}`}
                      onClick={() => toggleTopping(t.id)}>
                {t.name}<span className="opt-extra">+{formatMoney(t.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="opt-group d-flex align-items-center justify-content-between gap-3">
        <div className="opt-label mb-0">Số lượng</div>
        <div className="qty-stepper">
          <button type="button" aria-label="Giảm" disabled={form.quantity <= 1} onClick={() => set({ quantity: form.quantity - 1 })}>−</button>
          <span>{form.quantity}</span>
          <button type="button" aria-label="Tăng" disabled={form.quantity >= 50} onClick={() => set({ quantity: form.quantity + 1 })}>+</button>
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="opt-note">Ghi chú</label>
        <input id="opt-note" className="form-control" maxLength={300} placeholder="VD: ít ngọt, mang ra sau"
               value={form.note} onChange={(e) => set({ note: e.target.value })} />
      </div>
    </Modal>
  )
}
