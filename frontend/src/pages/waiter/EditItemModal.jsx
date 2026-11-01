import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import waiterApi from '../../api/waiterApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../utils/orderFormat'
import { DEFAULT_LEVEL, customizationForItem, sizesForItem, allowedValue, toppingsForItem } from '../../utils/orderOptions'

/**
 * UC-W06: Change item details (Chỉnh sửa chi tiết món khi đơn còn chờ pha).
 * Cho phép nhân viên Phục vụ (Waiter):
 * 1. Thay đổi số lượng (modify item quantities)
 * 2. Thay đổi tuỳ chọn Size, Đường, Đá, Topping (change options)
 * 3. Cập nhật ghi chú riêng của món (update notes)
 */
export default function EditItemModal({ show, order, item, menuOptions, onClose, onSuccess }) {
  const toast = useToast()

  // Danh sách các lựa chọn size và topping lấy từ menu hệ thống
  const config = customizationForItem(item, menuOptions)
  const configKey = JSON.stringify(config)
  const sizes = sizesForItem(item, menuOptions)
  const toppings = toppingsForItem(item, menuOptions)

  // State lưu trữ dữ liệu form đang chỉnh sửa
  const [quantity, setQuantity] = useState(1)
  const [sizeCode, setSizeCode] = useState(null)
  const [toppingIds, setToppingIds] = useState([])
  const [sugarLevel, setSugarLevel] = useState(DEFAULT_LEVEL)
  const [iceLevel, setIceLevel] = useState(DEFAULT_LEVEL)
  const [note, setNote] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Khi mở modal, nạp dữ liệu hiện tại của món vào form
  useEffect(() => {
    if (show && item) {
      setError('')
      setQuantity(item.quantity || 1)

      // Tìm sizeCode tương ứng với sizeName hiện tại của món
      const currentSize = sizes.find((s) => s.name === item.sizeName)
      setSizeCode(allowedValue(currentSize?.id, config.sizes, config.defaultSize))

      // Lấy danh sách ID topping hiện tại
      const currentToppingIds = (item.toppings || []).map((t) => t.id)
      setToppingIds(currentToppingIds)

      setSugarLevel(allowedValue(item.sugarLevel, config.sugarLevels, config.defaultSugar))
      setIceLevel(allowedValue(item.iceLevel, config.iceLevels, config.defaultIce))
      setNote(item.note || '')
    }
  }, [show, item, configKey])

  if (!show || !order || !item) return null

  // Bật/tắt chọn topping
  const toggleTopping = (id) => {
    setToppingIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    )
  }

  // Tính trước đơn giá và tổng tiền tạm tính để nhân viên dễ quan sát
  const selectedSize = sizes.find((s) => s.id === sizeCode)
  const sizeExtraPrice = selectedSize ? selectedSize.price : 0
  const toppingExtraPrice = toppings
    .filter((t) => toppingIds.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0)
  const unitPrice = (item.unitPrice || 0) + sizeExtraPrice + toppingExtraPrice
  const totalAmount = unitPrice * quantity

  // Xử lý lưu thay đổi
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const requestData = {
      menuItemId: item.menuItemId,
      quantity,
      sizeCode,
      toppingIds: toppingIds.filter((id) => toppings.some((t) => t.id === id)),
      sugarLevel,
      iceLevel,
      note: note.trim() || null,
    }

    try {
      await waiterApi.updateItem(order.id, item.id, requestData)
      toast(`Đã cập nhật món "${item.itemName}" thành công!`)
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(errorMessage(err, 'Không thể cập nhật món. Vui lòng thử lại!'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      show={show}
      title={`Chỉnh sửa món: ${item.itemName} (${order.displayNumber})`}
      onClose={loading ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={loading}>
            Đóng
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading && <span className="spinner-border spinner-border-sm me-2" />}
            Lưu thay đổi · {formatMoney(totalAmount)}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* 1. Số lượng */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Số lượng</label>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={quantity <= 1 || loading}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <i className="bi bi-dash-lg" />
          </button>
          <span className="fw-bold fs-5 px-3">{quantity}</span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={quantity >= 50 || loading}
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
          >
            <i className="bi bi-plus-lg" />
          </button>
        </div>
      </div>

      {/* 2. Chọn Size (nếu có lựa chọn size) */}
      {sizes.length > 0 && (
        <div className="mb-3">
          <label className="form-label fw-semibold">Kích cỡ (Size)</label>
          <div className="d-flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`btn btn-sm ${sizeCode === s.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setSizeCode(s.id)}
                disabled={loading || sizes.length === 1}
              >
                {s.name} {s.price > 0 && `(+${formatMoney(s.price)})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Mức đường */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Mức đường</label>
        {!config.sugarLevels.length && <span className="cf-muted">Không áp dụng</span>}
        <div className="d-flex flex-wrap gap-2">
          {config.sugarLevels.map((level) => (
            <button
              type="button"
              key={level}
              className={`btn btn-sm ${sugarLevel === level ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setSugarLevel(level)}
              disabled={loading || config.sugarLevels.length === 1}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Mức đá */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Mức đá</label>
        {!config.iceLevels.length && <span className="cf-muted">Không áp dụng</span>}
        <div className="d-flex flex-wrap gap-2">
          {config.iceLevels.map((level) => (
            <button
              type="button"
              key={level}
              className={`btn btn-sm ${iceLevel === level ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setIceLevel(level)}
              disabled={loading || config.iceLevels.length === 1}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Topping */}
      {toppings.length > 0 && (
        <div className="mb-3">
          <label className="form-label fw-semibold">Topping</label>
          <div className="row g-2">
            {toppings.map((t) => {
              const isChecked = toppingIds.includes(t.id)
              return (
                <div key={t.id} className="col-6">
                  <div
                    className={`p-2 border rounded d-flex justify-content-between align-items-center ${
                      isChecked ? 'border-primary bg-light' : ''
                    }`}
                    onClick={() => !loading && toggleTopping(t.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="small">{t.name}</span>
                    <span className="small text-muted">+{formatMoney(t.price)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 6. Ghi chú món */}
      <div className="mb-2">
        <label htmlFor="item-note" className="form-label fw-semibold">
          Ghi chú cho món
        </label>
        <textarea
          id="item-note"
          className="form-control"
          rows={2}
          maxLength={300}
          placeholder="Ví dụ: Ít ngọt, không lấy ống hút, mang trước..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={loading}
        />
      </div>
    </Modal>
  )
}
