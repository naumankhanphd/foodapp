START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS cart_item_modifiers;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS order_item_modifiers;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS report_popular_items;
DROP TABLE IF EXISTS menu_item_images;
DROP TABLE IF EXISTS modifier_options;
DROP TABLE IF EXISTS modifier_groups;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menu_categories;

SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

DROP PROCEDURE IF EXISTS refresh_report_materializations;

START TRANSACTION;

CREATE TABLE menu_categories (
  id VARCHAR(40) NOT NULL,
  slug VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_categories_slug (slug),
  UNIQUE KEY uq_menu_categories_name (name),
  KEY idx_menu_categories_sort_name (sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE starter_menu_items (
  id VARCHAR(40) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  prep_minutes INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dietary_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  allergens JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_starter_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_starter_menu_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_starter_menu_prep_non_negative CHECK (prep_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE kebabit_menu_items (
  id VARCHAR(40) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  name VARCHAR(191) NOT NULL,
  image_url TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  prep_minutes INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dietary_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  allergens JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_kebabit_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_kebabit_menu_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_kebabit_menu_prep_non_negative CHECK (prep_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE salaatit_menu_items (
  id VARCHAR(40) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  prep_minutes INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dietary_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  allergens JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_salaatit_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_salaatit_menu_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_salaatit_menu_prep_non_negative CHECK (prep_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drink_menu_items (
  id VARCHAR(40) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  prep_minutes INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dietary_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  allergens JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_drink_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_drink_menu_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_drink_menu_prep_non_negative CHECK (prep_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pizza_menu_items (
  id VARCHAR(40) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  menu_number INT NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NULL,
  large_price DECIMAL(10,2) NOT NULL,
  family_price DECIMAL(10,2) NOT NULL,
  prep_minutes INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dietary_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  allergens JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_pizza_menu_items_number (category_id, menu_number),
  CONSTRAINT fk_pizza_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_pizza_menu_large_non_negative CHECK (large_price >= 0),
  CONSTRAINT chk_pizza_menu_family_non_negative CHECK (family_price >= 0),
  CONSTRAINT chk_pizza_menu_family_ge_large CHECK (family_price >= large_price),
  CONSTRAINT chk_pizza_menu_prep_non_negative CHECK (prep_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_starter_menu_items_active_price_name ON starter_menu_items(is_active, price, name);
CREATE INDEX idx_kebabit_menu_items_active_price_name ON kebabit_menu_items(is_active, price, name);
CREATE INDEX idx_salaatit_menu_items_active_price_name ON salaatit_menu_items(is_active, price, name);
CREATE INDEX idx_drink_menu_items_active_price_name ON drink_menu_items(is_active, price, name);
CREATE INDEX idx_pizza_menu_items_active_price_name ON pizza_menu_items(is_active, large_price, name);

COMMIT;
