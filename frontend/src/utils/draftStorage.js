export function readDraft(staff) {
  try {
    const value = JSON.parse(
      (staff ? sessionStorage : localStorage).getItem(
        staff ? "cafe-v1-staff-draft" : "cafe-v1-customer-draft",
      ) || "{}",
    );
    return {
      ...value,
      cart: Array.isArray(value.cart)
        ? value.cart.filter(
            (x) =>
              x.cartId &&
              Number.isSafeInteger(x.id) &&
              x.id > 0 &&
              Number.isFinite(x.price) &&
              Array.isArray(x.extras) &&
              x.quantity >= 1 &&
              x.quantity <= 50,
          )
        : [],
    };
  } catch {
    return { cart: [] };
  }
}

export function saveDraft(staff, draft) {
  (staff ? sessionStorage : localStorage).setItem(
    staff ? "cafe-v1-staff-draft" : "cafe-v1-customer-draft",
    JSON.stringify(draft),
  );
}
