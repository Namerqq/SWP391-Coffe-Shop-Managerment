-- Run against the configured local database. Keeps the frozen schema unchanged.
-- Safe to repeat; never renames an existing table or moves existing orders.
INSERT INTO cafe_tables (table_number, qr_code)
SELECT 'T-08', 'T-08'
WHERE NOT EXISTS (SELECT 1 FROM cafe_tables WHERE table_number='T-08' OR qr_code='T-08');
