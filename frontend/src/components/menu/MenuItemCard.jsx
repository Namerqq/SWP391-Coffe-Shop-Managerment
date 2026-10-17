import { useState } from 'react'
import { assetUrl } from '../../utils/assetUrl'
import { money } from '../../utils/menuFormat'
export default function MenuItemCard({ item, category, busy, onEdit, onDelete, onToggle }) {
  const [failed, setFailed] = useState(false)
  const available = item.availabilityStatus === 'AVAILABLE'
  return <article className={`mm-card ${available ? '' : 'mm-soldout'}`}>
    <button className="mm-photo" onClick={onEdit} aria-label={`Sửa ${item.name}`}>
      {item.imageUrl && !failed ? <img src={assetUrl(item.imageUrl)} alt={item.name} onError={() => setFailed(true)} /> : <span><i className="bi bi-image" /><small>Chưa có ảnh</small></span>}
      {!available && <span className="mm-overlay">Tạm hết</span>}
    </button>
    <div className="mm-card-body"><button className="mm-item-name" onClick={onEdit}>{item.name}</button>
      <p className="mm-description">{item.description || ' '}</p><strong className="mm-price">{money(item.basePrice)}</strong>
      {category?.categoryType === 'TOPPING' && <small className="mm-option-note">Thêm kèm hoặc bán lẻ</small>}
      <div className="mm-card-bottom"><span>{category?.name}</span><button type="button" role="switch" aria-checked={available} aria-label={`Còn bán ${item.name}`} className={`mm-switch ${available ? 'on' : ''}`} disabled={busy} onClick={onToggle}><span>{available ? 'Bán' : 'Tắt'}</span><i /></button></div>
      <div className="mm-card-actions"><button onClick={onEdit} disabled={busy}><i className="bi bi-pencil" /> Sửa</button><button onClick={onDelete} disabled={busy} className="mm-delete"><i className="bi bi-trash" /> Xoá</button></div>
    </div>
  </article>
}
