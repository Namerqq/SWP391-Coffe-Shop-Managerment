const mongoose = require("mongoose");

/**
 * config/
 * Chứa chuỗi kết nối đến database.
 */
const connectDB = async () => {
  try {
    const uri = process.env.DB_URI || "mongodb://localhost:27017/my_database";
    await mongoose.connect(uri);
    console.log("✅ Kết nối Database thành công!");
  } catch (error) {
    console.error("❌ Kết nối Database thất bại:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
