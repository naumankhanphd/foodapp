START TRANSACTION;

CREATE TABLE IF NOT EXISTS user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_key ENUM('CUSTOMER', 'ADMIN') NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_roles_key (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NULL,
  full_name VARCHAR(191) NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_id (role_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  phone VARCHAR(32) NULL,
  phone_verified_at DATETIME(3) NULL,
  address_line_1 VARCHAR(255) NULL,
  address_city VARCHAR(120) NULL,
  address_postal_code VARCHAR(32) NULL,
  lat DOUBLE NULL,
  lng DOUBLE NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_profiles_user (user_id),
  UNIQUE KEY uq_customer_profiles_phone (phone),
  CONSTRAINT fk_customer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(120) NOT NULL,
  line_1 VARCHAR(255) NOT NULL,
  line_2 VARCHAR(255) NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NULL,
  postal_code VARCHAR(32) NULL,
  country CHAR(2) NOT NULL DEFAULT 'US',
  delivery_note TEXT NULL,
  lat DOUBLE NULL,
  lng DOUBLE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_addresses_user_created_at (user_id, created_at),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token_hash VARCHAR(191) NOT NULL,
  jwt_id VARCHAR(191) NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (session_token_hash),
  UNIQUE KEY uq_auth_sessions_jwt_id (jwt_id),
  KEY idx_auth_sessions_user_expires (user_id, expires_at),
  KEY idx_auth_sessions_expires (expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jwt_revocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  jwt_id VARCHAR(191) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  revoked_reason VARCHAR(255) NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_jwt_revocations_jwt_id (jwt_id),
  KEY idx_jwt_revocations_expires (expires_at),
  CONSTRAINT fk_jwt_revocations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  phone VARCHAR(32) NOT NULL,
  code_hash VARCHAR(191) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_phone_verification_lookup (user_id, phone, expires_at),
  KEY idx_phone_verification_expires (expires_at),
  CONSTRAINT fk_phone_verification_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(191) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_token_hash (token_hash),
  KEY idx_password_reset_user_expires (user_id, expires_at),
  KEY idx_password_reset_expires (expires_at),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  order_type ENUM('DINE_IN', 'DELIVERY', 'PICKUP') NOT NULL DEFAULT 'DELIVERY',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_carts_user (user_id),
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  menu_table ENUM('starter_menu_items', 'kebabit_menu_items', 'salaatit_menu_items', 'drink_menu_items', 'pizza_menu_items') NOT NULL,
  menu_item_id VARCHAR(40) NOT NULL,
  item_name_snapshot VARCHAR(191) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_cart_items_cart (cart_id),
  KEY idx_cart_items_menu_lookup (menu_table, menu_item_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_item_modifiers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_item_id BIGINT UNSIGNED NOT NULL,
  option_name_snapshot VARCHAR(191) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_cart_item_modifiers_item (cart_item_id),
  CONSTRAINT fk_cart_item_modifiers_item FOREIGN KEY (cart_item_id) REFERENCES cart_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_zones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  postal_codes JSON NOT NULL DEFAULT (JSON_ARRAY()),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery_zones_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_fee_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  strategy ENUM('flat', 'distance', 'zone') NOT NULL,
  flat_fee DECIMAL(10,2) NULL,
  per_km DECIMAL(10,2) NULL,
  zone_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_delivery_fee_rules_zone (zone_id),
  CONSTRAINT fk_delivery_fee_rules_zone FOREIGN KEY (zone_id) REFERENCES delivery_zones(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  offer_type ENUM('PERCENTAGE', 'FIXED', 'FREE_DELIVERY') NOT NULL,
  percentage_value DECIMAL(5,2) NULL,
  fixed_value DECIMAL(10,2) NULL,
  min_order_total DECIMAL(10,2) NULL,
  max_order_total DECIMAL(10,2) NULL,
  starts_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  applies_to ENUM('DINE_IN', 'DELIVERY', 'BOTH') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  KEY idx_offers_active_window (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  order_type ENUM('DINE_IN', 'DELIVERY', 'PICKUP') NOT NULL,
  status ENUM('ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'DELIVERED') NOT NULL DEFAULT 'ACCEPTED',
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  eta_minutes INT NULL,
  address_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_id (public_id),
  KEY idx_orders_status (status),
  KEY idx_orders_type (order_type),
  KEY idx_orders_user_created (user_id, created_at),
  KEY idx_orders_created (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  menu_table ENUM('starter_menu_items', 'kebabit_menu_items', 'salaatit_menu_items', 'drink_menu_items', 'pizza_menu_items') NULL,
  menu_item_id VARCHAR(40) NULL,
  item_name_snapshot VARCHAR(191) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_menu_lookup (menu_table, menu_item_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_item_id BIGINT UNSIGNED NOT NULL,
  name_snapshot VARCHAR(191) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_order_item_modifiers_item (order_item_id),
  CONSTRAINT fk_order_item_modifiers_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  status ENUM('ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'DELIVERED') NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_order_events_order (order_id, created_at),
  CONSTRAINT fk_order_status_events_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_status_events_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(120) NOT NULL,
  method VARCHAR(120) NOT NULL,
  state ENUM('UNPAID', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED_PARTIAL', 'REFUNDED_FULL') NOT NULL DEFAULT 'UNPAID',
  amount DECIMAL(10,2) NOT NULL,
  provider_txn_id VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_payments_state_created (state, created_at),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  event_key VARCHAR(191) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_events_event_key (event_key),
  KEY idx_payment_events_payment_created (payment_id, created_at),
  CONSTRAINT fk_payment_events_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  title VARCHAR(191) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notifications_user_read (user_id, is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_daily_sales (
  report_date DATE NOT NULL,
  gross_sales DECIMAL(12,2) NOT NULL,
  orders_count INT NOT NULL,
  PRIMARY KEY (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_popular_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_date DATE NOT NULL,
  menu_table ENUM('starter_menu_items', 'kebabit_menu_items', 'salaatit_menu_items', 'drink_menu_items', 'pizza_menu_items') NULL,
  menu_item_id VARCHAR(40) NULL,
  item_name_snapshot VARCHAR(191) NOT NULL,
  qty_sold INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_report_popular_items_key (report_date, menu_table, menu_item_id, item_name_snapshot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

DROP PROCEDURE IF EXISTS refresh_report_materializations;

DELIMITER $$
CREATE PROCEDURE refresh_report_materializations()
BEGIN
  TRUNCATE TABLE report_daily_sales;

  INSERT INTO report_daily_sales (report_date, gross_sales, orders_count)
  SELECT
    DATE(o.created_at) AS report_date,
    ROUND(SUM(o.total), 2) AS gross_sales,
    COUNT(*) AS orders_count
  FROM orders o
  WHERE o.status IN ('COMPLETED', 'DELIVERED')
  GROUP BY DATE(o.created_at);

  TRUNCATE TABLE report_popular_items;

  INSERT INTO report_popular_items (report_date, menu_table, menu_item_id, item_name_snapshot, qty_sold)
  SELECT
    DATE(o.created_at) AS report_date,
    oi.menu_table,
    oi.menu_item_id,
    oi.item_name_snapshot,
    SUM(oi.quantity) AS qty_sold
  FROM orders o
  INNER JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status IN ('COMPLETED', 'DELIVERED')
  GROUP BY DATE(o.created_at), oi.menu_table, oi.menu_item_id, oi.item_name_snapshot;
END$$
DELIMITER ;
