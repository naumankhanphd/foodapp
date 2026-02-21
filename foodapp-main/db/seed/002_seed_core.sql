START TRANSACTION;

INSERT INTO user_roles (role_key, name)
VALUES
  ('CUSTOMER', 'Customer'),
  ('ADMIN', 'Admin')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO delivery_zones (name, postal_codes, is_active)
SELECT
  'Core Zone',
  JSON_ARRAY('00100', '00120', '00130'),
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM delivery_zones dz
  WHERE dz.name = 'Core Zone'
);

INSERT INTO delivery_fee_rules (strategy, flat_fee)
SELECT 'flat', 3.50
WHERE NOT EXISTS (
  SELECT 1
  FROM delivery_fee_rules dfr
  WHERE dfr.strategy = 'flat'
);

INSERT INTO offers (name, offer_type, percentage_value, min_order_total, applies_to, is_active)
SELECT
  'Weekday Lunch 10%',
  'PERCENTAGE',
  10.00,
  20.00,
  'BOTH',
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM offers o
  WHERE o.name = 'Weekday Lunch 10%'
);

COMMIT;
