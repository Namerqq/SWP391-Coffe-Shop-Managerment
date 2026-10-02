import { useEffect, useState } from 'react'
import categoryApi from '../../api/categoryApi'
import menuItemApi from '../../api/menuItemApi'
import MenuItemFormModal from '../../components/manager/MenuItemFormModal'
import Toast, { useToast } from '../../components/Toast'
import { formatVnd, getErrorMessage, initial } from '../../utils/format'

// Màn 1.1.2 Menu management - UC-DM01 Manage Drink Menu, UC-DM02 Set Item Availability (Manager)
// "Xóa" món = chuyển availability_status sang INACTIVE (không xóa khỏi DB, giữ lịch sử đơn).
export default function MenuItemManagement() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, showToast] = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await menuItemApi.search({ keyword, categoryId, includeInactive })
      setItems(res.data)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    categoryApi.getAll().then((res) => setCategories(res.data)).catch(() => {})
  }, [])

  // Tự tìm lại khi đổi bộ lọc; gõ từ khóa thì chờ 300ms để không gọi API liên tục
  useEffect(() => {
    const t = setTimeout(fetchItems, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, categoryId, includeInactive])

  const openCreate = () => {
    if (categories.length === 0) return showToast('Hãy tạo danh mục trước khi thêm món', 'error')
    setEditingItem(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSaved = (message) => {
    setShowForm(false)
    showToast(message)
    fetchItems()
  }

  // UC-DM02: bật/tắt "Còn bán" ngay trên bảng
  const toggleAvailability = async (item) => {
    const next = item.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE'
    try {
      const res = await menuItemApi.changeAvailability(item.id, next)
      setItems((list) => list.map((x) => (x.id === item.id ? res.data : x)))
      showToast(next === 'AVAILABLE' ? `"${item.name}" đã mở bán lại` : `"${item.name}" đã chuyển sang tạm hết`)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Xóa món "${item.name}"? Món sẽ ngừng bán và ẩn khỏi menu (vẫn có thể khôi phục).`)) return
    try {
      await menuItemApi.remove(item.id)
      showToast('Đã xóa món')
      fetchItems()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const handleRestore = async (item) => {
    try {
      await menuItemApi.restore(item.id)
      showToast(`Đã khôi phục "${item.name}"`)
      fetchItems()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Món trong menu</h1>
          <p className="page-subtitle">Tắt "Còn bán" khi món tạm hết. Món đã xóa sẽ không hiện với khách nhưng vẫn giữ lịch sử đơn.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm món</button>
      </div>

      <div className="surface overflow-hidden">
        <div className="d-flex flex-wrap gap-2 align-items-center p-3 border-bottom">
          <input
            className="form-control" style={{ flex: '2 1 220px' }} placeholder="Tìm món..."
            value={keyword} onChange={(e) => setKeyword(e.target.value)}
          />
          <select className="form-select" style={{ flex: '1 1 180px' }} value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Mọi danh mục</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="form-check ms-1">
            <input className="form-check-input" type="checkbox" id="showInactive"
              checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            <label className="form-check-label" htmlFor="showInactive">Hiện món đã xóa</label>
          </div>
        </div>

        {error && <div className="alert alert-danger m-3">{error}</div>}

        <div className="table-responsive">
          <table className="table table-minimal align-middle">
            <thead>
              <tr>
                <th>Món</th>
                <th>Danh mục</th>
                <th>Giá</th>
                <th style={{ width: 110 }}>Còn bán</th>
                <th style={{ width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const inactive = item.availabilityStatus === 'INACTIVE'
                return (
                  <tr key={item.id} style={inactive ? { opacity: 0.55 } : undefined}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="thumb">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" /> : initial(item.name)}
                        </div>
                        <div>
                          <div className="fw-semi">
                            {item.name}
                            {inactive && <span className="badge-soft danger ms-2">Đã xóa</span>}
                          </div>
                          {item.description && <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>{item.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{item.categoryName}</td>
                    <td className="text-nowrap">{formatVnd(item.basePrice)}</td>
                    <td>
                      <div className="form-check form-switch m-0">
                        <input
                          className="form-check-input" type="checkbox" role="switch"
                          checked={item.availabilityStatus === 'AVAILABLE'}
                          disabled={inactive}
                          onChange={() => toggleAvailability(item)}
                          title={item.availabilityStatus === 'AVAILABLE' ? 'Đang bán' : 'Tạm hết'}
                        />
                      </div>
                    </td>
                    <td className="text-end text-nowrap">
                      {inactive ? (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleRestore(item)}>Khôi phục</button>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-light-soft me-2" onClick={() => openEdit(item)}>Sửa</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item)}>Xóa</button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && items.length === 0 && (
                <tr><td colSpan="5" className="text-center text-muted py-5">Không có món nào</td></tr>
              )}
              {loading && items.length === 0 && (
                <tr><td colSpan="5" className="text-center text-muted py-5">Đang tải...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MenuItemFormModal
        show={showForm}
        item={editingItem}
        categories={categories}
        onClose={() => setShowForm(false)}
        onSaved={handleSaved}
      />

      <Toast toast={toast} />
    </>
  )
}
