-- =============================================================================
-- Migration 014: Persistent cart tables
--
-- Replaces the in-memory cart store with two MySQL tables so carts survive
-- server restarts and can be shared across multiple server instances.
-- =============================================================================

CREATE TABLE IF NOT EXISTS cart_sessions (
  id                    VARCHAR(40)   NOT NULL,
  owner_key             VARCHAR(160)  NOT NULL,
  order_type            VARCHAR(30)   NOT NULL DEFAULT 'DELIVERY',
  delivery_address_json TEXT          NULL,
  created_at            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_sessions_owner_key (owner_key)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id                        VARCHAR(40)   NOT NULL,
  cart_session_id           VARCHAR(40)   NOT NULL,
  item_id                   VARCHAR(40)   NOT NULL,
  quantity                  INT           NOT NULL DEFAULT 1,
  selected_option_ids_json  VARCHAR(2000) NOT NULL DEFAULT '[]',
  special_instructions      VARCHAR(280)  NOT NULL DEFAULT '',
  item_name_snapshot        VARCHAR(191)  NOT NULL DEFAULT '',
  base_price_snapshot       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  modifier_total_snapshot   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit_price_snapshot       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at                DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cart_items_session  (cart_session_id),
  KEY idx_cart_items_item     (item_id),
  CONSTRAINT fk_cart_items_session
    FOREIGN KEY (cart_session_id) REFERENCES cart_sessions (id) ON DELETE CASCADE
);
