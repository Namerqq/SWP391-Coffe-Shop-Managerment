import { money } from '../../utils/menuFormat'

/** Hiển thị các ô thống kê menu; stats được trang MenuManagement truyền xuống. */
export default function MenuStats({ stats }) {
  // Mỗi đối tượng là dữ liệu của một ô thống kê.
  // Dùng tên thuộc tính để dễ hiểu hơn so với truy cập theo vị trí trong mảng.
  const statCards = [
    {
      icon: 'bi-cup-hot',
      label: 'Tổng món',
      value: stats.total,
      note: `${stats.categoryCount} danh mục · món bán riêng`,
    },
    {
      icon: 'bi-shop',
      label: 'Đang bán',
      value: stats.selling,
      note: `${stats.unavailable} tạm hết`,
    },
    {
      icon: 'bi-cash-stack',
      label: 'Giá trung bình',
      // money() định dạng giá thành chuỗi tiền để hiển thị.
      value: money(stats.averagePrice),
      note: 'Giá niêm yết đồ uống và bánh',
    },
  ]

  return (
    <div className="mm-stats">
      {/* map() tạo một ô hiển thị cho mỗi đối tượng trong statCards. */}
      {statCards.map((stat) => (
        <div className="mm-stat" key={stat.label}>
          {/* Biểu tượng của ô thống kê, dùng thư viện Bootstrap Icons. */}
          <span className="mm-stat-icon">
            <i className={`bi ${stat.icon}`} />
          </span>

          {/* Tiêu đề, giá trị và ghi chú của ô thống kê. */}
          <div>
            <span className="mm-eyebrow">{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.note}</small>
          </div>
        </div>
      ))}
    </div>
  )
}
