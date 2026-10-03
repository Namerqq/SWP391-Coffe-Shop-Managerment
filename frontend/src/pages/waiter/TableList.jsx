import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";

import Empty from "../../components/EmptyState";

import PageHeading from "../../components/PageHeading";

import { tableStatuses } from "../../constants/orderStatus";

import { useCart } from "../../context/CartContext";

import { useOrders } from "../../context/OrdersContext";
import { useToast } from "../../context/ToastContext";

export default function TableList() {
  const { tables, dataLoading, dataError } = useOrders();
  const { editing, setTableId } = useCart();
  const { setError } = useToast();
  const navigate = useNavigate();
  return (
    <>
      <PageHeading page="tables" />
      <>
        <div className="stats">
          <div className="panel">
            <span>Bàn đang hoạt động</span>
            <strong>{tables.length}</strong>
            <Icon name="table" />
          </div>
          <div className="panel">
            <span>Bàn đang sử dụng</span>
            <strong>
              {tables.filter((t) => t.status === "OCCUPIED").length}
            </strong>
            <Icon name="cup" />
          </div>
          <div className="panel">
            <span>Đơn chờ xác nhận</span>
            <strong>{tables.reduce((s, t) => s + t.pendingOrders, 0)}</strong>
            <Icon name="orders" />
          </div>
        </div>
        {dataError && (
          <div className="alert error" role="alert">
            {dataError}
          </div>
        )}
        {dataLoading && !tables.length ? (
          <section className="panel">
            <Empty title="Đang tải danh sách bàn…" />
          </section>
        ) : !tables.length ? (
          <section className="panel">
            <Empty
              title="Chưa có bàn"
              description="Danh sách sẽ hiển thị khi quản lý thêm bàn vào hệ thống."
            />
          </section>
        ) : (
          <div className="table-grid">
            {tables.map((t) => (
              <article className="panel table-card" key={t.id}>
                <div className="table-card-top">
                  <span className="table-icon">
                    <Icon name="table" size={23} />
                  </span>
                  <span
                    className={`badge ${t.sessionStatus === "PAYMENT_PENDING" ? "PAYMENT_PENDING" : t.status}`}
                  >
                    {t.sessionStatus === "PAYMENT_PENDING"
                      ? "Chờ thanh toán"
                      : tableStatuses[t.status]}
                  </span>
                </div>
                <h2>{t.name}</h2>
                <p>
                  {t.activeOrders
                    ? `${t.activeOrders} đơn đang xử lý`
                    : "Chưa có đơn đang xử lý"}
                </p>
                <div className="table-card-actions">
                  <button
                    className="button primary small"
                    disabled={
                      t.status === "UNAVAILABLE" ||
                      t.sessionStatus === "PAYMENT_PENDING"
                    }
                    onClick={() => {
                      if (editing) {
                        setError(
                          "Vui lòng lưu hoặc bỏ bản chỉnh sửa đơn hiện tại trước khi tạo đơn mới.",
                        );
                        return;
                      }
                      setTableId(t.id);
                      navigate("/waiter/menu");
                    }}
                  >
                    <Icon name="plus" size={16} /> Đặt món
                  </button>
                  <button
                    className="button subtle small"
                    onClick={() => {
                      navigate(`/waiter/orders?table=${t.id}`);
                    }}
                  >
                    Xem đơn
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="page-footnote">
          Trạng thái bàn và phiên phục vụ được đồng bộ từ hệ thống.
        </p>
      </>
    </>
  );
}
