require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");

const connectDB = require("./config/db");
const routes = require("./routes");
const errorHandler = require("./middlewares/error.middleware");
const socket = require("./sockets/socket");

/**
 * index.js
 * Nơi khởi tạo và cấu hình quan trọng cho toàn bộ ứng dụng.
 *
 * Luồng xử lý REST (theo sơ đồ):
 * Client --Request(1)--> Middleware --(3)--> Controller --(4)--> Service --(5)--> Database
 * Database --(6)--> Service --(7)--> Controller --Response(8)--> Client
 * (Middleware cũng có thể trả thẳng Response(2) nếu chặn request lại)
 *
 * Luồng REALTIME (Socket.IO):
 * Khách đặt hàng (REST) --> Controller lưu DB xong --> emit("new-order")
 * --> mọi client đang ở phòng "staff" nhận được ngay lập tức, không cần load lại trang.
 */

const app = express();

// Bọc app trong 1 HTTP server để vừa chạy Express vừa chạy Socket.IO trên cùng 1 cổng
const server = http.createServer(app);

// Khởi tạo Socket.IO, gắn vào server ở trên
socket.init(server);

// Cấu hình chung
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kết nối Database
connectDB();

// Gắn toàn bộ route vào app, tiền tố /api
app.use("/api", routes);

// Middleware xử lý lỗi tập trung (luôn đặt cuối cùng)
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
// Lưu ý: dùng server.listen (không phải app.listen) để Socket.IO hoạt động
server.listen(PORT, () => {
  console.log(`🚀 Server (REST + Socket.IO) đang chạy tại http://localhost:${PORT}`);
});
