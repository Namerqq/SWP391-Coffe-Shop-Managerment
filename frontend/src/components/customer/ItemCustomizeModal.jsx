import { useEffect, useState } from 'react'
import AppModal from '../AppModal'
import { formatVnd } from '../../utils/format'

// null = "Mặc định" (quán pha theo công thức chuẩn; dùng cho món không cần chỉnh như bánh)
export const SUGAR_LEVELS = [null, '0%', '30%', '50%', '70%', '100%']
export const ICE_LEVELS = [null, '0%', '50%', '100%']

const label = (lv) => lv ?? 'Mặc định'

// Modal chọn đường / đá / số lượng / ghi chú cho 1 món (UC-CU03).
// editingLine != null => đang "Sửa lựa chọn" 1 dòng trong giỏ.
export default function ItemCustomizeModal({ item, editingLine, onClose, onConfirm }) {
  const [sugarLevel, setSugarLevel] = useState(null)
  const [iceLevel, setIceLevel] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!item) return
    setSugarLevel(editingLine?.sugarLevel ?? null)
    setIceLevel(editingLine?.iceLevel ?? null)
    setQuantity(editingLine?.quantity ?? 1)
    setNote(editingLine?.note ?? '')
  }, [item, editingLine])

  if (!item) return null

  const confirm = () =>
    onConfirm({
      menuItemId: item.id,
      name: item.name,
      unitPrice: Number(item.basePrice),
      sugarLevel,
      iceLevel,
      quantity,
      note: note.trim(),
    })

  return (
    <AppModal
      show
      title={item.name}
      onClose={onClose}
      width={480}
      footer={
        <button className="btn btn-primary w-100 d-flex justify-content-between py-2" onClick={confirm}>
          <span>{editingLine ? 'Cập nhật giỏ hàng' : 'Thêm vào giỏ'}</span>
          <span>{formatVnd(item.basePrice * quantity)}</span>
        </button>
      }
    >
      {item.description && <p className="text-muted small mt-0">{item.description}</p>}

      <div className="mb-3">
        <div className="form-label">Đường</div>
        <div className="chip-group">
          {SUGAR_LEVELS.map((lv) => (
            <button key={label(lv)} type="button" className={`chip ${lv === sugarLevel ? 'active' : ''}`} onClick={() => setSugarLevel(lv)}>
              {label(lv)}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <div className="form-label">Đá</div>
        <div className="chip-group">
          {ICE_LEVELS.map((lv) => (
            <button key={label(lv)} type="button" className={`chip ${lv === iceLevel ? 'active' : ''}`} onClick={() => setIceLevel(lv)}>
              {label(lv)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="item-note">Ghi chú</label>
        <input id="item-note" className="form-control" maxLength={300} placeholder="VD: không ống hút..."
          value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="d-flex justify-content-between align-items-center">
        <span className="form-label mb-0">Số lượng</span>
        <div className="stepper">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Giảm">−</button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(50, q + 1))} aria-label="Tăng">+</button>
        </div>
      </div>
    </AppModal>
  )
}
