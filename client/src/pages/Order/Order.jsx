import { useState } from "react";
import orderService from "../../services/order.service";
import Button from "../../components/Button/Button";

/**
 * pages/Order/Order.jsx
 * Trang KHÁCH HÀNG dùng để đặt đơn.
 * Khi khách bấm "Xác nhận đặt hàng":
 * 1) Gửi Request(1) -> POST /api/orders
 * 2) Server lưu đơn xong, trả Response(8) xác nhận về đây (setSuccess)
 * 3) Server ĐỒNG THỜI bắn socket "new-order" -> StaffDashboard sẽ tự cập nhật, KHÔNG cần trang này làm gì thêm
 */
const Order = () => {
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!customerName || !itemName || quantity <= 0 || price <= 0) {
      setErrorMsg("Vui lòng nhập đầy đủ thông tin hợp lệ.");
      return;
    }

    const payload = {
      customerName,
      items: [{ name: itemName, quantity: Number(quantity), price: Number(price) }],
      total: Number(quantity) * Number(price),
    };

    try {
      setSubmitting(true);
      const res = await orderService.create(payload); // (1) gửi request lên server
      setSuccessMsg(`Đặt hàng thành công! Mã đơn: ${res.data._id}`);
      setCustomerName("");
      setItemName("");
      setQuantity(1);
      setPrice(0);
    } catch (err) {
      setErrorMsg(err?.message || "Đặt hàng thất bại, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Đặt hàng</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="Tên khách hàng"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          placeholder="Tên món / sản phẩm"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
        <input
          type="number"
          min="1"
          placeholder="Số lượng"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          type="number"
          min="0"
          placeholder="Đơn giá"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Button type="submit">{submitting ? "Đang gửi..." : "Xác nhận đặt hàng"}</Button>
      </form>

      {successMsg && <p style={{ color: "green", marginTop: 12 }}>{successMsg}</p>}
      {errorMsg && <p style={{ color: "red", marginTop: 12 }}>{errorMsg}</p>}
    </div>
  );
};

export default Order;
