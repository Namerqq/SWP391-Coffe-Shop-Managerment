import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import publicApi from '../../api/publicApi'
import { assetUrl } from '../../utils/assetUrl'

const money = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

// Thực đơn cho khách: chỉ xem các món đang bán (đặt hàng online làm ở Iter2).
export default function MenuPage() {
  const { content } = useOutletContext()
  const [categories, setCategories] = useState([])
  const [active, setActive] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    publicApi.getMenu()
      .then((res) => setCategories(res.data))
      .catch(() => setError('Chưa tải được thực đơn. Vui lòng thử lại sau ít phút.'))
      .finally(() => setLoading(false))
  }, [])

  const shown = active === 'ALL' ? categories : categories.filter((c) => c.id === active)

  return (
    <section className="gc-section gc-menu-page">
      <div className="gc-container">
        <div className="gc-page-head">
          <h1>Thực đơn {content['home.brand.name'] || 'Gạch Coffee'}</h1>
          <p>Các món đang phục vụ tại quán. Giá đã gồm size mặc định.</p>
        </div>

        {categories.length > 1 && (
          <div className="gc-pills" role="tablist" aria-label="Danh mục">
            <button type="button" role="tab" aria-selected={active === 'ALL'} className={active === 'ALL' ? 'active' : ''}
                    onClick={() => setActive('ALL')}>Tất cả</button>
            {categories.map((c) => (
              <button type="button" role="tab" key={c.id} aria-selected={active === c.id}
                      className={active === c.id ? 'active' : ''} onClick={() => setActive(c.id)}>{c.name}</button>
            ))}
          </div>
        )}

        {loading && <div className="gc-empty"><span className="spinner-border spinner-border-sm" /> Đang tải thực đơn...</div>}
        {!loading && error && <div className="gc-empty"><i className="bi bi-wifi-off" /> {error}</div>}
        {!loading && !error && categories.length === 0 && (
          <div className="gc-empty"><i className="bi bi-cup" /> Thực đơn đang được cập nhật.</div>
        )}

        {shown.map((cat) => (
          <div key={cat.id} className="gc-menu-group">
            <h2>{cat.name}</h2>
            {cat.description && <p className="gc-muted">{cat.description}</p>}
            <div className="gc-menu-grid">
              {cat.items.map((item) => (
                <article key={item.id} className="gc-menu-card">
                  {item.imageUrl
                    ? <img src={assetUrl(item.imageUrl)} alt={item.name} loading="lazy" />
                    : <div className="gc-menu-img-empty" aria-hidden="true"><i className="bi bi-cup-hot" /></div>}
                  <div className="gc-menu-card-body">
                    <h3>{item.name}</h3>
                    {item.description && <p>{item.description}</p>}
                    <span className="gc-price">{money(item.price)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

        {!loading && categories.length > 0 && (
          <div className="gc-menu-cta">
            <Link to="/dat-hang-online" className="gc-btn gc-btn-primary"><i className="bi bi-bag" /> Đặt hàng online</Link>
          </div>
        )}
      </div>
    </section>
  )
}
