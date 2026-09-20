const { Server } = require("socket.io");

/**
 * sockets/
 * Khởi tạo Socket.IO gắn vào HTTP server, dùng chung cho toàn bộ ứng dụng
 * để bắn (emit) sự kiện realtime từ Controller/Service xuống Client.
 */
let io;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*", // domain của client thật khi deploy
      methods: ["GET", "POST", "PATCH"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client kết nối:", socket.id);

    // Client phía nhân viên sẽ gọi socket.emit("join-staff-room") sau khi connect
    socket.on("join-staff-room", () => {
      socket.join("staff");
      console.log(`👩‍💼 Socket ${socket.id} đã vào phòng "staff"`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client ngắt kết nối:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo. Gọi init(server) trước!");
  return io;
};

module.exports = { init, getIO };
