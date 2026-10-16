import { useState } from 'react'
import Modal from '../../components/Modal'
import api from '../../api/menuManagementApi'
import { errorMessage } from '../../api/axiosClient'
import { categoryTypes } from '../../utils/menuFormat'
export default function MenuCategoryModal({ category, onClose, onSaved }) {
  const [name,setName] = useState(category?.name || '')
  const [type,setType] = useState(category?.categoryType || 'DRINK')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  async function submit(e) { e.preventDefault();if (!name.trim()) {setError('Vui lòng nhập tên danh mục.');return};setBusy(true);setError('');try { await api.saveCategory(category?.id,{name:name.trim(),categoryType:type});onSaved() } catch(e) {setError(errorMessage(e))} finally {setBusy(false)} }
  return <Modal show title={category ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={busy ? undefined : onClose} footer={<><button className="btn btn-light-soft" disabled={busy} onClick={onClose}>Huỷ</button><button className="btn btn-primary" disabled={busy} type="submit" form="mm-category-form">{busy?'Đang lưu…':category?'Lưu thay đổi':'Thêm danh mục'}</button></>}>
    <form id="mm-category-form" onSubmit={submit} className="mm-form"><label>Tên danh mục<input required className="form-control" maxLength={80} placeholder="Ví dụ: Cà phê, Bánh ngọt…" value={name} onChange={e=>setName(e.target.value)} disabled={busy} /></label>
      <label>Loại danh mục<select className="form-select" value={type} onChange={e=>setType(e.target.value)} disabled={busy}>{Object.entries(categoryTypes).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
      {category && <small className="cf-muted">Đổi loại áp dụng cho tất cả món trong danh mục; các đơn đã gửi giữ nguyên thông tin và giá.</small>}
      <small className="cf-muted">Giá trung bình chỉ tính đồ uống và bánh / đồ ăn. Topping được loại khỏi phép tính.</small>
      {error && <div role="alert" className="alert alert-danger">{error}</div>}
    </form>
  </Modal>
}
