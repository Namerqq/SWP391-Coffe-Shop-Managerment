-- Hệ thống không tính VAT (xem CashierService), nên bỏ cài đặt VAT để Admin không bị hiểu nhầm.
DELETE FROM system_settings WHERE setting_key = 'sales.vat_percent';
