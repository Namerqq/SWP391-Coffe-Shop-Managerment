import OrderCard from "../../components/orders/OrderCard";
import CancelOrderModal from "../../components/orders/CancelOrderModal";
import { useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Empty from "../../components/EmptyState";

import PageHeading from "../../components/PageHeading";

import { statuses } from "../../constants/orderStatus";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrdersContext";
import { useToast } from "../../context/ToastContext";

import { cancelPendingOrder } from "../../api/orderApi";
export default function OrderTracking() {
  const { staff, base } = useAuth();
  const { orders, setOrders, tables, dataLoading, dataError, refresh } =
    useOrders();
  const { setNotice } = useToast();
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const orderTable = params.get("table") || "ALL";
  const orderStatus = params.get("status") || "ALL";
  const setFilter = (key, value) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        value === "ALL" ? next.delete(key) : next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const setOrderTable = (value) => setFilter("table", value);
  const setOrderStatus = (value) => setFilter("status", value);
  const [cancel, setCancel] = useState(null),
    [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const visibleOrders = orders.filter(
    (o) =>
      (orderTable === "ALL" || String(o.tableId) === orderTable) &&
      (orderStatus === "ALL" || o.status === orderStatus),
  );
  const cancelOrder = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const o = await cancelPendingOrder(staff, cancel, cancelReason.trim());
      setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)));
      setCancel(null);
      setNotice("Đã hủy đơn hàng.");
    } catch (e) {
      setError(e.message);
      refresh();
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  return (
    <>
      <PageHeading page="orders" />
      <>
        <section className="panel orders-toolbar">
          <span className="live-label">
            <i /> Tự cập nhật mỗi 10 giây
          </span>
          <div>
            {staff && (
              <select
                aria-label="Lọc đơn theo bàn"
                value={orderTable}
                onChange={(e) => setOrderTable(e.target.value)}
              >
                <option value="ALL">Tất cả các bàn</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Lọc trạng thái đơn"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              <option value="ALL">Mọi trạng thái</option>
              {Object.entries(statuses).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </section>
        {dataError && (
          <div className="alert error" role="alert">
            {dataError}
          </div>
        )}
        {dataLoading && !orders.length ? (
          <section className="panel">
            <Empty title="Đang tải đơn hàng…" />
          </section>
        ) : !visibleOrders.length ? (
          <section className="panel">
            <Empty
              title="Chưa có đơn hàng"
              description={
                orders.length
                  ? "Không có đơn phù hợp bộ lọc."
                  : "Đơn vừa đặt sẽ xuất hiện tại đây."
              }
            >
              <Link className="button primary" to={`${base}/menu`}>
                Xem thực đơn
              </Link>
            </Empty>
          </section>
        ) : (
          <div className="orders-list">
            {visibleOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onCancel={(order) => {
                  setCancel(order);
                  setCancelReason("");
                  setError("");
                }}
              />
            ))}
          </div>
        )}
        {staff && orders.length >= 200 && (
          <p className="page-footnote">
            Đang hiển thị 200 đơn tại bàn gần nhất.
          </p>
        )}
      </>
      {cancel && (
        <CancelOrderModal
          cancel={cancel}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          error={error}
          busy={busy}
          onClose={() => setCancel(null)}
          onSubmit={cancelOrder}
        />
      )}
    </>
  );
}
