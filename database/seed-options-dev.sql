-- KhoiBM: dữ liệu mẫu lựa chọn Size / Topping (chạy sau V1..V4 và seed-dev.sql, chạy lại được).
-- Quy ước của nhóm: 2 danh mục tên đúng 'Size' và 'Topping'. Mỗi "món" trong 2 danh mục này là 1 lựa chọn,
-- base_price = số tiền cộng thêm. Quản lý thêm / sửa / ẩn lựa chọn như món bình thường.
INSERT INTO categories (category_name, description, status)
SELECT 'Size', 'Lựa chọn size. Giá = tiền cộng thêm.', 'ACTIVE' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Size');

INSERT INTO categories (category_name, description, status)
SELECT 'Topping', 'Topping thêm. Giá = tiền cộng thêm.', 'ACTIVE' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Topping');

INSERT INTO menu_items (category_id, item_name, base_price, availability_status)
SELECT c.category_id, v.item_name, v.price, 'AVAILABLE'
FROM categories c
JOIN (
    SELECT 'Size' AS cat, 'M' AS item_name, 0 AS price
    UNION ALL SELECT 'Size', 'L', 10000
    UNION ALL SELECT 'Topping', 'Thêm espresso', 10000
    UNION ALL SELECT 'Topping', 'Kem sữa', 10000
) v ON v.cat = c.category_name
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items m WHERE m.category_id = c.category_id AND m.item_name = v.item_name
);
