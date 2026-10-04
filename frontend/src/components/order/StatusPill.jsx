import { orderStatusLabel, orderStatusTone } from '../../utils/orderFormat'

// Nhãn trạng thái đơn (Chờ pha / Đang pha / Chờ mang ra / Đã phục vụ / Đã hủy).
export default function StatusPill({ status }) {
  return <span className={`status-pill tone-${orderStatusTone(status)}`}>{orderStatusLabel(status)}</span>
}
