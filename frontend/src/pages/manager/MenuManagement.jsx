import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/menuManagementApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import ConfirmModal from '../../components/ConfirmModal'
import Modal from '../../components/Modal'
import MenuStats from '../../components/menu/MenuStats'
import MenuItemCard from '../../components/menu/MenuItemCard'
import MenuItemModal from './MenuItemModal'
import MenuCategoryModal from './MenuCategoryModal'
import { searchText, categoryTypes } from '../../utils/menuFormat'
import '../../styles/menu-management.css'

/** Trang quản lý menu: tải dữ liệu, lọc món và điều phối các form thêm/sửa/xoá. */
export default function MenuManagement() {
  // Dữ liệu từ backend và trạng thái tải trang.
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Bộ lọc danh sách món ở frontend.
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // null: đóng form; {}: thêm mới; đối tượng có id: sửa dữ liệu hiện có.
  const [itemModal, setItemModal] = useState(null)
  const [categoryModal, setCategoryModal] = useState(null)
  const [manageCategories, setManageCategories] = useState(false)

  // deleting chứa { kind, value }; busy là id món đang cập nhật hoặc 'delete' khi xoá.
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(null)
  const toast = useToast()

  /** Tải danh sách món, danh mục và thống kê; cập nhật trạng thái tải hoặc lỗi của trang. */
  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setData((await api.catalog()).data)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // Tải menu khi mở trang. useCallback giữ tham chiếu load ổn định giữa các lần render.
  useEffect(() => {
    load()
  }, [load])

  const categories = data?.categories || []

  /** Lọc món theo danh mục và tên không dấu; chỉ tính lại khi dữ liệu hoặc bộ lọc thay đổi. */
  const filtered = useMemo(
    () => (data?.items || []).filter(
      (m) => (filter === 'all' || m.categoryId === filter) &&
        searchText(m.name).includes(searchText(search)),
    ),
    [data, filter, search],
  )

  /** Đảo trạng thái đang bán/tạm hết của một món, sau đó tải lại danh sách và thống kê. */
  async function toggle(item) {
    setBusy(item.id)

    try {
      await api.availability(item.id, item.availabilityStatus !== 'AVAILABLE')
      await load()
      toast('Đã cập nhật trạng thái bán.')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  /** Xoá món hoặc danh mục đã chọn sau khi xác nhận; bỏ bộ lọc nếu danh mục đó bị xoá. */
  async function remove() {
    setBusy('delete')

    try {
      if (deleting.kind === 'item') {
        await api.deleteItem(deleting.value.id)
      } else {
        await api.deleteCategory(deleting.value.id)

        if (filter === deleting.value.id) {
          setFilter('all')
        }
      }

      setDeleting(null)
      await load()
      toast('Đã xoá.')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  /** Nhận thông báo lưu thành công từ form con, đóng form tương ứng và tải lại menu. */
  function saved(kind) {
    if (kind === 'item') {
      setItemModal(null)
    } else {
      setCategoryModal(null)
    }

    load()
    toast('Đã lưu thành công.')
  }

  return (
    <div className="mm-page">
      {/* Tiêu đề và thao tác thêm mới. */}
      <header className="mm-header">
        <div>
          <span className="mm-eyebrow">Quản lý</span>
          <h1>Menu món</h1>
        </div>

        <div className="mm-header-actions">
          <button className="btn btn-light-soft" onClick={() => setCategoryModal({})}>
            <i className="bi bi-folder-plus" /> Thêm danh mục
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setItemModal({})}
            disabled={!categories.length}
          >
            <i className="bi bi-plus-lg" /> Thêm món
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error} <button className="btn btn-sm btn-light" onClick={load}>Thử lại</button>
        </div>
      )}

      {data && <MenuStats stats={data.stats} />}

      {/* Lọc theo danh mục và mở danh sách quản lý danh mục. */}
      <div className="mm-filter-bar">
        <div className="mm-category-tabs" role="group" aria-label="Lọc danh mục">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Tất cả <span>{data?.items.length || 0}</span>
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              className={filter === c.id ? 'active' : ''}
              onClick={() => setFilter(c.id)}
            >
              {c.name} <span>{c.itemCount}</span>
            </button>
          ))}
        </div>

        <button className="btn btn-light-soft" onClick={() => setManageCategories(true)}>
          <i className="bi bi-pencil-square" /> Quản lý danh mục
        </button>
      </div>

      <div className="mm-search">
        <i className="bi bi-search" />
        <input
          aria-label="Tìm món"
          placeholder="Tìm món…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search && (
          <button aria-label="Xoá tìm kiếm" onClick={() => setSearch('')}>
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      {/* Hiển thị trạng thái tải, danh sách rỗng hoặc các thẻ món sau khi lọc. */}
      {loading ? (
        <div className="mm-empty" role="status">Đang tải menu…</div>
      ) : (
        !error && (
          !filtered.length ? (
            <div className="mm-empty">
              <i className="bi bi-cup-hot" />
              <h2>{data?.items.length ? 'Không tìm thấy món' : 'Menu chưa có món'}</h2>
              <p>
                {data?.items.length
                  ? 'Thử từ khoá hoặc danh mục khác.'
                  : 'Thêm danh mục và món đầu tiên để bắt đầu.'}
              </p>
            </div>
          ) : (
            <div className="mm-grid">
              {filtered.map((m) => (
                <MenuItemCard
                  key={`${m.id}-${m.imageUrl}`}
                  item={m}
                  category={categories.find((c) => c.id === m.categoryId)}
                  busy={busy === m.id}
                  onEdit={() => setItemModal(m)}
                  onDelete={() => setDeleting({ kind: 'item', value: m })}
                  onToggle={() => toggle(m)}
                />
              ))}
            </div>
          )
        )
      )}

      {/* Form thêm/sửa món được mở theo itemModal. */}
      {itemModal && (
        <MenuItemModal
          item={itemModal.id ? itemModal : null}
          categories={categories}
          items={data?.items || []}
          initialCategory={filter === 'all' ? undefined : filter}
          onClose={() => setItemModal(null)}
          onSaved={() => saved('item')}
        />
      )}

      {/* Tạm ẩn danh sách danh mục khi mở form sửa hoặc hộp xác nhận xoá. */}
      {manageCategories && !categoryModal && !deleting && (
        <Modal
          show
          title="Quản lý danh mục"
          onClose={() => setManageCategories(false)}
          size="lg"
        >
          <div className="mm-category-list">
            {categories.length ? (
              categories.map((c) => (
                <div key={c.id}>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{categoryTypes[c.categoryType]} · {c.itemCount} món</small>
                  </span>

                  <div>
                    <button
                      className="btn btn-light-soft btn-sm"
                      onClick={() => setCategoryModal(c)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      disabled={c.itemCount > 0}
                      title={c.itemCount ? 'Chuyển hoặc xoá các món trước' : 'Xoá danh mục'}
                      onClick={() => setDeleting({ kind: 'category', value: c })}
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>Chưa có danh mục.</p>
            )}
          </div>

          <p className="cf-muted mt-3 mb-0">
            Để xoá danh mục còn món, sửa từng món và chuyển sang danh mục khác trước.
          </p>
        </Modal>
      )}

      {categoryModal && (
        <MenuCategoryModal
          category={categoryModal.id ? categoryModal : null}
          onClose={() => setCategoryModal(null)}
          onSaved={() => saved('category')}
        />
      )}

      <ConfirmModal
        show={!!deleting}
        title={deleting?.kind === 'item' ? 'Xoá món' : 'Xoá danh mục'}
        message={
          deleting?.kind === 'item'
            ? `Xoá “${deleting.value.name}” khỏi menu khách? Lịch sử đơn hàng vẫn được giữ nguyên.`
            : `Xoá danh mục “${deleting?.value.name || ''}”?`
        }
        confirmText="Xoá"
        danger
        loading={busy === 'delete'}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
