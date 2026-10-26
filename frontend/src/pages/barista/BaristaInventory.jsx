import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import BaristaShortageModal from './BaristaShortageModal'
import BaristaWasteModal from './BaristaWasteModal'

export default function BaristaInventory() {
  const toast = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [shortageModalOpen, setShortageModalOpen] = useState(false)
  const [shortageTargetItem, setShortageTargetItem] = useState(null)

  const [wasteModalOpen, setWasteModalOpen] = useState(false)
  const [wasteTargetItem, setWasteTargetItem] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.baristaList()
      setItems(res.data)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenShortage = (item = null) => {
    setShortageTargetItem(item)
    setShortageModalOpen(true)
  }

  const handleOpenWaste = (item) => {
    setWasteTargetItem(item)
    setWasteModalOpen(true)
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="page-title">Nguyên liệu kho quầy pha chế</h1>
          <p className="page-subtitle">Theo dõi tồn kho, báo thiếu nguyên liệu và ghi nhận hao hụt</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-light-soft btn-sm" onClick={loadData} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1" /> Làm mới
          </button>
          <button
            className="btn btn-warning btn-sm fw-medium shadow-sm"
            onClick={() => handleOpenShortage()}
          >
            <i className="bi bi-exclamation-octagon me-1" /> Báo thiếu nguyên liệu
          </button>
        </div>
      </div>

      <div className="cf-card p-0 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-box-seam" />
            <div>Không có nguyên liệu nào trong hệ thống</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Nguyên liệu</th>
                  <th className="text-end">Tồn hiện tại</th>
                  <th className="text-center">Tình trạng</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold text-dark">{item.itemName}</div>
                      <div className="small text-muted">Đơn vị: {item.unit}</div>
                    </td>
                    <td className="text-end fw-bold">
                      <span className={item.lowStock ? 'text-danger' : 'text-success'}>
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
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning py-1 px-2"
                          title="Báo thiếu nguyên liệu này"
                          onClick={() => handleOpenShortage(item)}
                        >
                          <i className="bi bi-megaphone me-1" /> Báo thiếu
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          title="Báo hao hụt / hư hỏng"
                          onClick={() => handleOpenWaste(item)}
                        >
                          <i className="bi bi-trash3 me-1" /> Báo hỏng
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Báo thiếu nguyên liệu (UC-B05) */}
      <BaristaShortageModal
        show={shortageModalOpen}
        initialItem={shortageTargetItem}
        items={items}
        onClose={() => setShortageModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal Báo hao hụt / hư hỏng (UC-B06) */}
      <BaristaWasteModal
        show={wasteModalOpen}
        item={wasteTargetItem}
        onClose={() => setWasteModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  )
}
