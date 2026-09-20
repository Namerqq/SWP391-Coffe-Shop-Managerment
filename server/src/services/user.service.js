const mongoose = require("mongoose");

/**
 * service/
 * Nơi gọi dữ liệu từ trong Database.
 * Controller (4) --> Service --(5)--> Database --(6)--> Service --(7)--> Controller
 */

// Ví dụ schema đơn giản, dự án thật nên tách riêng ra thư mục models/
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

const getAllUsers = async () => {
  // (5) gọi xuống Database
  const users = await UserModel.find();
  // (6) nhận dữ liệu trả về từ Database
  return users;
};

const getUserById = async (id) => {
  const user = await UserModel.findById(id);
  return user;
};

const createUser = async (payload) => {
  const user = await UserModel.create(payload);
  return user;
};

module.exports = { getAllUsers, getUserById, createUser };
