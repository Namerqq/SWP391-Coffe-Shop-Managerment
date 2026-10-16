export const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0)
export const categoryTypes = { DRINK: 'Đồ uống', FOOD: 'Bánh / Đồ ăn', TOPPING: 'Topping' }
export const searchText = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()
