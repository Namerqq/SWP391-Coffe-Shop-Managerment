import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { assetUrl } from '../../utils/assetUrl'
import { formatMoney } from '../../utils/orderFormat'
import { customizationForItem, sizesForItem, allowedValue, toppingsForItem, isSizeItem, isToppingItem } from '../../utils/orderOptions'
import '../../styles/guest.css'

const LEVEL_LABEL = { '100%': 'Bình thường', '70%': '70%', '50%': '50%', '30%': '30%', '0%': 'Không' }

/**
 * Item Customize Modal (khách) — UC-CU02. Chọn size, đường, đá, topping, số lượng, ghi chú.
 * Topping bán riêng chỉ có số lượng và ghi chú. Size chỉ là lựa chọn kèm món.
 * onConfirm(line) trả về cùng dạng với ItemOptionsModal của nhân viên.
 */
export default function GuestItemModal({ show, item, options, initial, confirmText = 'Thêm vào giỏ', onClose, onConfirm }) {
  const sizeItem = isSizeItem(item, options)
  const standaloneTopping = isToppingItem(item, options)
  const config = customizationForItem(item, options)
  const configKey = JSON.stringify(config)
  const sizes = sizesForItem(item, options)
  const toppings = toppingsForItem(item, options)
  const [form, setForm] = useState(null)

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
  const chosen = toppings.filter((t) => form.toppingIds.includes(t.id))
  const unit = item.price + (size?.price || 0) + chosen.reduce((s, t) => s + t.price, 0)
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
    toppingIds: chosen.map((t) => t.id),
    toppings: chosen,
    sugarLevel: standaloneTopping ? null : form.sugarLevel,
    iceLevel: standaloneTopping ? null : form.iceLevel,
    note: form.note.trim(),
  })

  const levels = (label, list, value, key) => (
    <fieldset className="gx-opt">
      <legend>{label}</legend>
      {list.length === 0 && <span className="gx-muted">Không áp dụng</span>}
      <div className="gx-pills">
        {list.map((v) => (
          <button type="button" key={v} className={value === v ? 'active' : ''} aria-pressed={value === v} disabled={list.length === 1}
                  onClick={() => set({ [key]: v })}>{LEVEL_LABEL[v] || v}</button>
        ))}
      </div>
    </fieldset>
  )

  return (
    <Modal
      show
      title={item.name}
      onClose={onClose}
      footer={
        <div className="gx-modal-foot">
          <div className="gx-qty" aria-label="Số lượng">
            <button type="button" aria-label="Giảm" disabled={form.quantity <= 1} onClick={() => set({ quantity: form.quantity - 1 })}>−</button>
            <span>{form.quantity}</span>
            <button type="button" aria-label="Tăng" disabled={form.quantity >= 50} onClick={() => set({ quantity: form.quantity + 1 })}>+</button>
          </div>
          <button type="button" className="btn btn-primary flex-grow-1 py-2" onClick={confirm}>
            {confirmText} · {formatMoney(unit * form.quantity)}
          </button>
        </div>
      }
    >
      <div className="gx-item-head">
        {item.imageUrl
          ? <img src={assetUrl(item.imageUrl)} alt="" />
          : <span className="gx-thumb-empty" aria-hidden="true"><i className="bi bi-cup-hot" /></span>}
        <div>
          {item.description && <p className="gx-item-desc">{item.description}</p>}
          <div className="gx-price">{formatMoney(item.price)}</div>
        </div>
      </div>

      {standaloneTopping && <p className="cf-muted">Đặt riêng theo số lượng. Topping sẽ được phục vụ riêng, không thêm vào ly.</p>}
      {sizes.length > 0 && (
        <fieldset className="gx-opt">
          <legend>Size</legend>
          <div className="gx-pills">
            {sizes.map((s) => (
              <button type="button" key={s.id} className={form.sizeCode === s.id ? 'active' : ''} aria-pressed={form.sizeCode === s.id} disabled={sizes.length === 1}
                      onClick={() => set({ sizeCode: s.id })}>
                {s.name}{s.price > 0 && <small>+{formatMoney(s.price)}</small>}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {!standaloneTopping && levels('Đường', config.sugarLevels, form.sugarLevel, 'sugarLevel')}
      {!standaloneTopping && levels('Đá', config.iceLevels, form.iceLevel, 'iceLevel')}
      {toppings.length > 0 && (
        <fieldset className="gx-opt">
          <legend>Topping</legend>
          <div className="gx-pills">
            {toppings.map((t) => (
              <button type="button" key={t.id} className={form.toppingIds.includes(t.id) ? 'active' : ''}
                      aria-pressed={form.toppingIds.includes(t.id)} onClick={() => toggleTopping(t.id)}>
                {t.name}<small>+{formatMoney(t.price)}</small>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <label className="form-label mt-1" htmlFor="gx-note">Ghi chú cho quán</label>
      <input id="gx-note" className="form-control" maxLength={300} placeholder="VD: ít ngọt, mang ra sau"
             value={form.note} onChange={(e) => set({ note: e.target.value })} />
    </Modal>
  )
}
