import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

export default function BaristaInventory() {
  const { addToast } = useToast()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.baristaList()
      setItems(res.data)
    } catch (err) {
      addToast({ message: errorMessage(err), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Nguyên liệu kho</h1>
          <p className="page-subtitle">Xem tình trạng tồn kho hiện tại (Chỉ đọc)</p>
        </div>
        <button className="btn btn-light-soft btn-sm" onClick={loadData} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </button>
      </div>

      <div className="cf-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-box-seam" />
            <div>Không có nguyên liệu nào</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0">
              <thead>
                <tr>
                  <th>Nguyên liệu</th>
                  <th className="text-end">Tồn hiện tại</th>
                  <th className="text-center">Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="fw-medium">{item.itemName}</td>
                    <td className="text-end fw-bold">
                      <span className={item.lowStock ? 'text-danger' : ''}>
                        {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit}
                      </span>
                    </td>
                    <td className="text-center">
                      {item.lowStock ? (
                        <span className="cf-badge badge-locked">Sắp hết</span>
                      ) : (
                        <span className="cf-badge badge-active">Đủ dùng</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
