import { useState } from 'react'
import { assetUrl } from '../../utils/assetUrl'
import { money } from '../../utils/menuFormat'

/** Thẻ hiển thị thông tin món và các thao tác quản lý. */
export default function MenuItemCard({
  item,
  category,
  busy,
  onEdit,
  onDelete,
  onToggle,
}) {
  const [imageFailed, setImageFailed] = useState(false)

  const isAvailable = item.availabilityStatus === 'AVAILABLE'
  const isTopping = category?.categoryType === 'TOPPING'
  const hasImage = Boolean(item.imageUrl) && !imageFailed

  return (
    <article className={`mm-card ${isAvailable ? '' : 'mm-soldout'}`}>
      {/* Bấm ảnh hoặc tên món để mở form sửa. */}
      <button
        className="mm-photo"
        onClick={onEdit}
        aria-label={`Sửa ${item.name}`}
      >
        {hasImage ? (
          <img
            src={assetUrl(item.imageUrl)}
            alt={item.name}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span>
            <i className="bi bi-image" />
            <small>Chưa có ảnh</small>
          </span>
        )}

        {!isAvailable && <span className="mm-overlay">Tạm hết</span>}
      </button>

      <div className="mm-card-body">
        {/* Thông tin món. */}
        <button className="mm-item-name" onClick={onEdit}>
          {item.name}
        </button>

        <p className="mm-description">{item.description || ' '}</p>
        <strong className="mm-price">{money(item.basePrice)}</strong>

        {isTopping && (
          <small className="mm-option-note">Thêm kèm hoặc bán lẻ</small>
        )}

        {/* Danh mục và công tắc bật/tắt bán. */}
        <div className="mm-card-bottom">
          <span>{category?.name}</span>

          <button
            type="button"
            role="switc"
            aria-checked={isAvailable}
            aria-label={`Còn bán ${item.name}`}
            className={`mm-switch ${isAvailable ? 'on' : ''}`}
            disabled={busy}
            onClick={onToggle}
          >
            <span>{isAvailable ? 'Bán' : 'Tắt'}</span>
            <i />
          </button>
        </div>

        {/* Các callback được trang cha truyền vào để xử lý thao tác. */}
        <div className="mm-card-actions">
          <button onClick={onEdit} disabled={busy}>
            <i className="bi bi-pencil" /> Sửa
          </button>

          <button
            className="mm-delete"
            onClick={onDelete}
            disabled={busy}
          >
            <i className="bi bi-trash" /> Xoá
          </button>
        </div>
      </div>
    </article>
  )
}
