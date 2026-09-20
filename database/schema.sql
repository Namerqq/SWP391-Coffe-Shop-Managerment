-- Chạy file này trong MySQL Workbench (File > Open SQL Script > Execute) để tạo DB.
CREATE DATABASE IF NOT EXISTS project_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE project_db;

CREATE TABLE IF NOT EXISTS products (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150)   NOT NULL,
  price       DECIMAL(12,2)  NOT NULL,
  quantity    INT            NOT NULL,
  description VARCHAR(500),
  created_at  DATETIME       DEFAULT CURRENT_TIMESTAMP
);
