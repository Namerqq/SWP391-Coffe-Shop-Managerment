import axios from "axios";

/**
 * api/
 * Chứa api url và cấu hình chung của axios.
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: tự động gắn token vào mỗi request (nếu có)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: xử lý response / lỗi chung
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error?.response?.data || error)
);

export default axiosClient;
