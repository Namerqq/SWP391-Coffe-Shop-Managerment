const { error } = require("../utils/response.util");
const MESSAGES = require("../resources/messages");

/**
 * middlewares/
 * Middleware bắt lỗi tập trung, đặt cuối cùng trong chuỗi middleware của app.
 */
const errorHandler = (err, req, res, next) => {
  console.error("🔥 Lỗi:", err.stack);
  return error(res, err.message || MESSAGES.SERVER_ERROR, err.statusCode || 500);
};

module.exports = errorHandler;
