import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { formatDateTime } from '../../utils/format'
import InventoryItemModal from './InventoryItemModal'
import StockInModal from './StockInModal'
import StockOutModal from './StockOutModal'
import StockHistoryModal from './StockHistoryModal'

export default function InventoryList() {
  const { addToast } = useToast()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // ALL, LOW_STOCK
  const [searchQuery, setSearchQuery] = useState('')
  const [lowStockCount, setLowStockCount] = useState(0)
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false)
  const [showStockInModal, setShowStockInModal] = useState(false)
  const [showStockOutModal, setShowStockOutModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
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

  const handleOpenStockOut = (item) => {
    setSelectedItem(item)
    setShowStockOutModal(true)
  }

  const handleOpenHistory = (item) => {
    setSelectedItem(item)
    setShowHistoryModal(true)
  }

  const handleSuccess = () => {
    setShowItemModal(false)
    setShowStockInModal(false)
    setShowStockOutModal(false)
    setSelectedItem(null)
    loadData()
  }

  // Filter items by search query
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true
    return item.itemName.toLowerCase().includes(searchQuery.trim().toLowerCase())
  })

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <h1 className="page-title">Kho nguyên liệu</h1>
          <p className="page-subtitle mb-0">Quản lý số tồn, định mức cảnh báo và lịch sử nhập/xuất/cân chỉnh kho minh bạch</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/manager/stock-history" className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-xs">
            <i className="bi bi-clock-history" /> Sổ biến động kho
          </Link>
          <Link to="/manager/stock-receipts" className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-xs">
            <i className="bi bi-file-earmark-arrow-down" /> Quản lý phiếu nhập kho
          </Link>
          <button 
            type="button" 
            className="btn btn-light-soft d-flex align-items-center gap-2"
            onClick={loadData}
            title="Tải lại dữ liệu mới nhất từ hệ thống"
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`} /> Làm mới
          </button>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg" /> Thêm nguyên liệu
          </button>
        </div>
      </div>

      <div className="cf-card p-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div className="inventory-filters mb-0">
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

          <div className="search-box" style={{ maxWidth: '280px', width: '100%' }}>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input 
                type="text" 
                className="form-control border-start-0 ps-0" 
                placeholder="Tìm tên nguyên liệu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="btn btn-outline-secondary border-start-0" 
                  type="button"
                  onClick={() => setSearchQuery('')}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-box-seam" />
            <div>{searchQuery ? 'Không tìm thấy nguyên liệu phù hợp với từ khóa' : 'Không có nguyên liệu nào'}</div>
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
                {filteredItems.map(item => (
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
                        <button type="button" className="text-warning-emphasis" onClick={() => handleOpenStockOut(item)}>Giảm</button>
                        <span className="separator">|</span>
                        <button type="button" onClick={() => handleOpenEdit(item)}>Sửa</button>
                        <span className="separator">|</span>
                        <button type="button" className="text-secondary" onClick={() => handleOpenHistory(item)}>Lịch sử</button>
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

      <StockOutModal
        show={showStockOutModal}
        onClose={() => setShowStockOutModal(false)}
        onSuccess={handleSuccess}
        item={selectedItem}
      />

      <StockHistoryModal
        show={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        item={selectedItem}
      />
    </div>
  )
}
