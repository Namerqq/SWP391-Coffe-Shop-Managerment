import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import api from '../../api/menuManagementApi'
import { errorMessage } from '../../api/axiosClient'
import { assetUrl } from '../../utils/assetUrl'

/** Hiển thị form thêm/sửa món, gồm thông tin món và ảnh tải lên không bắt buộc. */
export default function MenuItemModal({ item, categories, items = [], initialCategory, onClose, onSaved }) {
  // Có item thì điền dữ liệu cũ; khi thêm mới, ưu tiên danh mục đang được lọc ở trang cha.
  const [form, setForm] = useState({
    name: item?.name || '',
    categoryId: item?.categoryId || initialCategory || categories[0]?.id || '',
    basePrice: item?.basePrice ?? '',
    description: item?.description || '',
    allowedItemIds: item?.allowedItemIds || [],
  })

  const [image, setImage] = useState(item?.imageUrl || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  /** Tạo ảnh xem trước; thu hồi URL cũ khi đổi file hoặc đóng form để giải phóng bộ nhớ. */
  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [file])

  /** Cập nhật một trường của form, giữ nguyên các trường còn lại. */
  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const type = categories.find((c) => c.id === Number(form.categoryId))?.categoryType
  const [itemSearch, setItemSearch] = useState('')
  const eligibleItems = items.filter((candidate) => {
    const categoryType = categories.find((c) => c.id === candidate.categoryId)?.categoryType
    return candidate.id !== item?.id && ['DRINK', 'FOOD'].includes(categoryType)
  })
  const matchingItems = eligibleItems.filter((candidate) =>
    candidate.name.toLocaleLowerCase('vi').includes(itemSearch.trim().toLocaleLowerCase('vi')))
  const toggleAllowedItem = (id) => setForm((current) => ({
    ...current,
    allowedItemIds: current.allowedItemIds.includes(id)
      ? current.allowedItemIds.filter((value) => value !== id)
      : [...current.allowedItemIds, id],
  }))

  /** Nhận file ảnh và kiểm tra định dạng, dung lượng trước khi cho xem trước hoặc tải lên. */
  function choose(e) {
    const f = e.target.files[0]
    setError('')

    if (!f) return

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) ||
      f.size > 5 * 1024 * 1024
    ) {
      setError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.')
      e.target.value = ''
      return
    }

    setFile(f)
  }

  /** Gỡ ảnh khỏi form; thay đổi này chỉ được lưu vào món sau khi bấm Lưu. */
  function removeImage() {
    setImage('')
    setFile(null)

    if (input.current) {
      input.current.value = ''
    }
  }

  /** Kiểm tra thông tin, upload ảnh mới nếu có, rồi gửi thông tin món cùng URL ảnh đến API. */
  async function submit(e) {
    e.preventDefault()
    setError('')

    if (
      !form.name.trim() ||
      !form.categoryId ||
      !/^\d+$/.test(String(form.basePrice)) ||
      Number(form.basePrice) > 1000000000
    ) {
      setError('Điền tên món, danh mục và giá nguyên từ 0 đến 1.000.000.000đ.')
      return
    }

    setBusy(true)

    try {
      let url = image

      // Upload là request riêng. API trả URL để lưu vào trường imageUrl của món.
      if (file) {
        url = (await api.upload(file)).data.url
        setImage(url)
        setFile(null)
      }

      await api.saveItem(item?.id, {
        ...form,
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        basePrice: Number(form.basePrice),
        imageUrl: url || null,
        allowedItemIds: type === 'TOPPING' ? form.allowedItemIds : [],
      })

      onSaved()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      show
      title={item ? 'Sửa món' : 'Thêm món mới'}
      size="lg"
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button className="btn btn-light-soft" disabled={busy} onClick={onClose}>
            Huỷ
          </button>
          <button
            className="btn btn-primary"
            disabled={busy || !categories.length}
            type="submit"
            form="mm-item-form"
          >
            {busy ? 'Đang lưu…' : item ? 'Lưu thay đổi' : 'Thêm món'}
          </button>
        </>
      }
    >
      <form id="mm-item-form" onSubmit={submit} className="mm-form">
        <label>
          Tên món
          <input
            className="form-control"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Ví dụ: Cà phê sữa đá"
            disabled={busy}
          />
        </label>

        <div className="mm-form-row">
          <label>
            Danh mục
            <select
              className="form-select"
              required
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              disabled={busy}
            >
              <option value="" disabled>
                Chọn danh mục
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Giá bán (đ)
            <input
              className="form-control"
              type="number"
              min="0"
              max="1000000000"
              step="1"
              required
              value={form.basePrice}
              onChange={(e) => update('basePrice', e.target.value)}
              disabled={busy}
            />
          </label>
        </div>

        <label>
          Mô tả (tuỳ chọn)
          <textarea
            className="form-control"
            maxLength={1000}
            rows={2}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            disabled={busy}
          />
        </label>

        {type === 'TOPPING' && (
          <fieldset className="border rounded p-3">
            <legend className="fs-6 float-none w-auto px-1">Các món được dùng topping này</legend>
            <p className="cf-muted">Chọn món được phép thêm topping. Không chọn món nào thì topping chỉ bán riêng.</p>
            <input className="form-control mb-2" aria-label="Tìm món đi kèm"
              placeholder="Tìm món…" value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)} disabled={busy} />
            <small className="cf-muted">Đã chọn {form.allowedItemIds.filter((id) => eligibleItems.some((m) => m.id === id)).length} món</small>
            <div className="d-flex flex-column gap-2 mt-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {matchingItems.map((candidate) => (
                <label key={candidate.id} className="d-flex flex-row align-items-center gap-2">
                  <input type="checkbox" className="form-check-input m-0"
                    checked={form.allowedItemIds.includes(candidate.id)}
                    onChange={() => toggleAllowedItem(candidate.id)} disabled={busy} />
                  <span>{candidate.name}{candidate.availabilityStatus === 'UNAVAILABLE' ? ' (Tạm hết)' : ''}</span>
                </label>
              ))}
              {matchingItems.length === 0 && <span className="cf-muted">Không có món phù hợp.</span>}
            </div>
          </fieldset>
        )}

        {/* Xem trước ảnh hiện có hoặc ảnh mới chọn; file chỉ được upload khi lưu món. */}
        <div className="mm-upload">
          <div className="mm-preview">
            {preview || image ? (
              <img src={preview || assetUrl(image)} alt="Xem trước ảnh món" />
            ) : (
              <i className="bi bi-image" />
            )}
          </div>

          <div>
            <label className="btn btn-light-soft mm-upload-button">
              <i className="bi bi-upload" /> Tải ảnh món
              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={choose}
                disabled={busy}
              />
            </label>

            <p>
              JPG, PNG, WebP · Tối đa 5 MB.
              <br />
              Không có ảnh sẽ hiện biểu tượng mặc định.
            </p>

            {(file || image) && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                disabled={busy}
                onClick={removeImage}
              >
                Gỡ ảnh
              </button>
            )}
          </div>
        </div>

        {item && (
          <small className="cf-muted">
            Giá mới chỉ áp dụng cho đơn đặt sau khi lưu. Đơn đã gửi giữ nguyên giá.
          </small>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
