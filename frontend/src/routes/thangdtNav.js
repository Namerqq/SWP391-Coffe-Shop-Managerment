// ThangDT: menu trái cho Thu ngân (Đơn giao hàng online) và Phục vụ (Đơn giao của tôi)
export const thangdtNav = {
  CASHIER: {
    items: [
      { to: '/cashier/delivery-orders', label: 'Đơn giao hàng', icon: 'bi-truck' },
    ],
  },
  WAITER: {
    items: [{ to: '/waiter/deliveries', label: 'Đơn giao của tôi', icon: 'bi-bicycle' }],
  },
}
