import axiosClient from "../api/axiosClient";

/**
 * services/
 * Nơi lấy dữ liệu khi gọi API (Client gửi Request(1) tới Server).
 */
const userService = {
  getAll: () => axiosClient.get("/users"),
  getById: (id) => axiosClient.get(`/users/${id}`),
  create: (payload) => axiosClient.post("/users", payload),
};

export default userService;
