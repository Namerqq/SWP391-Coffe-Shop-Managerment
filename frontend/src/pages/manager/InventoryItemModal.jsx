import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

export default function InventoryItemModal({ show, onClose, onSuccess, item }) {
  const { addToast } = useToast()
  
  const [formData, setFormData] = useState({
    itemName: '',
    unit: '',
    minimumStockLevel: 0,
    unitCost: 0,
    openingQuantity: 0
  })
  const [loading, setLoading] = useState(false)
  const isEdit = !!item

  useEffect(() => {
    if (show) {
      if (item) {
        setFormData({
          itemName: item.itemName,
          unit: item.unit,
          minimumStockLevel: item.minimumStockLevel,
          unitCost: item.unitCost,
          openingQuantity: 0
        })
      } else {
        setFormData({
          itemName: '',
          unit: '',
          minimumStockLevel: 0,
          unitCost: 0,
          openingQuantity: 0
        })
      }
    }
  }, [show, item])

  if (!show) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        itemName: formData.itemName,
        unit: formData.unit,
        minimumStockLevel: Number(formData.minimumStockLevel),
        unitCost: Number(formData.unitCost),
      }
      
      if (!isEdit) {
        payload.openingQuantity = Number(formData.openingQuantity)
      }

      if (isEdit) {
        await inventoryApi.update(item.id, payload)
        addToast({ message: 'Cập nhật nguyên liệu thành công', type: 'success' })
      } else {
        await inventoryApi.create(payload)
        addToast({ message: 'Thêm nguyên liệu thành công', type: 'success' })
      }
      onSuccess()
    } catch (err) {
      addToast({ message: errorMessage(err), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="cf-modal-backdrop" onClick={onClose} />
      <div className="cf-modal modal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title">{isEdit ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Tên nguyên liệu <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  required 
                  maxLength={120}
                  placeholder="VD: Cà phê hạt"
                />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">Đơn vị tính <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required 
                    maxLength={30}
                    placeholder="VD: kg, lít, hộp"
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">Giá nhập (VNĐ) <span className="text-danger">*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    name="unitCost"
                    value={formData.unitCost}
                    onChange={handleChange}
                    required 
                    min="0"
                  />
                </div>
              </div>
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="form-label">Mức tồn tối thiểu <span className="text-danger">*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    name="minimumStockLevel"
                    value={formData.minimumStockLevel}
                    onChange={handleChange}
                    required 
                    min="0"
                    step="0.001"
                  />
                  <div className="form-text">Báo động khi tồn kho dưới mức này</div>
                </div>
                {!isEdit && (
                  <div className="col-sm-6">
                    <label className="form-label">Tồn kho ban đầu</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="openingQuantity"
                      value={formData.openingQuantity}
                      onChange={handleChange}
                      min="0"
                      step="0.001"
                    />
                    <div className="form-text">Số lượng hiện có khi tạo</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light-soft" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
