import { money } from '../../utils/menuFormat'
export default function MenuStats({ stats }) {
  return <div className="mm-stats">
    {[['bi-cup-hot', 'Tổng món', stats.total, `${stats.categoryCount} danh mục · món bán riêng`],
      ['bi-shop', 'Đang bán', stats.selling, `${stats.unavailable} tạm hết`],
      ['bi-cash-stack', 'Giá trung bình', money(stats.averagePrice), 'Giá niêm yết đồ uống và bánh']].map(([icon,label,value,note]) =>
      <div className="mm-stat" key={label}><span className="mm-stat-icon"><i className={`bi ${icon}`} /></span><div><span className="mm-eyebrow">{label}</span><strong>{value}</strong><small>{note}</small></div></div>)}
  </div>
}
