import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnline } from '../../layouts/OnlineLayout'
import { formatMoney } from '../../utils/orderFormat'
import { plainText } from '../../utils/guestSession'
import { assetUrl } from '../../utils/assetUrl'
import publicApi from '../../api/publicApi'

export default function OnlineMenu() {
  const { openModal, totalCount, totalPrice } = useOnline()
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [search, setSearch] = useState('')

  // Tải thực đơn từ Public API của backend
  useEffect(() => {
    publicApi
      .getMenu()
      .then((res) => {
        // Chuẩn hóa dữ liệu trả về từ backend: name -> category, description -> desc
        const formatted = (res.data || []).map((cat) => ({
          id: cat.id,
          category: cat.name,
          items: (cat.items || []).map((item) => ({
            id: item.id,
            name: item.name,
            desc: item.description || '',
            price: item.price,
            imageUrl: item.imageUrl,
          })),
        }))
        setMenu(formatted)
      })
      .catch(() => {
        setError('Chưa tải được thực đơn từ máy chủ. Vui lòng thử lại sau.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Lọc món theo danh mục và từ khóa tìm kiếm
  const kw = plainText(search.trim())
  const displayGroups = []

  for (const group of menu) {
    if (selectedCategory !== 'ALL' && group.category !== selectedCategory) {
      continue
    }
    const matchedItems = group.items.filter((item) =>
      !kw || plainText(item.name).includes(kw)
    )
    if (matchedItems.length > 0) {
      displayGroups.push({ ...group, items: matchedItems })
    }
  }

  return (
    <>
      {/* Tìm kiếm & lọc danh mục */}
      <div className="gx-toolbar">
        <label className="gx-search">
          <i className="bi bi-search" />
          <input
            type="text"
            placeholder="Tìm món ngon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}>
              <i className="bi bi-x-lg" />
            </button>
          )}
        </label>

        {/* Nút danh mục tự động sinh theo dữ liệu từ backend */}
        {menu.length > 0 && (
          <div className="gx-cats">
            <button
              type="button"
              className={selectedCategory === 'ALL' ? 'active' : ''}
              onClick={() => setSelectedCategory('ALL')}
            >
              Tất cả
            </button>
            {menu.map((group) => (
              <button
                key={group.category}
                type="button"
                className={selectedCategory === group.category ? 'active' : ''}
                onClick={() => setSelectedCategory(group.category)}
              >
                {group.category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trạng thái tải và lỗi */}
      {loading && (
        <div className="gx-empty">
          <span className="spinner-border spinner-border-sm me-2" />
          Đang tải thực đơn từ máy chủ...
        </div>
      )}

      {!loading && error && (
        <div className="gx-empty">
          <i className="bi bi-wifi-off gx-empty-icon" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && menu.length === 0 && (
        <div className="gx-empty">
          <i className="bi bi-cup gx-empty-icon" />
          <p>Thực đơn đang được cập nhật.</p>
        </div>
      )}

      {/* Thông báo khi không tìm thấy món */}
      {!loading && !error && menu.length > 0 && displayGroups.length === 0 && (
        <div className="gx-empty">
          <i className="bi bi-search gx-empty-icon" />
          <p>Không tìm thấy món nào phù hợp với &quot;{search}&quot;.</p>
        </div>
      )}

      {/* Danh sách món từ backend */}
      {displayGroups.map((group) => (
        <section key={group.category} className="gx-group">
          <h2>{group.category}</h2>
          <div className="gx-list">
            {group.items.map((item) => (
              <article key={item.id} className="gx-item">
                {item.imageUrl ? (
                  <img src={assetUrl(item.imageUrl)} alt={item.name} />
                ) : (
                  <span className="gx-thumb-empty">
                    <i className="bi bi-cup-hot" />
                  </span>
                )}
                <div className="gx-item-body">
                  <h3>{item.name}</h3>
                  {item.desc && <p>{item.desc}</p>}
                  <span className="gx-price">{formatMoney(item.price)}</span>
                </div>
                <button
                  type="button"
                  className="gx-add"
                  title="Chọn món"
                  onClick={() => openModal(item)}
                >
                  <i className="bi bi-plus-lg" />
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Giỏ hàng ghim đáy (chỉ hiện khi giỏ có món) */}
      {totalCount > 0 && (
        <Link to="/online-order/cart" className="gx-cartbar">
          <span>
            <b>{totalCount}</b> món trong giỏ
          </span>
          <span>
            Xem giỏ hàng · {formatMoney(totalPrice)}{' '}
            <i className="bi bi-arrow-right ms-1" />
          </span>
        </Link>
      )}
    </>
  )
}
