-- Remove deprecated dietary/allergen fields from menu tables.

DROP PROCEDURE IF EXISTS drop_column_if_exists;
DELIMITER $$
CREATE PROCEDURE drop_column_if_exists(IN p_table_name VARCHAR(64), IN p_column_name VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = DATABASE()
      AND c.table_name = p_table_name
      AND c.column_name = p_column_name
  ) THEN
    SET @statement = CONCAT(
      'ALTER TABLE `',
      p_table_name,
      '` DROP COLUMN `',
      p_column_name,
      '`'
    );
    PREPARE stmt FROM @statement;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

CALL drop_column_if_exists('starter_menu_items', 'dietary_tags');
CALL drop_column_if_exists('starter_menu_items', 'allergens');
CALL drop_column_if_exists('kebabit_menu_items', 'dietary_tags');
CALL drop_column_if_exists('kebabit_menu_items', 'allergens');
CALL drop_column_if_exists('salaatit_menu_items', 'dietary_tags');
CALL drop_column_if_exists('salaatit_menu_items', 'allergens');
CALL drop_column_if_exists('drink_menu_items', 'dietary_tags');
CALL drop_column_if_exists('drink_menu_items', 'allergens');
CALL drop_column_if_exists('pizza_menu_items', 'dietary_tags');
CALL drop_column_if_exists('pizza_menu_items', 'allergens');

DROP PROCEDURE IF EXISTS drop_column_if_exists;
