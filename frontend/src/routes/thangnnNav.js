// ThangNN: menu trái + trang mặc định sau đăng nhập cho Thu ngân.
export const thangnnNav = {
  CASHIER: {
    subtitle: 'Thu ngân',
    items: [
      { to: '/cashier', label: 'Thanh toán', icon: 'bi-cash-coin', end: true },
      { to: '/cashier/takeaway', label: 'Bán mang đi', icon: 'bi-bag' },
      { to: '/cashier/tables', label: 'Sơ đồ bàn', icon: 'bi-grid-3x3-gap' },
      { to: '/cashier/history', label: 'Lịch sử đơn', icon: 'bi-clock-history' }, // Iter3: UC-C15
      { to: '/cashier/loyalty', label: 'Khách thân thiết', icon: 'bi-people' }, // Iter3: UC-C12 / C10 / C13
      
    ],
  },
}

export const thangnnHomes = { CASHIER: '/cashier' }
