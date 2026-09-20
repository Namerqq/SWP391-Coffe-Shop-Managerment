const { error } = require("../utils/response.util");
const MESSAGES = require("../resources/messages");

/**
 * middlewares/
 * Ví dụ middleware xác thực (Request(1) -> Middleware).
 * Nếu hợp lệ thì next() để đi tiếp xuống Controller (3).
 * Nếu không hợp lệ thì trả Response(2) thẳng về Client, không đi tiếp.
 */
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    // Response(2): chặn lại và trả lỗi ngay tại middleware
    return error(res, MESSAGES.UNAUTHORIZED, 401);
  }

  // TODO: verify token thật (jwt.verify,...)
  req.user = { id: "demo-user-id" };

  next(); // đi tiếp xuống Controller (3)
};

module.exports = authMiddleware;
