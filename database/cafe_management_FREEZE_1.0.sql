-- CAFE MANAGEMENT DATABASE FREEZE 1.0
-- Snapshot: V1 through V7__qr_payment_payos.sql, 2026-10-15.
-- 19 application tables. Requires MySQL 8.0.16+ (CHECK enforcement).
-- Install ONCE into an EMPTY cafe_management database.
-- Existing installations must continue using migrations; do not apply this snapshot.
-- Contains final DDL, reference roles and default settings; no development seed data.
-- No DROP/TRUNCATE, no disabled foreign keys, no application-data backfill.
-- All identifiers follow the V1 BIGINT UNSIGNED baseline.
-- Menu V7 from the Downloads checkout is NOT included.
-- Future changes belong in a new migration; retain this snapshot unchanged.

CREATE DATABASE IF NOT EXISTS cafe_management
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE cafe_management;
SET NAMES utf8mb4;

CREATE TABLE roles (
    role_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL,
    description VARCHAR(255) NULL,
    CONSTRAINT uq_roles_name UNIQUE (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE customers (
    customer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    full_name VARCHAR(100) NULL,
    current_points INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_customers_phone UNIQUE (phone_number),
    CONSTRAINT chk_customers_points CHECK (current_points >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categories (
    category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(80) NOT NULL,
    description VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_categories_name UNIQUE (category_name),
    CONSTRAINT chk_categories_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE menu_items (
    menu_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    item_name VARCHAR(120) NOT NULL,
    description VARCHAR(1000) NULL,
    base_price BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NULL,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    recipe_ingredients TEXT NULL,
    recipe_instructions TEXT NULL,
    CONSTRAINT uq_menu_items_category_name UNIQUE (category_id, item_name),
    CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT chk_menu_items_availability CHECK (
        availability_status IN ('AVAILABLE', 'UNAVAILABLE', 'INACTIVE')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cafe_tables (
    table_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_number VARCHAR(30) NOT NULL,
    qr_code VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_cafe_tables_number UNIQUE (table_number),
    CONSTRAINT uq_cafe_tables_qr UNIQUE (qr_code),
    CONSTRAINT chk_cafe_tables_status CHECK (
        status IN ('AVAILABLE', 'OCCUPIED', 'UNAVAILABLE')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE table_sessions (
    table_session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    session_code VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active_table_id BIGINT UNSIGNED
        GENERATED ALWAYS AS (CASE WHEN status IN ('OPEN', 'PAYMENT_PENDING') THEN table_id ELSE NULL END) STORED,
    CONSTRAINT uq_table_sessions_code UNIQUE (session_code),
    CONSTRAINT uq_table_sessions_active_table UNIQUE (active_table_id),
    CONSTRAINT fk_table_sessions_table FOREIGN KEY (table_id) REFERENCES cafe_tables(table_id),
    CONSTRAINT fk_table_sessions_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE SET NULL,
    CONSTRAINT chk_table_sessions_status CHECK (
        status IN ('OPEN', 'PAYMENT_PENDING', 'CLOSED', 'CANCELLED')
    ),
    CONSTRAINT chk_table_sessions_closed CHECK (
        (status IN ('OPEN', 'PAYMENT_PENDING') AND closed_at IS NULL)
        OR (status IN ('CLOSED', 'CANCELLED') AND closed_at IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE orders (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_by_user_id BIGINT UNSIGNED NULL,
    table_session_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    order_number VARCHAR(40) NOT NULL,
    order_source VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fulfillment_type VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) NULL,
    customer_phone VARCHAR(20) NULL,
    pickup_time DATETIME NULL,
    customer_note VARCHAR(500) NULL,
    accepted_by_user_id BIGINT UNSIGNED NULL,
    accepted_at DATETIME NULL,
    cancel_reason VARCHAR(500) NULL,
    cancelled_at DATETIME NULL,
    completed_at DATETIME NULL,
    total_amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT uq_orders_number UNIQUE (order_number),
    CONSTRAINT fk_orders_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_orders_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_orders_acceptor FOREIGN KEY (accepted_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL,
    CONSTRAINT chk_orders_source CHECK (order_source IN ('QR_TABLE', 'STAFF', 'ONLINE')),
    CONSTRAINT chk_orders_fulfillment CHECK (fulfillment_type IN ('DINE_IN', 'PICKUP', 'DELIVERY')),
    CONSTRAINT chk_orders_status CHECK (
        status IN (
            'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY',
            'COMPLETED', 'CANCELLED', 'REJECTED'
        )
    ),
    CONSTRAINT chk_orders_session_by_fulfillment CHECK (
        (fulfillment_type = 'DINE_IN' AND table_session_id IS NOT NULL)
        OR (fulfillment_type IN ('PICKUP', 'DELIVERY') AND table_session_id IS NULL)
    ),
    CONSTRAINT chk_orders_online_customer CHECK (
        order_source <> 'ONLINE'
        OR (customer_name IS NOT NULL AND customer_phone IS NOT NULL)
    )
,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    paid_at DATETIME NULL,
    payment_id BIGINT UNSIGNED NULL,
    CONSTRAINT chk_orders_payment_status CHECK (payment_status IN ('UNPAID', 'PAID')),
    CONSTRAINT chk_orders_paid CHECK ((payment_status = 'UNPAID' AND paid_at IS NULL AND payment_id IS NULL) OR (payment_status = 'PAID' AND paid_at IS NOT NULL AND payment_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE order_items (
    order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    menu_item_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price BIGINT UNSIGNED NOT NULL,
    sugar_level VARCHAR(30) NULL,
    ice_level VARCHAR(30) NULL,
    size_name VARCHAR(50) NULL,
    size_price BIGINT UNSIGNED NOT NULL DEFAULT 0,
    topping_details JSON NULL,
    topping_price BIGINT UNSIGNED NOT NULL DEFAULT 0,
    note VARCHAR(300) NULL,
    item_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    subtotal BIGINT UNSIGNED NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id),
    CONSTRAINT chk_order_items_quantity CHECK (quantity BETWEEN 1 AND 50),
    CONSTRAINT chk_order_items_status CHECK (
        item_status IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED')
    ),
    CONSTRAINT chk_order_items_subtotal CHECK (
        subtotal = quantity * (unit_price + size_price + topping_price)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE deliveries (
    delivery_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    assigned_waiter_id BIGINT UNSIGNED NULL,
    delivery_address VARCHAR(500) NOT NULL,
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    assigned_at DATETIME NULL,
    picked_up_at DATETIME NULL,
    delivered_at DATETIME NULL,
    failed_at DATETIME NULL,
    failure_reason VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_deliveries_order UNIQUE (order_id),
    CONSTRAINT fk_deliveries_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_deliveries_waiter FOREIGN KEY (assigned_waiter_id) REFERENCES users(user_id)
        ON DELETE SET NULL,
    CONSTRAINT chk_deliveries_status CHECK (
        delivery_status IN (
            'PENDING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP',
            'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'
        )
    ),
    CONSTRAINT chk_deliveries_failure CHECK (
        delivery_status <> 'FAILED'
        OR (failed_at IS NOT NULL AND failure_reason IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    confirmed_by_user_id BIGINT UNSIGNED NULL,
    table_session_id BIGINT UNSIGNED NULL,
    order_id BIGINT UNSIGNED NULL,
    payment_code VARCHAR(40) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    total_amount BIGINT UNSIGNED NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payments_code UNIQUE (payment_code),
    CONSTRAINT fk_payments_confirmer FOREIGN KEY (confirmed_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_payments_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT chk_payments_target CHECK (
        (table_session_id IS NOT NULL AND order_id IS NULL)
        OR (table_session_id IS NULL AND order_id IS NOT NULL)
    ),
    CONSTRAINT chk_payments_method CHECK (payment_method IN ('CASH', 'BANK_TRANSFER')),
    CONSTRAINT chk_payments_status CHECK (
        payment_status IN ('PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'CANCELLED')
    ),
    CONSTRAINT chk_payments_paid_at CHECK (
        payment_status NOT IN ('PAID', 'REFUND_PENDING', 'REFUNDED') OR paid_at IS NOT NULL
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE loyalty_transactions (
    loyalty_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_session_id BIGINT UNSIGNED NULL,
    payment_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    points_change INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transaction_type VARCHAR(20) NOT NULL,
    note VARCHAR(500) NULL,
    CONSTRAINT fk_loyalty_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id),
    CONSTRAINT fk_loyalty_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    CONSTRAINT fk_loyalty_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT chk_loyalty_change CHECK (points_change <> 0),
    CONSTRAINT chk_loyalty_type CHECK (
        transaction_type IN ('EARN', 'REDEEM', 'ADJUSTMENT', 'REFUND')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_items (
    inventory_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(120) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    current_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    minimum_stock_level DECIMAL(14,3) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    unit_cost BIGINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT uq_inventory_items_name UNIQUE (item_name),
    CONSTRAINT chk_inventory_quantity CHECK (current_quantity >= 0),
    CONSTRAINT chk_inventory_minimum CHECK (minimum_stock_level >= 0),
    CONSTRAINT chk_inventory_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE stock_receipts (
    stock_receipt_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    receipt_code VARCHAR(40) NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    receipt_date DATE NOT NULL,
    total_amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
    note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL,
    CONSTRAINT uq_stock_receipts_code UNIQUE (receipt_code),
    CONSTRAINT fk_stock_receipts_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
    CONSTRAINT chk_stock_receipts_status CHECK (status IN ('DRAFT', 'RECEIVED', 'CANCELLED')),
    CONSTRAINT chk_stock_receipts_confirmed CHECK (
        status <> 'RECEIVED' OR confirmed_at IS NOT NULL
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE stock_receipt_items (
    stock_receipt_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stock_receipt_id BIGINT UNSIGNED NOT NULL,
    inventory_item_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(14,3) NOT NULL,
    unit_cost BIGINT UNSIGNED NOT NULL,
    subtotal BIGINT UNSIGNED NOT NULL,
    CONSTRAINT uq_stock_receipt_items UNIQUE (stock_receipt_id, inventory_item_id),
    CONSTRAINT fk_stock_receipt_items_receipt FOREIGN KEY (stock_receipt_id)
        REFERENCES stock_receipts(stock_receipt_id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_receipt_items_inventory FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(inventory_item_id),
    CONSTRAINT chk_stock_receipt_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_stock_receipt_items_subtotal CHECK (subtotal = ROUND(quantity * unit_cost))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE stock_transactions (
    stock_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inventory_item_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(14,3) NOT NULL,
    reason VARCHAR(255) NULL,
    note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_transactions_inventory FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(inventory_item_id),
    CONSTRAINT fk_stock_transactions_creator FOREIGN KEY (created_by_user_id)
        REFERENCES users(user_id),
    CONSTRAINT chk_stock_transactions_type CHECK (
        transaction_type IN ('INITIAL', 'STOCK_IN', 'STOCK_OUT', 'WASTE', 'ADJUSTMENT')
    ),
    CONSTRAINT chk_stock_transactions_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE system_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value VARCHAR(500) NOT NULL,
    data_type VARCHAR(20) NOT NULL DEFAULT 'STRING',
    group_name VARCHAR(30) NOT NULL,
    label VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_by VARCHAR(50) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_system_settings_type CHECK (
        data_type IN ('STRING', 'NUMBER', 'TIME', 'BOOLEAN', 'EMAIL', 'TEXT', 'IMAGE', 'URL')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE qr_payment_requests (
 qr_request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_code BIGINT UNSIGNED NOT NULL,
 payment_link_id VARCHAR(64) NULL,
 target_type VARCHAR(20) NOT NULL,
 table_session_id BIGINT UNSIGNED NULL,
 cart_json TEXT NULL,
 customer_id BIGINT UNSIGNED NULL,
 points_to_redeem INT NOT NULL DEFAULT 0,
 subtotal BIGINT UNSIGNED NOT NULL,
 amount BIGINT UNSIGNED NOT NULL,
 description VARCHAR(25) NOT NULL,
 qr_code VARCHAR(1000) NULL,
 checkout_url VARCHAR(500) NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 expires_at DATETIME NOT NULL,
 created_by_user_id BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 status_changed_at DATETIME(3) NULL,
 paid_at DATETIME NULL,
 payment_id BIGINT UNSIGNED NULL,
 bank_reference VARCHAR(100) NULL,
 confirmed_via VARCHAR(20) NULL,
 note VARCHAR(500) NULL,
 INDEX idx_qr_requests_status (status,
 expires_at),
 INDEX idx_qr_requests_changed (status_changed_at),
 CONSTRAINT uq_qr_requests_order_code UNIQUE (order_code),
 CONSTRAINT fk_qr_requests_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id),
 CONSTRAINT fk_qr_requests_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
 CONSTRAINT fk_qr_requests_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
 CONSTRAINT fk_qr_requests_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
 CONSTRAINT chk_qr_requests_target CHECK (   (target_type = 'TABLE' AND table_session_id IS NOT NULL AND cart_json IS NULL)   OR (target_type = 'TAKEAWAY' AND table_session_id IS NULL AND cart_json IS NOT NULL)),
 CONSTRAINT chk_qr_requests_status CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'MISMATCH')),
 CONSTRAINT chk_qr_requests_paid CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND payment_id IS NOT NULL)),
 CONSTRAINT chk_qr_requests_amount CHECK (amount > 0 AND amount <= subtotal),
 CONSTRAINT chk_qr_requests_points CHECK (points_to_redeem >= 0)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE qr_payment_request_orders (
 qr_request_id BIGINT UNSIGNED NOT NULL,
 order_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (qr_request_id,
 order_id),
 INDEX idx_qr_orders_order (order_id),
 CONSTRAINT fk_qr_orders_request FOREIGN KEY (qr_request_id) REFERENCES qr_payment_requests(qr_request_id) ON DELETE CASCADE,
 CONSTRAINT fk_qr_orders_order FOREIGN KEY (order_id) REFERENCES orders(order_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Complete circular reference after both tables exist.
ALTER TABLE orders ADD CONSTRAINT fk_orders_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id);

-- Explicit secondary indexes from V1 and V6.
CREATE INDEX idx_users_role_status ON users(role_id, status);
CREATE INDEX idx_menu_items_category_status ON menu_items(category_id, availability_status);
CREATE INDEX idx_table_sessions_table_status ON table_sessions(table_id, status);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE INDEX idx_orders_fulfillment_status ON orders(fulfillment_type, status);
CREATE INDEX idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX idx_order_items_order_status ON order_items(order_id, item_status);
CREATE INDEX idx_deliveries_waiter_status ON deliveries(assigned_waiter_id, delivery_status);
CREATE INDEX idx_payments_status_created ON payments(payment_status, created_at);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_loyalty_customer_created ON loyalty_transactions(customer_id, created_at);
CREATE INDEX idx_inventory_low_stock ON inventory_items(status, current_quantity, minimum_stock_level);
CREATE INDEX idx_stock_receipts_status_date ON stock_receipts(status, receipt_date);
CREATE INDEX idx_stock_transactions_item_created ON stock_transactions(inventory_item_id, created_at);
CREATE INDEX idx_orders_session_payment ON orders(table_session_id, payment_status);

-- Reference roles (V2).
INSERT INTO roles (role_id, role_name, description) VALUES
    (1, 'ADMIN', 'System administration and account management.'),
    (2, 'MANAGER', 'Menu, inventory, reporting and operational management.'),
    (3, 'CASHIER', 'Order acceptance, checkout and payment confirmation.'),
    (4, 'WAITER', 'Table service and delivery fulfillment.'),
    (5, 'BARISTA', 'Drink preparation, recipes and stock-out recording.');

-- Default settings, final state after V3/V4/V5/V7.
INSERT INTO system_settings
    (setting_key, setting_value, data_type, group_name, label, description, sort_order)
VALUES
    ('shop.name', 'Cafe Shop', 'STRING', 'GENERAL', 'Tên quán', 'Hiển thị trên menu, hóa đơn và trang đăng nhập.', 1),
    ('shop.address', '', 'STRING', 'GENERAL', 'Địa chỉ', 'In trên hóa đơn.', 2),
    ('shop.phone', '', 'STRING', 'GENERAL', 'Số điện thoại', NULL, 3),
    ('shop.email', '', 'EMAIL', 'GENERAL', 'Email liên hệ', NULL, 4),
    ('shop.open_time', '07:00', 'TIME', 'GENERAL', 'Giờ mở cửa', 'Ngoài giờ này khách không đặt món qua QR được.', 5),
    ('shop.close_time', '22:00', 'TIME', 'GENERAL', 'Giờ đóng cửa', NULL, 6),

    ('loyalty.vnd_per_point', '10000', 'NUMBER', 'SALES', 'Số tiền đổi 1 điểm (VND)', 'Ví dụ 10000: mỗi 10.000đ thanh toán được 1 điểm.', 2),
    ('payment.qr_timeout_minutes', '15', 'NUMBER', 'SALES', 'Hết hạn QR thanh toán (phút)', 'Quá thời gian này đơn online chưa thanh toán sẽ bị hủy.', 3),

    ('security.max_login_attempts', '5', 'NUMBER', 'SECURITY', 'Số lần đăng nhập sai tối đa', 'Vượt quá sẽ khóa tài khoản (LOCKED). 0 = không giới hạn.', 1),
    ('security.session_timeout_minutes', '120', 'NUMBER', 'SECURITY', 'Thời gian hết phiên (phút)', 'Không thao tác quá thời gian này phải đăng nhập lại.', 2),
    ('security.password_min_length', '6', 'NUMBER', 'SECURITY', 'Độ dài mật khẩu tối thiểu', NULL, 3),
    ('system.maintenance_mode', 'false', 'BOOLEAN', 'SECURITY', 'Chế độ bảo trì', 'Khi bật, chỉ Admin được đăng nhập.', 4);

INSERT INTO system_settings (setting_key, setting_value, data_type, group_name, label, description, sort_order) VALUES
    ('system.public_base_url', '', 'URL', 'GENERAL', 'Địa chỉ web công khai', 'Link khách dùng để mở menu, in trong mã QR trên bàn. Để trống = dùng địa chỉ đang mở trang.', 7),
    ('inventory.default_min_stock', '0', 'NUMBER', 'GENERAL', 'Tồn kho tối thiểu gợi ý', 'Giá trị điền sẵn khi thêm nguyên liệu mới.', 8),
    ('loyalty.point_value_vnd', '1000', 'NUMBER', 'SALES', 'Giá trị 1 điểm khi dùng (VND)', 'Ví dụ 1000: dùng 10 điểm được giảm 10.000đ.', 4),
    ('payment.bank_bin', '', 'STRING', 'SALES', 'Mã ngân hàng (BIN) nhận chuyển khoản', 'Ví dụ 970436 (Vietcombank). Dùng để tạo mã VietQR khi thu ngân chọn Chuyển khoản.', 5),
    ('payment.bank_account_number', '', 'STRING', 'SALES', 'Số tài khoản nhận tiền', NULL, 6),
    ('payment.bank_account_holder', '', 'STRING', 'SALES', 'Tên chủ tài khoản', 'Viết hoa không dấu, ví dụ NGUYEN VAN A.', 7);

-- 3) Nội dung trang chủ khách hàng (Admin sửa ở Cài đặt hệ thống > Trang chủ).
INSERT INTO system_settings (setting_key, setting_value, data_type, group_name, label, description, sort_order) VALUES
    ('home.brand.name', 'Gạch Coffee', 'STRING', 'HOME', 'Tên thương hiệu', 'Hiện ở logo chữ, tiêu đề và chân trang.', 1),
    ('home.brand.tagline', 'Mộc mạc như viên gạch, đậm đà như ly cà phê phin Việt.', 'TEXT', 'HOME', 'Câu giới thiệu ngắn', 'Hiện ở chân trang.', 2),
    ('home.brand.logo', '', 'IMAGE', 'HOME', 'Logo (giữa thanh menu)', 'Để trống sẽ hiện logo chữ theo tên thương hiệu. Nên dùng ảnh PNG nền trong.', 3),
    ('home.brand.vn_logo', '', 'IMAGE', 'HOME', 'Logo Việt Nam (cuối thanh menu)', 'Để trống sẽ hiện cờ Việt Nam mặc định.', 4),
    ('home.hero1.image', '', 'IMAGE', 'HOME', 'Ảnh banner 1', 'Ảnh ngang, nên rộng từ 1600px.', 5),
    ('home.hero1.title', 'Cà phê phin, rang mộc mỗi tuần', 'STRING', 'HOME', 'Tiêu đề banner 1', NULL, 6),
    ('home.hero1.subtitle', 'Robusta Buôn Ma Thuột và Arabica Cầu Đất, pha chậm để giữ trọn vị đậm và hậu ngọt.', 'TEXT', 'HOME', 'Mô tả banner 1', NULL, 7),
    ('home.hero2.image', '', 'IMAGE', 'HOME', 'Ảnh banner 2', 'Ảnh ngang, nên rộng từ 1600px.', 8),
    ('home.hero2.title', 'Trà trái cây cho ngày nắng', 'STRING', 'HOME', 'Tiêu đề banner 2', NULL, 9),
    ('home.hero2.subtitle', 'Trà đào cam sả, trà vải hoa hồng: thanh mát, ít ngọt, uống mãi không ngán.', 'TEXT', 'HOME', 'Mô tả banner 2', NULL, 10),
    ('home.hero3.image', '', 'IMAGE', 'HOME', 'Ảnh banner 3', 'Ảnh ngang, nên rộng từ 1600px.', 11),
    ('home.hero3.title', 'Sắp có đặt hàng online', 'STRING', 'HOME', 'Tiêu đề banner 3', NULL, 12),
    ('home.hero3.subtitle', 'Chọn món trên web, trả bằng QR hoặc khi nhận hàng. Nhân viên quán giao tận nơi.', 'TEXT', 'HOME', 'Mô tả banner 3', NULL, 13),
    ('home.feature1.image', '', 'IMAGE', 'HOME', 'Ảnh khối giới thiệu 1', NULL, 14),
    ('home.feature1.title', 'Cà phê', 'STRING', 'HOME', 'Tiêu đề khối giới thiệu 1', NULL, 15),
    ('home.feature1.desc', 'Từ ly phin sữa đá quen thuộc đến bạc xỉu, cold brew. Hạt được rang tại quán và xay ngay trước khi pha.', 'TEXT', 'HOME', 'Mô tả khối giới thiệu 1', NULL, 16),
    ('home.feature2.image', '', 'IMAGE', 'HOME', 'Ảnh khối giới thiệu 2', NULL, 17),
    ('home.feature2.title', 'Trà', 'STRING', 'HOME', 'Tiêu đề khối giới thiệu 2', NULL, 18),
    ('home.feature2.desc', 'Trà ủ lạnh kết hợp trái cây theo mùa. Vị thanh, thơm tự nhiên, không dùng hương liệu.', 'TEXT', 'HOME', 'Mô tả khối giới thiệu 2', NULL, 19),
    ('home.feature3.image', '', 'IMAGE', 'HOME', 'Ảnh khối giới thiệu 3', NULL, 20),
    ('home.feature3.title', 'Đá xay và bánh', 'STRING', 'HOME', 'Tiêu đề khối giới thiệu 3', NULL, 21),
    ('home.feature3.desc', 'Matcha, cookie đá xay cùng bánh nướng mỗi sáng cho buổi chiều thong thả.', 'TEXT', 'HOME', 'Mô tả khối giới thiệu 3', NULL, 22),
    ('home.origin.image', '', 'IMAGE', 'HOME', 'Ảnh nguồn gốc', NULL, 23),
    ('home.origin.title', 'Câu chuyện của Gạch', 'STRING', 'HOME', 'Tiêu đề nguồn gốc', NULL, 24),
    ('home.origin.content', 'Gạch Coffee bắt đầu từ một căn nhà nhỏ lát gạch đỏ, nơi nhóm bạn trẻ yêu cà phê Việt rủ nhau rang những mẻ hạt đầu tiên.\nChúng tôi chọn tên Gạch vì muốn quán mộc mạc, bền bỉ và gần gũi như chính những viên gạch ấy: mỗi ly đều được làm chậm rãi và tử tế.', 'TEXT', 'HOME', 'Nội dung nguồn gốc', 'Xuống dòng để tách đoạn. Tối đa 500 ký tự.', 25),
    ('home.services.heading', 'Phục vụ theo cách bạn muốn', 'STRING', 'HOME', 'Tiêu đề khu dịch vụ', NULL, 26),
    ('home.service1.title', 'Uống tại quán', 'STRING', 'HOME', 'Tên dịch vụ 1', NULL, 27),
    ('home.service1.desc', 'Không gian gạch mộc, wifi mạnh. Quét mã QR trên bàn để gọi món, không cần chờ.', 'TEXT', 'HOME', 'Mô tả dịch vụ 1', NULL, 28),
    ('home.service2.title', 'Mang đi', 'STRING', 'HOME', 'Tên dịch vụ 2', NULL, 29),
    ('home.service2.desc', 'Gọi món tại quầy, nhận đồ uống sau vài phút. Tích điểm bằng số điện thoại.', 'TEXT', 'HOME', 'Mô tả dịch vụ 2', NULL, 30),
    ('home.service3.title', 'Giao tận nơi', 'STRING', 'HOME', 'Tên dịch vụ 3', NULL, 31),
    ('home.service3.desc', 'Đặt online, trả bằng QR hoặc khi nhận hàng. Đang hoàn thiện, sắp ra mắt.', 'TEXT', 'HOME', 'Mô tả dịch vụ 3', NULL, 32),
    ('home.store.title', 'Ghé quán', 'STRING', 'HOME', 'Tiêu đề khu địa chỉ', NULL, 33),
    ('home.store.address', '', 'STRING', 'HOME', 'Địa chỉ quán', 'Hiện ở khu Địa chỉ quán và chân trang.', 34),
    ('home.store.hours', '7:00 – 22:00, tất cả các ngày', 'STRING', 'HOME', 'Giờ mở cửa', NULL, 35),
    ('home.store.image', '', 'IMAGE', 'HOME', 'Ảnh quán', NULL, 36),
    ('home.contact.title', 'Cần hỗ trợ? Gọi hoặc nhắn cho quán', 'STRING', 'HOME', 'Tiêu đề khu liên hệ', NULL, 37),
    ('home.contact.hotline', '', 'STRING', 'HOME', 'Hotline', NULL, 38),
    ('home.contact.email', '', 'EMAIL', 'HOME', 'Email hỗ trợ', NULL, 39),
    ('home.contact.facebook', '', 'URL', 'HOME', 'Link Facebook / fanpage', 'Để trống sẽ ẩn.', 40);

UPDATE system_settings
SET label = 'Thời gian tồn tại mã QR (phút)',
    description = 'Mã QR payOS hết hạn sau số phút này (từ 1 đến 60). Đổi giá trị chỉ áp dụng cho mã tạo sau đó.'
WHERE setting_key = 'payment.qr_timeout_minutes';
