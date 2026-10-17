import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import api from '../../api/menuManagementApi'
import { errorMessage } from '../../api/axiosClient'
import { assetUrl } from '../../utils/assetUrl'
export default function MenuItemModal({ item, categories, initialCategory, onClose, onSaved }) {
  const [form, setForm] = useState({ name: item?.name || '', categoryId: item?.categoryId || initialCategory || categories[0]?.id || '', basePrice: item?.basePrice ?? '', description: item?.description || '' })
  const [image, setImage] = useState(item?.imageUrl || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  useEffect(() => { if (!file) { setPreview(''); return }; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url) }, [file])
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const type = categories.find(c => c.id === Number(form.categoryId))?.categoryType
  function choose(e) {
    const f = e.target.files[0]; setError(''); if (!f) return
    if (!['image/jpeg','image/png','image/webp'].includes(f.type) || f.size > 5*1024*1024) { setError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.'); e.target.value=''; return }
    setFile(f)
  }
  async function submit(e) {
    e.preventDefault(); setError('')
    if (!form.name.trim() || !form.categoryId || !/^\d+$/.test(String(form.basePrice)) || Number(form.basePrice)>1000000000) { setError('Điền tên món, danh mục và giá nguyên từ 0 đến 1.000.000.000đ.'); return }
    setBusy(true)
    try {
      let url = image
      if (file) { url = (await api.upload(file)).data.url; setImage(url); setFile(null) }
      await api.saveItem(item?.id, { ...form, name: form.name.trim(), categoryId: Number(form.categoryId), basePrice: Number(form.basePrice), imageUrl: url || null })
      onSaved()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <Modal show title={item ? 'Sửa món' : 'Thêm món mới'} size="lg" onClose={busy ? undefined : onClose} footer={<><button className="btn btn-light-soft" disabled={busy} onClick={onClose}>Huỷ</button><button className="btn btn-primary" disabled={busy || !categories.length} type="submit" form="mm-item-form">{busy ? 'Đang lưu…' : item ? 'Lưu thay đổi' : 'Thêm món'}</button></>}>
    <form id="mm-item-form" onSubmit={submit} className="mm-form">
      <label>Tên món<input className="form-control" required maxLength={120} value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Ví dụ: Cà phê sữa đá" disabled={busy} /></label>
      <div className="mm-form-row"><label>Danh mục<select className="form-select" required value={form.categoryId} onChange={e=>update('categoryId',e.target.value)} disabled={busy}><option value="" disabled>Chọn danh mục</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Giá bán (đ)<input className="form-control" type="number" min="0" max="1000000000" step="1" required value={form.basePrice} onChange={e=>update('basePrice',e.target.value)} disabled={busy} /></label></div>
      <label>Mô tả (tuỳ chọn)<textarea className="form-control" maxLength={1000} rows={2} value={form.description} onChange={e=>update('description',e.target.value)} disabled={busy} /></label>
      {type === 'TOPPING' && <small className="cf-muted">Topping này vừa được chọn thêm vào món, vừa bán lẻ theo số lượng riêng (ví dụ 3 hộp).</small>}
      <div className="mm-upload"><div className="mm-preview">{preview || image ? <img src={preview || assetUrl(image)} alt="Xem trước ảnh món" /> : <i className="bi bi-image" />}</div><div><label className="btn btn-light-soft mm-upload-button"><i className="bi bi-upload" /> Tải ảnh món<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={choose} disabled={busy} /></label><p>JPG, PNG, WebP · Tối đa 5 MB.<br />Không có ảnh sẽ hiện biểu tượng mặc định.</p>{(file || image) && <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={()=>{setImage('');setFile(null);if(input.current)input.current.value=''}}>Gỡ ảnh</button>}</div></div>
      {item && <small className="cf-muted">Giá mới chỉ áp dụng cho đơn đặt sau khi lưu. Đơn đã gửi giữ nguyên giá.</small>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
    </form>
  </Modal>
}
