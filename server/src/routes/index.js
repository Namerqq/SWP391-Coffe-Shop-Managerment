const express = require("express");
const router = express.Router();

const userRoutes = require("./user.routes");
const orderRoutes = require("./order.routes");

/**
 * routes/index.js
 * Nơi tập hợp tất cả các route con của ứng dụng.
 */
router.use("/users", userRoutes);
router.use("/orders", orderRoutes);

module.exports = router;
