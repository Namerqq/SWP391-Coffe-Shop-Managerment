import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import productApi from '../api/productApi'

const emptyForm = { name: '', price: '', quantity: '', description: '' }

// 1 form dùng cho cả THÊM (/products/new) và SỬA (/products/:id/edit).
export default function ProductForm() {
  const { id } = useParams()          // có id => đang sửa
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({}) // lỗi validate từ backend

  useEffect(() => {
    if (id) productApi.getById(id).then((res) => setForm(res.data))
  }, [id])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, price: Number(form.price), quantity: Number(form.quantity) }
      if (id) await productApi.update(id, payload)
      else await productApi.create(payload)
      navigate('/products')
    } catch (err) {
      setErrors(err.response?.data || { message: 'Có lỗi xảy ra' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="col-md-6">
      <h4>{id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h4>

      {['name', 'price', 'quantity'].map((field) => (
        <div className="mb-3" key={field}>
          <label className="form-label text-capitalize">{field}</label>
          <input
            className={`form-control ${errors[field] ? 'is-invalid' : ''}`}
            name={field}
            type={field === 'name' ? 'text' : 'number'}
            value={form[field] ?? ''}
            onChange={handleChange}
          />
          <div className="invalid-feedback">{errors[field]}</div>
        </div>
      ))}

      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea className="form-control" name="description" rows="3"
          value={form.description ?? ''} onChange={handleChange} />
      </div>

      {errors.message && <div className="alert alert-danger">{errors.message}</div>}

      <button className="btn btn-success me-2" type="submit">Lưu</button>
      <button className="btn btn-secondary" type="button" onClick={() => navigate('/products')}>Hủy</button>
    </form>
  )
}
