START TRANSACTION;

DROP PROCEDURE IF EXISTS drop_kebabit_description_if_exists;

DELIMITER $$
CREATE PROCEDURE drop_kebabit_description_if_exists()
BEGIN
  DECLARE db_name VARCHAR(128);
  SET db_name = DATABASE();

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = db_name
      AND table_name = 'kebabit_menu_items'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE kebabit_menu_items DROP COLUMN description;
  END IF;
END$$
DELIMITER ;

CALL drop_kebabit_description_if_exists();
DROP PROCEDURE IF EXISTS drop_kebabit_description_if_exists;

COMMIT;
