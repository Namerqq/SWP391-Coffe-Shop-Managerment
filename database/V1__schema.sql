-- Cafe Management System - frozen schema v1
-- MySQL 8.0+ / Flyway

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
