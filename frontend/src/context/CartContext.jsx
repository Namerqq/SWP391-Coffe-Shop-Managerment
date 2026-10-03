import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readDraft, saveDraft } from "../utils/draftStorage";
import { unitPrice } from "../utils/orderPricing";
import ItemCustomizeModal from "../components/ItemCustomizeModal";
import { useAuth } from "./AuthContext";
import { useMenu } from "./MenuContext";
import { useOrders } from "./OrdersContext";
import { useToast } from "./ToastContext";
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);
export function CartProvider({ children }) {
  const { staff, context } = useAuth();
  const { menu, options } = useMenu();
  const { tables } = useOrders();
  const { setError, setNotice } = useToast();
  const navigate = useNavigate();
  const savedDraft = useRef(readDraft(staff)).current;
  // Discard obsolete customer edit drafts; never resubmit them as a new order.
  const draft = !staff && savedDraft.editing ? { cart: [] } : savedDraft;
  const [cart, setCart] = useState(draft.cart),
    [tableId, setTableId] = useState(draft.tableId || "");
  const [note, setNote] = useState(draft.note || ""),
    [editing, setEditing] = useState(staff ? draft.editing || null : null);
  const [customize, setCustomize] = useState(null);
  const requestKey = useRef(draft.requestKey || crypto.randomUUID());
  useEffect(() => {
    saveDraft(staff, {
      cart,
      tableId,
      note,
      editing,
      requestKey: requestKey.current,
    });
  }, [cart, tableId, note, editing, staff]);
  const currentTable = staff
    ? tables.find((t) => t.id === Number(tableId))
    : editing?.table || context?.table;
  const tableBlocked =
    currentTable &&
    (currentTable.status === "UNAVAILABLE" ||
      currentTable.sessionStatus === "PAYMENT_PENDING" ||
      !currentTable.active);
  const count = cart.reduce((s, x) => s + x.quantity, 0);
  const total = options
    ? cart.reduce((s, x) => s + unitPrice(x, options) * x.quantity, 0)
    : 0;
  const clearDraft = () => {
    setCart([]);
    setNote("");
    setEditing(null);
    setCustomize(null);
    requestKey.current = crypto.randomUUID();
  };
  const saveItem = (item) => {
    if (!item.cartId && cart.length >= 50) {
      setError("Mỗi đơn tối đa 50 dòng món.");
      setCustomize(null);
      return;
    }
    setCart((prev) =>
      item.cartId
        ? prev.map((x) => (x.cartId === item.cartId ? item : x))
        : [...prev, { ...item, cartId: crypto.randomUUID() }],
    );
    setCustomize(null);
    setNotice(item.cartId ? "Đã cập nhật món." : "Đã thêm món vào giỏ.");
  };
  const startEdit = (order) => {
    if (!staff) return;
    setTableId(order.tableId);
    setEditing({ id: order.id, revision: order.revision, table: { id: order.tableId, name: order.tableName, active: true } });
    setNote(order.note || "");
    setCart(
      order.items.map((i) => {
        const drink = menu.find((d) => d.id === i.drinkId);
        return {
          ...drink,
          id: i.drinkId,
          name: i.name,
          price: drink?.price ?? i.basePrice,
          size: i.size || "M",
          sugar: i.sugar || "100%",
          ice: i.ice || "Bình thường",
          extras: i.extras.map((e) => e.name),
          quantity: i.quantity,
          note: i.note || "",
          cartId: crypto.randomUUID(),
        };
      }),
    );
    navigate(staff ? "/waiter/cart" : "/cart");
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        tableId,
        setTableId,
        note,
        setNote,
        editing,
        requestKey,
        currentTable,
        tableBlocked,
        count,
        total,
        clearDraft,
        startEdit,
        setCustomize,
      }}
    >
      {children}
      {customize && options && (
        <ItemCustomizeModal
          drink={customize}
          options={options}
          onClose={() => setCustomize(null)}
          onSave={saveItem}
        />
      )}
    </CartContext.Provider>
  );
}
