// Lựa chọn khi gọi món, dùng chung cho mọi màn hình (thu ngân, phục vụ...).
// Size chỉ chọn kèm món; topping vừa chọn kèm vừa bán riêng theo số lượng.
export const DEFAULT_LEVEL = '100%'
export const SUGAR_LEVELS = ['100%', '70%', '50%', '30%', '0%']
export const ICE_LEVELS = ['100%', '70%', '50%', '30%', '0%']

export const SIZE_OPTIONS = [
  { id: 'S', name: 'S', price: 0 },
  { id: 'M', name: 'M', price: 5000 },
  { id: 'L', name: 'L', price: 15000 },
]
export const defaultCustomization = () => ({ sizes: ['S', 'M', 'L'], defaultSize: 'S',
  sugarLevels: [...SUGAR_LEVELS], defaultSugar: '100%', iceLevels: [...ICE_LEVELS], defaultIce: '100%', legacy: false })
export const customizationForItem = (item, options) => {
  const menuItem = (options?.categories || []).flatMap((c) => c.items)
    .find((m) => m.id === (item?.menuItemId ?? item?.id)) || item
  if (isToppingItem(menuItem, options) || isSizeItem(menuItem, options)) {
    return { sizes: [], defaultSize: null, sugarLevels: [], defaultSugar: null, iceLevels: [], defaultIce: null, legacy: false }
  }
  return menuItem?.customization || { sizes: ['M', 'L'], defaultSize: 'M', sugarLevels: SUGAR_LEVELS,
    defaultSugar: '100%', iceLevels: ICE_LEVELS, defaultIce: '100%', legacy: true }
}
export const sizesForItem = (item, options) => {
  const config = customizationForItem(item, options)
  return SIZE_OPTIONS.filter((size) => config.sizes.includes(size.id))
    .map((size) => ({ ...size, price: config.legacy ? (size.id === 'L' ? 10000 : 0) : size.price }))
}
export const allowedValue = (value, levels, fallback) => levels.includes(value) ? value : fallback

// Dùng danh sách options để nhận diện cả dữ liệu giỏ cũ chưa có categoryType.
export const isSizeItem = (item, menu) => item?.categoryType
  ? item.categoryType === 'SIZE'
  : (menu?.sizes || []).some((s) => s.id === (item?.menuItemId ?? item?.id))

export const isToppingItem = (item, menu) => item?.categoryType
  ? item.categoryType === 'TOPPING'
  : (menu?.toppings || []).some((t) => t.id === (item?.menuItemId ?? item?.id))

export const standaloneCategories = (menu) => (menu?.categories || [])
  .map((c) => ({ ...c, items: c.items.filter((item) => !isSizeItem(item, menu)) }))
  .filter((c) => c.items.length > 0)

/** Chỉ lấy topping đã được quản lý gán cho món; chưa cấu hình thì không có. */
export const toppingsForItem = (item, options) => {
  if (!item || isToppingItem(item, options) || isSizeItem(item, options)) return []
  const id = item.menuItemId ?? item.id
  return (options?.toppings || []).filter((t) => (t.allowedItemIds || []).includes(id))
}

/** Giá 1 ly = giá món + size + topping. */
export const unitTotal = (l) =>
  (l.unitPrice || 0) + (l.sizePrice || 0) + (l.toppings || []).reduce((s, t) => s + (t.price || 0), 0)

/** Dòng món (từ ItemOptionsModal) -> body gửi backend (OrderItemRequest). */
export const toItemRequest = (l) => ({
  menuItemId: l.menuItemId,
  quantity: l.quantity,
  sizeCode: l.sizeCode ?? l.sizeName ?? null,
  toppingIds: l.toppingIds || [],
  sugarLevel: l.sugarLevel || null,
  iceLevel: l.iceLevel || null,
  note: l.note ? l.note.trim() || null : null,
})

/** Tìm món đang bán trong menu nhân viên (/api/staff/menu). */
export const findMenuItem = (menu, id) =>
  standaloneCategories(menu).flatMap((c) => c.items).find((i) => i.id === id) || null
