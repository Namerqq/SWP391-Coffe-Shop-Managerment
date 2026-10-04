import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGuest } from '../../layouts/GuestLayout'
import { assetUrl } from '../../utils/assetUrl'
import { formatMoney } from '../../utils/orderFormat'
import { plainText } from '../../utils/guestSession'

// Customer Menu (QR Table) — SRS 1.1, UC-CU01 View Menu.
export default function GuestMenu() {
  const { table, tableChecked, menu, menuError, loadMenu, count, total, pickItem } = useGuest()
  const [keyword, setKeyword] = useState('')
  const [cat, setCat] = useState('ALL')

  const categories = useMemo(() => menu?.categories || [], [menu])
  const groups = useMemo(() => {
    const kw = plainText(keyword.trim())
    return categories
      .filter((c) => cat === 'ALL' || c.id === cat)
      .map((c) => ({ ...c, items: c.items.filter((i) => !kw || plainText(i.name).includes(kw)) }))
      .filter((c) => c.items.length > 0)
  }, [categories, cat, keyword])

  return (
    <>
      {tableChecked && !table && (
        <div className="gx-notice">
          <i className="bi bi-qr-code-scan" />
          <div>
            <strong>Quét mã QR trên bàn để gọi món</strong>
            <span>Bạn vẫn xem được thực đơn. Mã QR giúp quán biết món mang ra bàn nào.</span>
          </div>
        </div>
      )}

      <div className="gx-toolbar">
        <label className="gx-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input placeholder="Tìm món" aria-label="Tìm món" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          {keyword && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setKeyword('')}><i className="bi bi-x-lg" /></button>}
        </label>
        {categories.length > 1 && (
          <div className="gx-cats" role="tablist" aria-label="Danh mục">
            <button type="button" role="tab" aria-selected={cat === 'ALL'} className={cat === 'ALL' ? 'active' : ''} onClick={() => setCat('ALL')}>Tất cả</button>
            {categories.map((c) => (
              <button type="button" role="tab" key={c.id} aria-selected={cat === c.id} className={cat === c.id ? 'active' : ''}
                      onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>
        )}
      </div>

      {!menu && !menuError && <div className="gx-empty"><span className="spinner-border spinner-border-sm" /> Đang tải thực đơn...</div>}
      {menuError && (
        <div className="gx-empty">
          <p>{menuError}</p>
          <button type="button" className="btn btn-light-soft" onClick={loadMenu}>Thử lại</button>
        </div>
      )}
      {menu && groups.length === 0 && (
        <div className="gx-empty">{keyword ? 'Không tìm thấy món phù hợp.' : 'Thực đơn đang được cập nhật.'}</div>
      )}

      {groups.map((c) => (
        <section key={c.id} className="gx-group" aria-label={c.name}>
          <h2>{c.name}</h2>
          <div className="gx-list">
            {c.items.map((i) => (
              <article key={i.id} className="gx-item">
                {i.imageUrl
                  ? <img src={assetUrl(i.imageUrl)} alt="" loading="lazy" />
                  : <span className="gx-thumb-empty" aria-hidden="true"><i className="bi bi-cup-hot" /></span>}
                <div className="gx-item-body">
                  <h3>{i.name}</h3>
                  {i.description && <p>{i.description}</p>}
                  <span className="gx-price">{formatMoney(i.price)}</span>
                </div>
                <button type="button" className="gx-add" disabled={!table} aria-label={`Thêm ${i.name}`}
                        title={table ? 'Thêm vào giỏ' : 'Quét QR trên bàn để gọi món'} onClick={() => pickItem(i)}>
                  <i className="bi bi-plus-lg" />
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}

      {count > 0 && (
        <Link to="/cart" className="gx-cartbar">
          <span><b>{count}</b> món trong giỏ</span>
          <span>Xem giỏ hàng · {formatMoney(total)} <i className="bi bi-arrow-right" /></span>
        </Link>
      )}
    </>
  )
}
