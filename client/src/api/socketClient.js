import { io } from "socket.io-client";

/**
 * api/
 * Cấu hình kết nối Socket.IO tới server (dùng chung cho cả trang khách và nhân viên).
 * autoConnect: false -> mỗi trang tự connect() khi cần, tránh mở kết nối thừa.
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export default socket;
