import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { formatDateTime } from '../../utils/format'
import InventoryItemModal from './InventoryItemModal'
import StockInModal from './StockInModal'

export default function InventoryList() {
  const { addToast } = useToast()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // ALL, LOW_STOCK
  const [lowStockCount, setLowStockCount] = useState(0)
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false)
  const [showStockInModal, setShowStockInModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const statsRes = await inventoryApi.stats()
      setLowStockCount(statsRes.data.lowStock)
      
      let res
      if (filter === 'LOW_STOCK') {
        res = await inventoryApi.lowStock()
      } else {
        res = await inventoryApi.list()
      }
      setItems(res.data)
    } catch (err) {
      addToast({ message: errorMessage(err), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter])

  const handleOpenEdit = (item) => {
    setSelectedItem(item)
    setShowItemModal(true)
  }

  const handleOpenAdd = () => {
    setSelectedItem(null)
    setShowItemModal(true)
  }

  const handleOpenStockIn = (item) => {
    setSelectedItem(item)
    setShowStockInModal(true)
  }

  const handleSuccess = () => {
    setShowItemModal(false)
    setShowStockInModal(false)
    loadData()
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <h1 className="page-title">Kho nguyên liệu</h1>
          <p className="page-subtitle mb-0">Số tồn chỉ thay đổi qua nhập kho (quản lý) và xuất kho (pha chế); mọi lần thay đổi đều được ghi lịch sử</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-light-soft d-flex align-items-center gap-2">
            <i className="bi bi-clock-history" /> Lịch sử
          </button>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg" /> Thêm nguyên liệu
          </button>
        </div>
      </div>

      <div className="cf-card p-4">
        <div className="inventory-filters">
          <button 
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            Tất cả
          </button>
          <button 
            className={`filter-btn ${filter === 'LOW_STOCK' ? 'active' : ''}`}
            onClick={() => setFilter('LOW_STOCK')}
          >
            Sắp hết {lowStockCount > 0 && `(${lowStockCount})`}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-box-seam" />
            <div>Không có nguyên liệu nào</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table">
              <thead>
                <tr>
                  <th>Nguyên liệu</th>
                  <th className="text-end">Tồn hiện tại</th>
                  <th className="text-end">Tối thiểu</th>
                  <th className="text-center">Tình trạng</th>
                  <th>Cập nhật</th>
                  <th className="text-end">Thao tác</th>
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
                    <td className="text-end text-muted">
                      {Number(item.minimumStockLevel).toLocaleString('vi-VN')} {item.unit}
                    </td>
                    <td className="text-center">
                      {item.lowStock ? (
                        <span className="cf-badge badge-locked">Sắp hết</span>
                      ) : (
                        <span className="cf-badge badge-active">Đủ dùng</span>
                      )}
                    </td>
                    <td className="text-muted small">
                      {formatDateTime(item.updatedAt)}
                    </td>
                    <td>
                      <div className="action-links justify-content-end">
                        <button type="button" onClick={() => handleOpenStockIn(item)}>Nhập</button>
                        <span className="separator">|</span>
                        <button type="button" onClick={() => handleOpenEdit(item)}>Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InventoryItemModal 
        show={showItemModal} 
        onClose={() => setShowItemModal(false)} 
        onSuccess={handleSuccess} 
        item={selectedItem} 
      />
      
      <StockInModal
        show={showStockInModal}
        onClose={() => setShowStockInModal(false)}
        onSuccess={handleSuccess}
        item={selectedItem}
      />
    </div>
  )
}
