const mongoose = require("mongoose");
const { ORDER_STATUS } = require("../enum/order.enum");

/**
 * service/
 * Nơi gọi dữ liệu từ trong Database cho module Order.
 */
const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
  },
  { timestamps: true }
);

const OrderModel = mongoose.models.Order || mongoose.model("Order", orderSchema);

const createOrder = async (payload) => {
  const order = await OrderModel.create(payload);
  return order;
};

const getAllOrders = async () => {
  const orders = await OrderModel.find().sort({ createdAt: -1 });
  return orders;
};

const updateOrderStatus = async (id, status) => {
  const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true });
  return order;
};

module.exports = { createOrder, getAllOrders, updateOrderStatus };
