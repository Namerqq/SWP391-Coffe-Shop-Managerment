import { useState } from "react";

import Icon from "../../components/Icon";
import Thumbnail from "../../components/Thumbnail";
import Empty from "../../components/EmptyState";

import PageHeading from "../../components/PageHeading";
import TableSelector from "../../components/TableSelector";
import { money } from "../../utils/format";

import { useCart } from "../../context/CartContext";
import { useMenu } from "../../context/MenuContext";

export default function CustomerMenu() {
  const { menu, options, loading, loadError, loadMenu } = useMenu();
  const { setCustomize } = useCart();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("ALL");
  const categories = [
    ...new Map(menu.map((d) => [d.categoryId, d.category])).entries(),
  ];
  const normalized = (s) =>
    s
      .toLocaleLowerCase("vi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  const visible = menu.filter(
    (d) =>
      (category === "ALL" || String(d.categoryId) === category) &&
      normalized(d.name).includes(normalized(search)),
  );

  return (
    <>
      <PageHeading page="menu" />
      <TableSelector />
      <>
        <section className="panel menu-panel">
          <div className="toolbar">
            <label className="search">
              <Icon name="search" size={19} />
              <input
                aria-label="Tìm món"
                placeholder="Tìm món…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="icon-button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => setSearch("")}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </label>
            <select
              aria-label="Lọc danh mục"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ALL">Mọi danh mục</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <span className="result-count">{visible.length} món</span>
          </div>
          {loading ? (
            <Empty title="Đang tải thực đơn…" />
          ) : loadError ? (
            <Empty title="Chưa tải được thực đơn" description={loadError}>
              <button className="button secondary" onClick={loadMenu}>
                Thử lại
              </button>
            </Empty>
          ) : !visible.length ? (
            <Empty
              title={
                menu.length ? "Không tìm thấy món" : "Thực đơn chưa có món"
              }
              description={
                menu.length
                  ? "Thử từ khóa hoặc danh mục khác."
                  : "Quán sẽ cập nhật thực đơn tại đây."
              }
            />
          ) : (
            <div className="menu-table-wrap">
              <table className="menu-table">
                <thead>
                  <tr>
                    <th>MÓN</th>
                    <th>DANH MỤC</th>
                    <th>GIÁ</th>
                    <th>TRẠNG THÁI</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((drink) => (
                    <tr key={drink.id}>
                      <td>
                        <div className="menu-item">
                          <Thumbnail item={drink} />
                          <div>
                            <strong>{drink.name}</strong>
                            <p>{drink.description || "Thức uống tại quán"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="category-cell">{drink.category}</td>
                      <td className="price-cell">{money(drink.price)}</td>
                      <td>
                        <span
                          className={`badge ${drink.available ? "AVAILABLE" : "UNAVAILABLE"}`}
                        >
                          <i />
                          {drink.available ? "Còn bán" : "Tạm hết"}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          className="button small secondary"
                          disabled={!drink.available || !options}
                          aria-label={`Thêm ${drink.name}`}
                          onClick={() => setCustomize(drink)}
                        >
                          <Icon name="plus" size={16} /> Thêm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="page-footnote">
          Bạn có thể tùy chỉnh size, đường, đá và topping khi chọn món.
        </p>
      </>
    </>
  );
}
