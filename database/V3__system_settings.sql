-- Cafe Management System - migration V3
-- Adds system_settings (UC-AD06 Configure System Settings, SRS 1.2.3 System setting).
-- Key-value design: one row per setting, grouped by setting_group.
-- Do NOT edit V1/V2; this file is applied on top of them by Flyway.

CREATE TABLE system_settings (
    setting_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(80) NOT NULL,
    setting_group VARCHAR(30) NOT NULL,
    setting_value VARCHAR(500) NOT NULL DEFAULT '',
    value_type VARCHAR(20) NOT NULL DEFAULT 'STRING',
    description VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    updated_by_user_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_system_settings_key UNIQUE (setting_key),
    CONSTRAINT fk_system_settings_updater FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL,
    CONSTRAINT chk_system_settings_group CHECK (
        setting_group IN ('SHOP', 'SYSTEM', 'PAYMENT', 'INVENTORY', 'LOYALTY')
    ),
    CONSTRAINT chk_system_settings_type CHECK (
        value_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'URL')
    ),
    CONSTRAINT chk_system_settings_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_system_settings_group_status ON system_settings(setting_group, status);

-- Default rows, matching the fields of SRS screen 1.2.3 System setting.
-- Empty values are filled in by the Admin on the System Settings screen.
INSERT INTO system_settings (setting_key, setting_group, setting_value, value_type, description) VALUES
    ('shop.name',                       'SHOP',      '',     'STRING', 'Shop name printed on receipts and the customer web app'),
    ('shop.address',                    'SHOP',      '',     'STRING', 'Shop address printed on invoice headers'),
    ('shop.hotline',                    'SHOP',      '',     'STRING', 'Contact phone number displayed on receipts'),
    ('system.public_base_url',          'SYSTEM',    '',     'URL',    'Public server URL encoded into table QR codes'),
    ('payment.bank_bin',                'PAYMENT',   '',     'STRING', 'Destination bank BIN / short code for VietQR'),
    ('payment.bank_account_number',     'PAYMENT',   '',     'STRING', 'Bank account receiving cashless payments'),
    ('payment.bank_account_holder',     'PAYMENT',   '',     'STRING', 'Legal owner name of the destination bank account'),
    ('inventory.default_min_stock',     'INVENTORY', '0',    'NUMBER', 'Suggested minimum stock level pre-filled for new inventory items');

-- Loyalty conversion rates (SRS 1.1.10 Conversion score). PENDING TEAM CONFIRMATION:
-- customers.current_points stores each customer's point balance, not these rates.
-- Remove this block if the team decides to store the rates elsewhere.
INSERT INTO system_settings (setting_key, setting_group, setting_value, value_type, description) VALUES
    ('loyalty.vnd_per_point',           'LOYALTY',   '10000', 'NUMBER', 'Amount (VND) a customer must spend to earn 1 point'),
    ('loyalty.point_value_vnd',         'LOYALTY',   '1000',  'NUMBER', 'Discount value (VND) of 1 point when redeemed');
