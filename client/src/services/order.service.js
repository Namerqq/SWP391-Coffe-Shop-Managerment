import axiosClient from "../api/axiosClient";

/**
 * services/
 * Gọi API cho module Order.
 */
const orderService = {
  create: (payload) => axiosClient.post("/orders", payload),
  getAll: () => axiosClient.get("/orders"),
  updateStatus: (id, status) => axiosClient.patch(`/orders/${id}/status`, { status }),
};

export default orderService;
