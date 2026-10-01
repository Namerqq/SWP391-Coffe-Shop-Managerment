-- ============================================================
-- COFFEE SHOP MANAGEMENT SYSTEM - 16 BUSINESS TABLES
-- MySQL 8.0+
-- WARNING: Running this file resets the tables listed below.
-- ============================================================

CREATE DATABASE IF NOT EXISTS cafe_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cafe_management;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Remove technical tables from the previous generated dump.
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS flyway_schema_history;
DROP TABLE IF EXISTS mutation_guard;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS cafe_orders;
DROP TABLE IF EXISTS staff_users;

-- Drop business tables in reverse dependency order.
DROP TABLE IF EXISTS stock_transactions;
DROP TABLE IF EXISTS stock_receipt_items;
DROP TABLE IF EXISTS stock_receipts;
DROP TABLE IF EXISTS loyalty_transactions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS table_sessions;
DROP TABLE IF EXISTS cafe_tables;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Staff roles.
CREATE TABLE roles (
  role_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_name    VARCHAR(30) NOT NULL,
  description VARCHAR(255),
  CONSTRAINT uq_roles_name UNIQUE (role_name)
) ENGINE = InnoDB;

-- 2. Staff accounts.
CREATE TABLE users (
  user_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_id       BIGINT NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  username      VARCHAR(50) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE','INACTIVE','LOCKED')),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE = InnoDB;

-- 3. Customers and current loyalty balance.
CREATE TABLE customers (
  customer_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  phone_number   VARCHAR(20) NOT NULL,
  full_name      VARCHAR(100),
  current_points BIGINT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_customers_phone UNIQUE (phone_number),
  CONSTRAINT chk_customers_points CHECK (current_points >= 0)
) ENGINE = InnoDB;

-- 4. Menu categories.
CREATE TABLE categories (
  category_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(80) NOT NULL,
  description   VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_categories_name UNIQUE (category_name),
  CONSTRAINT chk_categories_status CHECK (status IN ('ACTIVE','INACTIVE'))
) ENGINE = InnoDB;

-- 5. Products, menu options and recipes.
CREATE TABLE menu_items (
  menu_item_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  category_id         BIGINT NOT NULL,
  item_name           VARCHAR(120) NOT NULL,
  description         VARCHAR(1000),
  base_price          BIGINT NOT NULL,
  image_url           VARCHAR(500),
  availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  recipe_ingredients  TEXT,
  recipe_instructions TEXT,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_menu_price CHECK (base_price >= 0),
  CONSTRAINT chk_menu_availability
    CHECK (availability_status IN ('AVAILABLE','UNAVAILABLE','INACTIVE')),
  CONSTRAINT fk_menu_category FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE = InnoDB;
CREATE INDEX idx_menu_category ON menu_items(category_id);

-- 6. Physical tables and QR codes.
CREATE TABLE cafe_tables (
  table_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(30) NOT NULL,
  qr_code      VARCHAR(255) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_tables_number UNIQUE (table_number),
  CONSTRAINT uq_tables_qr UNIQUE (qr_code),
  CONSTRAINT chk_tables_status CHECK (status IN ('AVAILABLE','OCCUPIED','UNAVAILABLE'))
) ENGINE = InnoDB;

-- 7. One customer visit at a physical table.
CREATE TABLE table_sessions (
  table_session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_id         BIGINT NOT NULL,
  customer_id      BIGINT,
  session_code     VARCHAR(40) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  opened_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at        DATETIME,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active_table_id  BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('OPEN','PAYMENT_PENDING') THEN table_id ELSE NULL END) STORED,
  CONSTRAINT uq_sessions_code UNIQUE (session_code),
  CONSTRAINT uq_sessions_active_table UNIQUE (active_table_id),
  CONSTRAINT chk_sessions_status
    CHECK (status IN ('OPEN','PAYMENT_PENDING','CLOSED','CANCELLED')),
  CONSTRAINT fk_sessions_table FOREIGN KEY (table_id) REFERENCES cafe_tables(table_id),
  CONSTRAINT fk_sessions_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
) ENGINE = InnoDB;
CREATE INDEX idx_sessions_table_status ON table_sessions(table_id,status);

-- 8. Dine-in, online pickup and delivery orders.
CREATE TABLE orders (
  order_id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_by_user_id BIGINT,
  table_session_id   BIGINT,
  customer_id        BIGINT,
  order_number       VARCHAR(40) NOT NULL,
  order_source       VARCHAR(20) NOT NULL,
  fulfillment_type   VARCHAR(20) NOT NULL,
  status             VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  customer_name      VARCHAR(100),
  customer_phone     VARCHAR(20),
  pickup_time        DATETIME,
  customer_note      VARCHAR(500),
  accepted_by_user_id BIGINT,
  accepted_at         DATETIME,
  cancel_reason       VARCHAR(500),
  cancelled_at        DATETIME,
  completed_at        DATETIME,
  total_amount        BIGINT NOT NULL DEFAULT 0,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_orders_number UNIQUE (order_number),
  CONSTRAINT chk_orders_source CHECK (order_source IN ('QR_TABLE','STAFF','ONLINE')),
  CONSTRAINT chk_orders_fulfillment CHECK (fulfillment_type IN ('DINE_IN','PICKUP','DELIVERY')),
  CONSTRAINT chk_orders_status CHECK (status IN
    ('PENDING_CONFIRMATION','CONFIRMED','PREPARING','READY',
     'COMPLETED','CANCELLED','REJECTED')),
  CONSTRAINT chk_orders_session CHECK
    ((fulfillment_type='DINE_IN' AND table_session_id IS NOT NULL)
      OR (fulfillment_type IN ('PICKUP','DELIVERY') AND table_session_id IS NULL)),
  CONSTRAINT fk_orders_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_orders_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_orders_acceptor FOREIGN KEY (accepted_by_user_id) REFERENCES users(user_id)
) ENGINE = InnoDB;
CREATE INDEX idx_orders_session ON orders(table_session_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status_date ON orders(status,created_at);

-- 9. Ordered products and price snapshots. Toppings stay here as JSON.
CREATE TABLE order_items (
  order_item_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id        BIGINT NOT NULL,
  menu_item_id    BIGINT NOT NULL,
  quantity        INT NOT NULL,
  unit_price      BIGINT NOT NULL,
  sugar_level     VARCHAR(20),
  ice_level       VARCHAR(20),
  size_name       VARCHAR(60),
  size_price      BIGINT NOT NULL DEFAULT 0,
  topping_details JSON,
  topping_price   BIGINT NOT NULL DEFAULT 0,
  note            VARCHAR(300),
  item_status     VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  subtotal        BIGINT NOT NULL,
  CONSTRAINT chk_order_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_order_item_prices CHECK
    (unit_price>=0 AND size_price>=0 AND topping_price>=0 AND subtotal>=0),
  CONSTRAINT chk_order_item_status CHECK
    (item_status IN ('PENDING','PREPARING','READY','SERVED','CANCELLED')),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id)
) ENGINE = InnoDB;
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu ON order_items(menu_item_id);

-- 10. Delivery assignment and progress. One delivery row per delivery order.
CREATE TABLE deliveries (
  delivery_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id           BIGINT NOT NULL,
  assigned_waiter_id BIGINT,
  delivery_address   VARCHAR(500) NOT NULL,
  delivery_status    VARCHAR(30) NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
  assigned_at        DATETIME,
  picked_up_at       DATETIME,
  delivered_at       DATETIME,
  failed_at          DATETIME,
  failure_reason     VARCHAR(500),
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_deliveries_order UNIQUE (order_id),
  CONSTRAINT chk_delivery_status CHECK (delivery_status IN
    ('PENDING_ASSIGNMENT','ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY',
     'DELIVERED','FAILED','CANCELLED')),
  CONSTRAINT fk_delivery_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_delivery_waiter FOREIGN KEY (assigned_waiter_id) REFERENCES users(user_id)
) ENGINE = InnoDB;
CREATE INDEX idx_delivery_waiter_status ON deliveries(assigned_waiter_id,delivery_status);

-- 11. Payment for either a dine-in session or one pickup/delivery order.
CREATE TABLE payments (
  payment_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  confirmed_by_user_id BIGINT,
  table_session_id BIGINT,
  order_id         BIGINT,
  payment_code     VARCHAR(40) NOT NULL,
  payment_method   VARCHAR(20) NOT NULL,
  total_amount     BIGINT NOT NULL,
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  paid_at          DATETIME,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_payments_code UNIQUE (payment_code),
  CONSTRAINT uq_payments_session UNIQUE (table_session_id),
  CONSTRAINT uq_payments_order UNIQUE (order_id),
  CONSTRAINT chk_payments_method CHECK (payment_method IN ('CASH','BANK_TRANSFER')),
  CONSTRAINT chk_payments_amount CHECK (total_amount >= 0),
  CONSTRAINT chk_payments_status CHECK
    (payment_status IN ('PENDING','PAID','REFUND_PENDING','REFUNDED','CANCELLED')),
  CONSTRAINT chk_payments_target CHECK
    ((table_session_id IS NOT NULL AND order_id IS NULL)
      OR (table_session_id IS NULL AND order_id IS NOT NULL)),
  CONSTRAINT fk_payments_confirmer FOREIGN KEY (confirmed_by_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_payments_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ENGINE = InnoDB;
CREATE INDEX idx_payments_date ON payments(created_at);

-- 12. Permanent loyalty point history.
CREATE TABLE loyalty_transactions (
  loyalty_transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_session_id        BIGINT,
  customer_id             BIGINT NOT NULL,
  payment_id              BIGINT,
  points_change           BIGINT NOT NULL,
  transaction_type        VARCHAR(20) NOT NULL,
  note                    VARCHAR(300),
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_loyalty_points CHECK (points_change <> 0),
  CONSTRAINT chk_loyalty_type CHECK
    (transaction_type IN ('EARN','REDEEM','ADJUSTMENT','REFUND')),
  CONSTRAINT fk_loyalty_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_loyalty_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
  CONSTRAINT fk_loyalty_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id)
) ENGINE = InnoDB;
CREATE INDEX idx_loyalty_customer_date ON loyalty_transactions(customer_id,created_at);

-- 13. Ingredients and their current quantities.
CREATE TABLE inventory_items (
  inventory_item_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  item_name           VARCHAR(120) NOT NULL,
  unit                VARCHAR(30) NOT NULL,
  current_quantity    DECIMAL(14,3) NOT NULL DEFAULT 0,
  minimum_stock_level DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit_cost           BIGINT NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_inventory_name UNIQUE (item_name),
  CONSTRAINT chk_inventory_quantity CHECK
    (current_quantity>=0 AND minimum_stock_level>=0),
  CONSTRAINT chk_inventory_cost CHECK (unit_cost>=0),
  CONSTRAINT chk_inventory_status CHECK (status IN ('ACTIVE','INACTIVE'))
) ENGINE = InnoDB;

-- 14. Header of a Manager's stock receipt.
CREATE TABLE stock_receipts (
  stock_receipt_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  receipt_code         VARCHAR(40) NOT NULL,
  supplier_name        VARCHAR(150) NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  receipt_date         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount         BIGINT NOT NULL DEFAULT 0,
  created_by_user_id   BIGINT NOT NULL,
  note                 VARCHAR(500),
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at         DATETIME,
  CONSTRAINT uq_receipts_code UNIQUE (receipt_code),
  CONSTRAINT chk_receipts_amount CHECK (total_amount>=0),
  CONSTRAINT chk_receipts_status CHECK (status IN ('DRAFT','RECEIVED','CANCELLED')),
  CONSTRAINT fk_receipts_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
) ENGINE = InnoDB;

-- 15. Ingredient lines within a stock receipt.
CREATE TABLE stock_receipt_items (
  stock_receipt_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stock_receipt_id      BIGINT NOT NULL,
  inventory_item_id     BIGINT NOT NULL,
  quantity              DECIMAL(14,3) NOT NULL,
  unit_cost             BIGINT NOT NULL,
  subtotal              BIGINT NOT NULL,
  CONSTRAINT uq_receipt_inventory UNIQUE (stock_receipt_id,inventory_item_id),
  CONSTRAINT chk_receipt_item_quantity CHECK (quantity>0),
  CONSTRAINT chk_receipt_item_cost CHECK (unit_cost>=0 AND subtotal>=0),
  CONSTRAINT fk_receipt_items_receipt FOREIGN KEY (stock_receipt_id)
    REFERENCES stock_receipts(stock_receipt_id),
  CONSTRAINT fk_receipt_items_inventory FOREIGN KEY (inventory_item_id)
    REFERENCES inventory_items(inventory_item_id)
) ENGINE = InnoDB;
CREATE INDEX idx_receipt_items_inventory ON stock_receipt_items(inventory_item_id);

-- 16. Immutable history of every inventory quantity movement.
-- Quantity is positive; transaction_type determines its direction.
CREATE TABLE stock_transactions (
  stock_transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  inventory_item_id    BIGINT NOT NULL,
  created_by_user_id   BIGINT NOT NULL,
  transaction_type     VARCHAR(20) NOT NULL,
  quantity             DECIMAL(14,3) NOT NULL,
  reason               VARCHAR(500),
  note                 VARCHAR(500),
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_stock_type CHECK (transaction_type IN
    ('INITIAL','STOCK_IN','STOCK_OUT','WASTE','ADJUSTMENT')),
  CONSTRAINT chk_stock_quantity CHECK (quantity>0),
  CONSTRAINT fk_stock_inventory FOREIGN KEY (inventory_item_id)
    REFERENCES inventory_items(inventory_item_id),
  CONSTRAINT fk_stock_user FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
) ENGINE = InnoDB;
CREATE INDEX idx_stock_inventory_date ON stock_transactions(inventory_item_id,created_at);

-- Reference data. Create staff accounts through the application.
INSERT INTO roles (role_name,description) VALUES
 ('ADMIN','Manages accounts, roles and system configuration'),
 ('MANAGER','Manages menu, inventory, receipts and reports'),
 ('CASHIER','Processes checkout, payments and customer loyalty'),
 ('WAITER','Creates assisted orders and serves completed orders'),
 ('BARISTA','Prepares drinks, views recipes and records stock-out');

INSERT INTO categories (category_name,description) VALUES
 ('Coffee','Coffee-based beverages'),
 ('Tea','Tea and fruit beverages'),
 ('Blended','Blended and ice-blended beverages'),
 ('Cake','Cakes and bakery products');

INSERT INTO cafe_tables (table_number,qr_code) VALUES
 ('Table 01','TABLE-01'),('Table 02','TABLE-02'),
 ('Table 03','TABLE-03'),('Table 04','TABLE-04');

INSERT INTO inventory_items
 (item_name,unit,current_quantity,minimum_stock_level,unit_cost) VALUES
 ('Coffee beans','kg',0,2,0),
 ('Fresh milk','litre',0,5,0),
 ('Tapioca pearls','bag',0,2,0),
 ('Matcha powder','kg',0,1,0);

-- Should return 16 after this script finishes.
SELECT COUNT(*) AS business_table_count
FROM information_schema.tables
WHERE table_schema='cafe_management' AND table_type='BASE TABLE';
