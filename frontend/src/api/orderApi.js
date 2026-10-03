import { request } from "./cafeClient";
const path = (staff) => (staff ? "/staff/orders" : "/orders");
export const getOrders = (staff, signal) => request(path(staff), { signal });
export const submitOrder = (staff, editing, body) => {
  if (editing && !staff) throw new Error("Đơn đã gửi không được chỉnh sửa. Bạn chỉ có thể hủy khi đơn còn chờ xác nhận.");
  return request(editing ? `${path(staff)}/${editing.id}` : path(staff), {
    method: editing ? "PUT" : "POST",
    body,
  });
};
export const cancelPendingOrder = (staff, order, reason) =>
  request(`${path(staff)}/${order.id}/cancel`, {
    method: "POST",
    body: { reason, revision: order.revision },
  });
