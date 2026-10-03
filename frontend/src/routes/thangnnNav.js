// ThangNN: menu trái + trang mặc định sau đăng nhập cho Thu ngân.
export const thangnnNav = {
  CASHIER: {
    subtitle: 'Thu ngân',
    items: [
      { to: '/cashier', label: 'Thanh toán', icon: 'bi-cash-coin', end: true },
    ],
  },
}

export const thangnnHomes = { CASHIER: '/cashier' }
