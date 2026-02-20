START TRANSACTION;

CREATE TABLE IF NOT EXISTS images_metadata (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  image_name VARCHAR(191) NOT NULL,
  image_link TEXT NULL,
  image_height INT NULL,
  image_width INT NULL,
  image_type VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_images_metadata_type (image_type),
  CONSTRAINT chk_images_metadata_height_non_negative CHECK (image_height IS NULL OR image_height >= 0),
  CONSTRAINT chk_images_metadata_width_non_negative CHECK (image_width IS NULL OR image_width >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE starter_menu_items
  ADD COLUMN image_metadata_id BIGINT UNSIGNED NULL AFTER description;

ALTER TABLE kebabit_menu_items
  ADD COLUMN image_metadata_id BIGINT UNSIGNED NULL AFTER name;

ALTER TABLE salaatit_menu_items
  ADD COLUMN image_metadata_id BIGINT UNSIGNED NULL AFTER description;

ALTER TABLE drink_menu_items
  ADD COLUMN image_metadata_id BIGINT UNSIGNED NULL AFTER description;

ALTER TABLE pizza_menu_items
  ADD COLUMN image_metadata_id BIGINT UNSIGNED NULL AFTER description;

DROP PROCEDURE IF EXISTS apply_image_metadata_links;

DELIMITER $$
CREATE PROCEDURE apply_image_metadata_links()
BEGIN
  DECLARE db_name VARCHAR(128);
  SET db_name = DATABASE();

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = db_name
      AND table_name = 'starter_menu_items'
      AND index_name = 'idx_starter_menu_items_image_metadata'
  ) THEN
    ALTER TABLE starter_menu_items
      ADD INDEX idx_starter_menu_items_image_metadata (image_metadata_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = db_name
      AND table_name = 'kebabit_menu_items'
      AND index_name = 'idx_kebabit_menu_items_image_metadata'
  ) THEN
    ALTER TABLE kebabit_menu_items
      ADD INDEX idx_kebabit_menu_items_image_metadata (image_metadata_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = db_name
      AND table_name = 'salaatit_menu_items'
      AND index_name = 'idx_salaatit_menu_items_image_metadata'
  ) THEN
    ALTER TABLE salaatit_menu_items
      ADD INDEX idx_salaatit_menu_items_image_metadata (image_metadata_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = db_name
      AND table_name = 'drink_menu_items'
      AND index_name = 'idx_drink_menu_items_image_metadata'
  ) THEN
    ALTER TABLE drink_menu_items
      ADD INDEX idx_drink_menu_items_image_metadata (image_metadata_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = db_name
      AND table_name = 'pizza_menu_items'
      AND index_name = 'idx_pizza_menu_items_image_metadata'
  ) THEN
    ALTER TABLE pizza_menu_items
      ADD INDEX idx_pizza_menu_items_image_metadata (image_metadata_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = db_name
      AND table_name = 'starter_menu_items'
      AND constraint_name = 'fk_starter_menu_items_image_metadata'
  ) THEN
    ALTER TABLE starter_menu_items
      ADD CONSTRAINT fk_starter_menu_items_image_metadata
      FOREIGN KEY (image_metadata_id)
      REFERENCES images_metadata(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = db_name
      AND table_name = 'kebabit_menu_items'
      AND constraint_name = 'fk_kebabit_menu_items_image_metadata'
  ) THEN
    ALTER TABLE kebabit_menu_items
      ADD CONSTRAINT fk_kebabit_menu_items_image_metadata
      FOREIGN KEY (image_metadata_id)
      REFERENCES images_metadata(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = db_name
      AND table_name = 'salaatit_menu_items'
      AND constraint_name = 'fk_salaatit_menu_items_image_metadata'
  ) THEN
    ALTER TABLE salaatit_menu_items
      ADD CONSTRAINT fk_salaatit_menu_items_image_metadata
      FOREIGN KEY (image_metadata_id)
      REFERENCES images_metadata(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = db_name
      AND table_name = 'drink_menu_items'
      AND constraint_name = 'fk_drink_menu_items_image_metadata'
  ) THEN
    ALTER TABLE drink_menu_items
      ADD CONSTRAINT fk_drink_menu_items_image_metadata
      FOREIGN KEY (image_metadata_id)
      REFERENCES images_metadata(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = db_name
      AND table_name = 'pizza_menu_items'
      AND constraint_name = 'fk_pizza_menu_items_image_metadata'
  ) THEN
    ALTER TABLE pizza_menu_items
      ADD CONSTRAINT fk_pizza_menu_items_image_metadata
      FOREIGN KEY (image_metadata_id)
      REFERENCES images_metadata(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;

CALL apply_image_metadata_links();
DROP PROCEDURE IF EXISTS apply_image_metadata_links;

UPDATE starter_menu_items SET image_metadata_id = NULL;
UPDATE kebabit_menu_items SET image_metadata_id = NULL;
UPDATE salaatit_menu_items SET image_metadata_id = NULL;
UPDATE drink_menu_items SET image_metadata_id = NULL;
UPDATE pizza_menu_items SET image_metadata_id = NULL;

ALTER TABLE starter_menu_items DROP COLUMN image_url;
ALTER TABLE kebabit_menu_items DROP COLUMN image_url;
ALTER TABLE salaatit_menu_items DROP COLUMN image_url;
ALTER TABLE drink_menu_items DROP COLUMN image_url;
ALTER TABLE pizza_menu_items DROP COLUMN image_url;

COMMIT;
