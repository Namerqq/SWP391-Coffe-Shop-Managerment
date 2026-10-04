// DanMT: menu trái + trang mặc định sau đăng nhập cho Pha chế, Phục vụ (và 1 mục trong menu Thu ngân).
export const danmtNav = {
  BARISTA: {
    subtitle: 'Pha chế',
    items: [
      { to: '/barista', label: 'Đơn cần pha', icon: 'bi-cup-straw', end: true },
      { to: '/barista/inventory', label: 'Kho nguyên liệu', icon: 'bi-box-seam' }
    ],
  },
  WAITER: {
    subtitle: 'Phục vụ',
    items: [
      { to: '/waiter', label: 'Sơ đồ bàn', icon: 'bi-grid-3x3-gap', end: true },
      { to: '/waiter/ready', label: 'Món chờ mang ra', icon: 'bi-bell' },
    ],
  },
  CASHIER: {
    items: [{ to: '/cashier/pickup-ready', label: 'Mang đi chờ giao', icon: 'bi-bell' }],
  },
}

export const danmtHomes = { BARISTA: '/barista', WAITER: '/waiter' }
