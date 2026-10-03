// ThangNN: menu trái + trang mặc định sau đăng nhập cho Thu ngân.
export const thangnnNav = {
  CASHIER: {
    subtitle: 'Thu ngân',
    items: [
      { to: '/cashier', label: 'Thanh toán', icon: 'bi-cash-coin', end: true },
      { to: '/cashier/tables', label: 'Sơ đồ bàn', icon: 'bi-grid-3x3-gap' },
    ],
  },
}

export const thangnnHomes = { CASHIER: '/cashier' }
