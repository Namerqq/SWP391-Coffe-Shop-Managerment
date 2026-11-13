// Nguồn biên bản sự cố (backend IncidentReportView.source).
// Chỉ biên bản do phục vụ báo đổ / vỡ mới là lỗi của người báo (quản lý phạt được).
// Thu ngân bỏ / hoàn món đã pha và job cuối ngày chỉ ghi nhận hao hụt món, không phạt người báo.
export const SOURCE_LABEL = {
  WAITER: { text: 'Phục vụ báo đổ / vỡ', badge: 'text-bg-danger' },
  CASHIER: { text: 'Thu ngân bỏ / hoàn món', badge: 'text-bg-info' },
  SYSTEM: { text: 'Tự động cuối ngày', badge: 'text-bg-secondary' },
}

export const sourceLabel = (r) => SOURCE_LABEL[r.source] || SOURCE_LABEL.SYSTEM

export const isWaiterReport = (r) => r.source === 'WAITER'

// Tên hiện ở cột "Người báo": job cuối ngày ghi bằng tài khoản Admin nên hiện "Hệ thống".
export const reporterLabel = (r) => (r.source === 'SYSTEM' ? 'Hệ thống' : r.reporterName)
