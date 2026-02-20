START TRANSACTION;

CREATE TABLE IF NOT EXISTS salaatit_menu_items (
  id VARCHAR(40) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  image_metadata_id BIGINT UNSIGNED NULL,
  price DECIMAL(10,2) NOT NULL,
  prep_minutes INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dietary_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  allergens JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_salaatit_menu_items_active_price_name (is_active, price, name),
  KEY idx_salaatit_menu_items_image_metadata (image_metadata_id),
  CONSTRAINT fk_salaatit_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_salaatit_menu_items_image_metadata FOREIGN KEY (image_metadata_id) REFERENCES images_metadata(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_salaatit_menu_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_salaatit_menu_prep_non_negative CHECK (prep_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS apply_salaatit_menu_table_enum;

DELIMITER $$
CREATE PROCEDURE apply_salaatit_menu_table_enum()
BEGIN
  DECLARE db_name VARCHAR(128);
  SET db_name = DATABASE();

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = db_name
      AND table_name = 'cart_items'
  ) THEN
    UPDATE cart_items
    SET menu_table = 'salaatit_menu_items'
    WHERE menu_table = 'starter_menu_items' AND menu_item_id LIKE 'salaatti-%';

    ALTER TABLE cart_items
      MODIFY menu_table ENUM('starter_menu_items', 'kebabit_menu_items', 'salaatit_menu_items', 'drink_menu_items', 'pizza_menu_items') NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = db_name
      AND table_name = 'order_items'
  ) THEN
    UPDATE order_items
    SET menu_table = 'salaatit_menu_items'
    WHERE menu_table = 'starter_menu_items' AND menu_item_id LIKE 'salaatti-%';

    ALTER TABLE order_items
      MODIFY menu_table ENUM('starter_menu_items', 'kebabit_menu_items', 'salaatit_menu_items', 'drink_menu_items', 'pizza_menu_items') NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = db_name
      AND table_name = 'report_popular_items'
  ) THEN
    UPDATE report_popular_items
    SET menu_table = 'salaatit_menu_items'
    WHERE menu_table = 'starter_menu_items' AND menu_item_id LIKE 'salaatti-%';

    ALTER TABLE report_popular_items
      MODIFY menu_table ENUM('starter_menu_items', 'kebabit_menu_items', 'salaatit_menu_items', 'drink_menu_items', 'pizza_menu_items') NULL;
  END IF;
END$$
DELIMITER ;

CALL apply_salaatit_menu_table_enum();
DROP PROCEDURE IF EXISTS apply_salaatit_menu_table_enum;

COMMIT;
