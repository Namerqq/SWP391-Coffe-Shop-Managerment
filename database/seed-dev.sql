USE cafe_management;

INSERT INTO categories (category_name, description) VALUES
    ('Cà phê', 'Các món cà phê'),
    ('Trà', 'Các món trà và trái cây'),
    ('Đá xay', 'Các món đá xay'),
    ('Bánh', 'Bánh và đồ ăn nhẹ');

INSERT INTO cafe_tables (table_number, qr_code) VALUES
    ('Bàn 01', 'TABLE-01'), ('Bàn 02', 'TABLE-02'),
    ('Bàn 03', 'TABLE-03'), ('Bàn 04', 'TABLE-04'),
    ('Bàn 05', 'TABLE-05'), ('Bàn 06', 'TABLE-06');

INSERT INTO menu_items
    (category_id, item_name, description, base_price, recipe_ingredients, recipe_instructions)
VALUES
    (1, 'Cà phê sữa đá', 'Cà phê rang đậm và sữa đặc.', 35000,
     'Espresso 30 ml; sữa đặc 25 ml; đá 150 g',
     'Chiết xuất espresso, khuấy với sữa đặc và thêm đá.'),
    (1, 'Bạc xỉu', 'Sữa béo nhẹ cùng espresso.', 45000,
     'Espresso 20 ml; sữa đặc 20 ml; sữa tươi 100 ml; đá 150 g',
     'Khuấy sữa đặc với sữa tươi, thêm đá rồi rót espresso.'),
    (2, 'Trà đào cam sả', 'Trà thanh mát với đào, cam và sả.', 45000,
     'Trà 150 ml; syrup đào 20 ml; đào 2 miếng; cam 1 lát; sả 1 nhánh',
     'Ủ trà, khuấy với syrup, thêm đá và trang trí.'),
    (3, 'Matcha đá xay', 'Matcha, sữa và đá xay.', 55000,
     'Matcha 5 g; sữa tươi 120 ml; đường 15 ml; đá 180 g',
     'Hòa matcha, cho toàn bộ nguyên liệu vào máy và xay mịn.');

INSERT INTO inventory_items
    (item_name, unit, current_quantity, minimum_stock_level, unit_cost)
VALUES
    ('Hạt cà phê', 'kg', 5.000, 2.000, 320000),
    ('Sữa tươi', 'lít', 20.000, 5.000, 35000),
    ('Sữa đặc', 'lon', 24.000, 6.000, 28000),
    ('Bột matcha', 'kg', 2.000, 0.500, 450000),
    ('Trân châu', 'túi', 12.000, 3.000, 45000);

-- Staff accounts are intentionally not inserted here because password_hash must be BCrypt.
