import { useEffect, useState } from 'react'
import categoryApi from '../../api/categoryApi'
import AppModal from '../../components/AppModal'
import Toast, { useToast } from '../../components/Toast'
import { getErrorMessage } from '../../utils/format'

const emptyForm = { name: '', description: '', status: 'ACTIVE' }

// Màn 1.1.4 Catalog management - UC-CG01 Manage Category (Manager)
export default function CategoryManagement() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, showToast] = useToast()

  // Modal thêm/sửa
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await categoryApi.getAll()
      setCategories(res.data)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormErrors({})
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({ name: c.name, description: c.description ?? '', status: c.status })
    setFormErrors({})
    setShowForm(true)
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validate nhanh phía client (backend vẫn kiểm tra lại)
    if (!form.name.trim()) return setFormErrors({ name: 'Tên danh mục không được để trống' })

    try {
      setSaving(true)
      if (editingId) await categoryApi.update(editingId, form)
      else await categoryApi.create(form)
      setShowForm(false)
      showToast(editingId ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục')
      fetchCategories()
    } catch (err) {
      const data = err.response?.data
      setFormErrors(data && !data.message ? data : { message: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (c) => {
    const next = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await categoryApi.changeStatus(c.id, next)
      setCategories((list) => list.map((x) => (x.id === c.id ? { ...x, status: next } : x)))
      showToast(next === 'ACTIVE' ? `Đã hiện "${c.name}"` : `Đã ẩn "${c.name}"`)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Xóa danh mục "${c.name}"?`)) return
    try {
      await categoryApi.remove(c.id)
      showToast('Đã xóa danh mục')
      fetchCategories()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Danh mục món</h1>
          <p className="page-subtitle">Danh mục bị ẩn sẽ không hiện trên menu gọi món của khách.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm danh mục</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="surface overflow-hidden">
        <div className="table-responsive">
          <table className="table table-minimal align-middle">
            <thead>
              <tr>
                <th style={{ width: 70 }}>#</th>
                <th>Tên danh mục</th>
                <th>Mô tả</th>
                <th className="text-center" style={{ width: 100 }}>Số món</th>
                <th style={{ width: 130 }}>Trạng thái</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, index) => (
                <tr key={c.id}>
                  <td className="text-muted">{index + 1}</td>
                  <td className="fw-semi">{c.name}</td>
                  <td className="text-muted">{c.description || '—'}</td>
                  <td className="text-center">{c.itemCount}</td>
                  <td>
                    <button
                      type="button"
                      className={`badge-soft border-0 ${c.status === 'ACTIVE' ? 'success' : 'muted'}`}
                      title="Bấm để đổi trạng thái"
                      onClick={() => toggleStatus(c)}
                    >
                      {c.status === 'ACTIVE' ? 'Đang dùng' : 'Đã ẩn'}
                    </button>
                  </td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-light-soft me-2" onClick={() => openEdit(c)}>Sửa</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)}>Xóa</button>
                  </td>
                </tr>
              ))}
              {!loading && categories.length === 0 && (
                <tr><td colSpan="6" className="text-center text-muted py-5">Chưa có danh mục nào</td></tr>
              )}
              {loading && (
                <tr><td colSpan="6" className="text-center text-muted py-5">Đang tải...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal
        show={showForm}
        title={editingId ? 'Sửa danh mục' : 'Thêm danh mục'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-light-soft" type="button" onClick={() => setShowForm(false)}>Hủy</button>
            <button className="btn btn-primary" type="submit" form="category-form" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label">Tên danh mục *</label>
            <input
              className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
              name="name" value={form.name} onChange={handleChange} maxLength={80} autoFocus
              placeholder="VD: Cà phê"
            />
            <div className="invalid-feedback">{formErrors.name}</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Mô tả</label>
            <textarea
              className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
              name="description" rows="2" value={form.description} onChange={handleChange} maxLength={500}
            />
            <div className="invalid-feedback">{formErrors.description}</div>
          </div>
          <div>
            <label className="form-label">Trạng thái</label>
            <select className="form-select" name="status" value={form.status} onChange={handleChange}>
              <option value="ACTIVE">Đang dùng</option>
              <option value="INACTIVE">Ẩn</option>
            </select>
          </div>
          {formErrors.message && <div className="alert alert-danger mt-3 mb-0">{formErrors.message}</div>}
        </form>
      </AppModal>

      <Toast toast={toast} />
    </>
  )
}
