// Lựa chọn khi gọi món, dùng chung cho mọi màn hình (thu ngân, phục vụ...).
// Size / Topping lấy từ menu: các món trong danh mục "Size" / "Topping".
export const DEFAULT_LEVEL = '100%'
export const SUGAR_LEVELS = ['100%', '70%', '50%', '30%', '0%']
export const ICE_LEVELS = ['100%', '70%', '50%', '30%', '0%']

/** Giá 1 ly = giá món + size + topping. */
export const unitTotal = (l) =>
  (l.unitPrice || 0) + (l.sizePrice || 0) + (l.toppings || []).reduce((s, t) => s + (t.price || 0), 0)

/** Dòng món (từ ItemOptionsModal) -> body gửi backend (OrderItemRequest). */
export const toItemRequest = (l) => ({
  menuItemId: l.menuItemId,
  quantity: l.quantity,
  sizeId: l.sizeId ?? null,
  toppingIds: l.toppingIds || [],
  sugarLevel: l.sugarLevel || null,
  iceLevel: l.iceLevel || null,
  note: l.note ? l.note.trim() || null : null,
})

/** Tìm món đang bán trong menu nhân viên (/api/staff/menu). */
export const findMenuItem = (menu, id) =>
  (menu?.categories || []).flatMap((c) => c.items).find((i) => i.id === id) || null
