START TRANSACTION;

-- Keep only auth role catalog seed.
-- Delivery, offers, payments and reporting tables were removed in migration 010.
INSERT INTO user_roles (role_key, name)
VALUES
  ('CUSTOMER', 'Customer'),
  ('ADMIN', 'Admin')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

COMMIT;
