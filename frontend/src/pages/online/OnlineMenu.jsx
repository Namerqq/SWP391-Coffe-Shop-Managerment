import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnline } from '../../layouts/OnlineLayout'
import { formatMoney } from '../../utils/orderFormat'
import { plainText } from '../../utils/guestSession'

// Dữ liệu món mẫu
const SAMPLE_MENU = [
  {
    category: 'Cà phê',
    items: [
      { id: 1, name: 'Americano', desc: 'Espresso pha loãng, vị thanh nhẹ.', price: 39000 },
      { id: 2, name: 'Bạc xỉu', desc: 'Sữa béo nhẹ hòa quyện cùng espresso.', price: 50000 },
      { id: 3, name: 'Cà phê đen đá', desc: 'Phin Robusta đậm vị, không đường.', price: 29000 },
      { id: 4, name: 'Cà phê sữa đá', desc: 'Cà phê rang đậm và sữa đặc truyền thống.', price: 35000 },
    ],
  },
  {
    category: 'Trà',
    items: [
      { id: 5, name: 'Trà đào cam sả', desc: 'Trà thanh mát với đào tươi và sả thơm.', price: 45000 },
      { id: 6, name: 'Trà sen vàng', desc: 'Trà ô long thanh khiết, hạt sen bùi béo.', price: 45000 },
      { id: 7, name: 'Trà sữa Oolong', desc: 'Vị trà đậm đà cùng sữa béo thơm.', price: 42000 },
    ],
  },
  {
    category: 'Bánh',
    items: [
      { id: 8, name: 'Bánh Croissant bơ tỏi', desc: 'Bánh sừng bò nướng thơm giòn béo ngậy.', price: 32000 },
      { id: 9, name: 'Bánh Tiramisu', desc: 'Bánh phô mai cà phê thơm mịn chuẩn Ý.', price: 38000 },
    ],
  },
]

export default function OnlineMenu() {
  const { openModal, totalCount, totalPrice } = useOnline()
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [search, setSearch] = useState('')

  // Lọc món theo từ khóa tìm kiếm và danh mục
  const kw = plainText(search.trim())
  const displayGroups = SAMPLE_MENU
    .filter((g) => selectedCategory === 'ALL' || g.category === selectedCategory)
    .map((g) => ({
      ...g,items: g.items.filter((item) => !kw || plainText(item.name).includes(kw)),
    }))
    .filter((g) => g.items.length > 0)

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

        <div className="gx-cats">
          <button
            type="button"
            className={selectedCategory === 'ALL' ? 'active' : ''}
            onClick={() => setSelectedCategory('ALL')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={selectedCategory === 'Cà phê' ? 'active' : ''}
            onClick={() => setSelectedCategory('Cà phê')}
          >
            Cà phê
          </button>
          <button
            type="button"
            className={selectedCategory === 'Trà' ? 'active' : ''}
            onClick={() => setSelectedCategory('Trà')}
          >
            Trà
          </button>
          <button
            type="button"
            className={selectedCategory === 'Bánh' ? 'active' : ''}
            onClick={() => setSelectedCategory('Bánh')}
          >
            Bánh
          </button>
        </div>
      </div>

      {/* Thông báo khi không tìm thấy món */}
      {displayGroups.length === 0 && (
        <div className="gx-empty">
          <i className="bi bi-search gx-empty-icon" />
          <p>Không tìm thấy món nào phù hợp với &quot;{search}&quot;.</p>
        </div>
      )}

      {/* Danh sách món */}
      {displayGroups.map((group) => (
        <section key={group.category} className="gx-group">
          <h2>{group.category}</h2>
          <div className="gx-list">
            {group.items.map((item) => (
              <article key={item.id} className="gx-item">
                <span className="gx-thumb-empty">
                  <i className="bi bi-cup-hot" />
                </span>
                <div className="gx-item-body">
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
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
