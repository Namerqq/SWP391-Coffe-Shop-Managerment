import CartItem from "../../components/cart/CartItem";
import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";

import Empty from "../../components/EmptyState";

import PageHeading from "../../components/PageHeading";
import TableSelector from "../../components/TableSelector";
import { money } from "../../utils/format";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useMenu } from "../../context/MenuContext";
import { useOrders } from "../../context/OrdersContext";
import { useToast } from "../../context/ToastContext";

import { submitOrder } from "../../api/orderApi";
import { getTables } from "../../api/tableApi";
export default function OrderConfirmation() {
  const { staff, base } = useAuth();
  const {
    cart,
    setCart,
    note,
    setNote,
    editing,
    requestKey,
    currentTable,
    tableBlocked,
    count,
    total,
    clearDraft,
    setCustomize,
  } = useCart();
  const { options, loadError, loadMenu } = useMenu();
  const { setOrders, setTables, refresh } = useOrders();
  const { setError, setNotice } = useToast();
  const navigate = useNavigate(),
    lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const draftReset = () => {
    clearDraft();
    navigate(`${base}/orders`);
  };
  const submit = async () => {
    if (lock.current || !cart.length || !options) return;
    if (!currentTable) {
      setError(
        staff
          ? "Vui lòng chọn bàn."
          : "Vui lòng quét QR hoặc nhập mã bàn trước khi đặt món.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const order = await submitOrder(staff, editing, {
        tableId: currentTable.id,
        note,
        requestKey: requestKey.current,
        revision: editing?.revision,
        items: cart.map((i) => ({
          drinkId: i.id,
          size: i.size,
          sugar: i.sugar,
          ice: i.ice,
          extras: i.extras,
          quantity: i.quantity,
          note: i.note,
        })),
      });
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      clearDraft();
      navigate(`${base}/orders`);
      setNotice(
        editing
          ? "Đã lưu thay đổi đơn."
          : "Đã gửi đơn đến quầy, đang chờ xác nhận.",
      );
      if (staff)
        getTables()
          .then(setTables)
          .catch(() => {});
    } catch (e) {
      setError(e.message);
      if (e.status === 409) refresh();
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  return (
    <>
      <PageHeading page="cart" />
      <TableSelector />
      <>
        {!cart.length ? (
          <section className="panel">
            <Empty
              title="Giỏ hàng đang trống"
              description="Chọn món từ thực đơn để bắt đầu đặt hàng."
            >
              <Link className="button primary" to={`${base}/menu`}>
                Xem thực đơn <Icon name="arrow" size={17} />
              </Link>
            </Empty>
          </section>
        ) : (
          <div className="checkout-grid">
            <section className="panel">
              <div className="panel-title">
                <h2>Món đã chọn</h2>
                <span>{count} món</span>
              </div>
              <div className="cart-items">
                {cart.map((item) => (
                  <CartItem
                    key={item.cartId}
                    item={item}
                    options={options}
                    onCustomize={setCustomize}
                    onQuantityChange={(id, quantity) =>
                      setCart((prev) =>
                        prev.map((x) =>
                          x.cartId === id ? { ...x, quantity } : x,
                        ),
                      )
                    }
                    onRemove={(id) =>
                      setCart((prev) => prev.filter((x) => x.cartId !== id))
                    }
                  />
                ))}
              </div>
              <label className="field order-note">
                Ghi chú cho quán
                <textarea
                  maxLength={500}
                  placeholder="Ví dụ: phục vụ các món cùng lúc…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </section>
            <aside className="panel summary">
              <h2>Chi tiết thanh toán</h2>
              <div>
                <span>Tạm tính ({count} món)</span>
                <strong>{money(total)}</strong>
              </div>
              <div>
                <span>Phí phục vụ</span>
                <span>0đ</span>
              </div>
              <div className="summary-total">
                <strong>Tổng cộng</strong>
                <strong>{money(total)}</strong>
              </div>
              <p>
                Thanh toán tại quầy. Giá cuối cùng được xác nhận khi gửi đơn.
              </p>
              {loadError && (
                <div className="alert error">
                  {loadError}
                  <button className="text-button" onClick={loadMenu}>
                    Thử lại
                  </button>
                </div>
              )}
              <button
                className="button primary"
                disabled={busy || !options || !currentTable || tableBlocked}
                onClick={submit}
              >
                {busy
                  ? "Đang gửi…"
                  : editing
                    ? "Lưu thay đổi đơn"
                    : "Xác nhận đặt món"}
                <Icon name="arrow" size={17} />
              </button>
              {!currentTable && <small>Chọn bàn trước khi xác nhận đơn.</small>}
              {editing && (
                <button className="text-button" onClick={draftReset}>
                  Bỏ chỉnh sửa
                </button>
              )}
              <div className="summary-info">
                <Icon name="clock" size={17} />
                <span>Bạn có thể hủy khi đơn còn chờ xác nhận.</span>
              </div>
            </aside>
          </div>
        )}
      </>
    </>
  );
}
