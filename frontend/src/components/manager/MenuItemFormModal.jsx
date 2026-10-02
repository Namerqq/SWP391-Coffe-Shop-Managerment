import { useEffect, useState } from 'react'
import AppModal from '../AppModal'
import menuItemApi from '../../api/menuItemApi'
import { getErrorMessage } from '../../utils/format'

const emptyForm = {
  categoryId: '', name: '', description: '', basePrice: '', imageUrl: '', availabilityStatus: 'AVAILABLE',
}

// Modal thêm/sửa món (UC-DM01). item = null => thêm mới.
export default function MenuItemFormModal({ show, item, categories, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!show) return
    setErrors({})
    setForm(item
      ? {
          categoryId: item.categoryId, name: item.name, description: item.description ?? '',
          basePrice: item.basePrice, imageUrl: item.imageUrl ?? '', availabilityStatus: item.availabilityStatus,
        }
      : { ...emptyForm, categoryId: categories[0]?.id ?? '' })
  }, [show, item, categories])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.categoryId) errs.categoryId = 'Vui lòng chọn danh mục'
    if (!form.name.trim()) errs.name = 'Tên món không được để trống'
    if (form.basePrice === '' || Number(form.basePrice) < 0 || !Number.isInteger(Number(form.basePrice))) {
      errs.basePrice = 'Giá phải là số nguyên >= 0'
    }
    if (Object.keys(errs).length) return setErrors(errs)

    const payload = { ...form, categoryId: Number(form.categoryId), basePrice: Number(form.basePrice) }
    try {
      setSaving(true)
      if (item) await menuItemApi.update(item.id, payload)
      else await menuItemApi.create(payload)
      onSaved(item ? 'Đã cập nhật món' : 'Đã thêm món')
    } catch (err) {
      const data = err.response?.data
      setErrors(data && !data.message ? data : { message: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal
      show={show}
      width={600}
      title={item ? 'Sửa món' : 'Thêm món'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-light-soft" type="button" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" type="submit" form="menu-item-form" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>
      }
    >
      <form id="menu-item-form" onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-md-7">
            <label className="form-label">Tên món *</label>
            <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} name="name"
              value={form.name} onChange={handleChange} maxLength={120} placeholder="VD: Bạc xỉu" />
            <div className="invalid-feedback">{errors.name}</div>
          </div>
          <div className="col-md-5">
            <label className="form-label">Danh mục *</label>
            <select className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`} name="categoryId"
              value={form.categoryId} onChange={handleChange}>
              <option value="">-- Chọn --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.status === 'INACTIVE' ? ' (đang ẩn)' : ''}</option>
              ))}
            </select>
            <div className="invalid-feedback">{errors.categoryId}</div>
          </div>

          <div className="col-12">
            <label className="form-label">Mô tả</label>
            <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} name="description"
              rows="2" value={form.description} onChange={handleChange} maxLength={1000} />
            <div className="invalid-feedback">{errors.description}</div>
          </div>

          <div className="col-md-5">
            <label className="form-label">Giá (đ) *</label>
            <input type="number" min="0" step="1000" className={`form-control ${errors.basePrice ? 'is-invalid' : ''}`}
              name="basePrice" value={form.basePrice} onChange={handleChange} />
            <div className="invalid-feedback">{errors.basePrice}</div>
          </div>
          <div className="col-md-7">
            <label className="form-label">Link ảnh</label>
            <input className={`form-control ${errors.imageUrl ? 'is-invalid' : ''}`} name="imageUrl"
              value={form.imageUrl} onChange={handleChange} maxLength={500} placeholder="https://..." />
            <div className="invalid-feedback">{errors.imageUrl}</div>
          </div>

          <div className="col-12">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="availability"
                checked={form.availabilityStatus === 'AVAILABLE'}
                onChange={(e) => setForm({ ...form, availabilityStatus: e.target.checked ? 'AVAILABLE' : 'UNAVAILABLE' })} />
              <label className="form-check-label ms-2" htmlFor="availability">Còn bán</label>
            </div>
          </div>
        </div>
        {errors.message && <div className="alert alert-danger mt-3 mb-0">{errors.message}</div>}
      </form>
    </AppModal>
  )
}
