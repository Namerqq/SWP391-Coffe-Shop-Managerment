const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

/**
 * routes/
 * Chứa các định tuyến của API.
 * Request(1) từ Client sẽ đi qua Middleware trước khi tới Controller.
 */

router.get("/", authMiddleware, userController.getUsers);
router.get("/:id", authMiddleware, userController.getUserById);
router.post("/", authMiddleware, userController.createUser);

module.exports = router;
