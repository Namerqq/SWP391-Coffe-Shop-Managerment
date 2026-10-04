import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { assetUrl } from '../../utils/assetUrl'
import { formatMoney } from '../../utils/orderFormat'
import { DEFAULT_LEVEL, ICE_LEVELS, SUGAR_LEVELS } from '../../utils/orderOptions'
import '../../styles/guest.css'

const LEVEL_LABEL = { '100%': 'Bình thường', '70%': '70%', '50%': '50%', '30%': '30%', '0%': 'Không' }

/**
 * Item Customize Modal (khách) — UC-CU02. Chọn size, đường, đá, topping, số lượng, ghi chú.
 * Size / Topping lấy từ danh mục "Size" / "Topping" trong menu (quy ước chung của nhóm).
 * onConfirm(line) trả về cùng dạng với ItemOptionsModal của nhân viên.
 */
export default function GuestItemModal({ show, item, options, initial, confirmText = 'Thêm vào giỏ', onClose, onConfirm }) {
  const sizes = options?.sizes || []
  const toppings = options?.toppings || []
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (!show || !item) return
    setForm({
      quantity: initial?.quantity || 1,
      sizeId: initial ? initial.sizeId ?? null : sizes[0]?.id ?? null,
      toppingIds: initial?.toppingIds || [],
      sugarLevel: initial?.sugarLevel || DEFAULT_LEVEL,
      iceLevel: initial?.iceLevel || DEFAULT_LEVEL,
      note: initial?.note || '',
    })
  }, [show, item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show || !item || !form) return null

  const size = sizes.find((s) => s.id === form.sizeId) || null
  const chosen = toppings.filter((t) => form.toppingIds.includes(t.id))
  const unit = item.price + (size?.price || 0) + chosen.reduce((s, t) => s + t.price, 0)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const toggleTopping = (id) =>
    set({ toppingIds: form.toppingIds.includes(id) ? form.toppingIds.filter((x) => x !== id) : [...form.toppingIds, id] })

  const confirm = () => onConfirm({
    menuItemId: item.id,
    itemName: item.name,
    unitPrice: item.price,
    quantity: form.quantity,
    sizeId: size?.id ?? null,
    sizeName: size?.name ?? null,
    sizePrice: size?.price ?? 0,
    toppingIds: chosen.map((t) => t.id),
    toppings: chosen,
    sugarLevel: form.sugarLevel,
    iceLevel: form.iceLevel,
    note: form.note.trim(),
  })

  const levels = (label, list, value, key) => (
    <fieldset className="gx-opt">
      <legend>{label}</legend>
      <div className="gx-pills">
        {list.map((v) => (
          <button type="button" key={v} className={value === v ? 'active' : ''} aria-pressed={value === v}
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

      {sizes.length > 0 && (
        <fieldset className="gx-opt">
          <legend>Size</legend>
          <div className="gx-pills">
            {sizes.map((s) => (
              <button type="button" key={s.id} className={form.sizeId === s.id ? 'active' : ''} aria-pressed={form.sizeId === s.id}
                      onClick={() => set({ sizeId: s.id })}>
                {s.name}{s.price > 0 && <small>+{formatMoney(s.price)}</small>}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {levels('Đường', SUGAR_LEVELS, form.sugarLevel, 'sugarLevel')}
      {levels('Đá', ICE_LEVELS, form.iceLevel, 'iceLevel')}
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
