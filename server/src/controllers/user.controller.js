const userService = require("../services/user.service");
const { success, error } = require("../utils/response.util");
const MESSAGES = require("../resources/messages");

/**
 * controllers/
 * Nơi đón nhận tất cả các request gửi từ client lên server
 * và trả về response từ server về cho client.
 * Middleware --(3)--> Controller --(4)--> Service ... Service --(7)--> Controller --(8)--> Client
 */

const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers(); // (4) gọi Service
    return success(res, users, MESSAGES.SUCCESS); // (8) trả Response về Client
  } catch (err) {
    return error(res, err.message);
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return error(res, MESSAGES.USER_NOT_FOUND, 404);
    return success(res, user, MESSAGES.SUCCESS);
  } catch (err) {
    return error(res, err.message);
  }
};

const createUser = async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body);
    return success(res, newUser, MESSAGES.SUCCESS, 201);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getUsers, getUserById, createUser };
