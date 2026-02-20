START TRANSACTION;

DROP PROCEDURE IF EXISTS refactor_auth_roles_to_role_id;

DELIMITER $$
CREATE PROCEDURE refactor_auth_roles_to_role_id()
BEGIN
  DECLARE db_name VARCHAR(128);
  DECLARE has_old_user_id_column INT DEFAULT 0;
  DECLARE has_role_key_column INT DEFAULT 0;
  DECLARE has_users_role_id_column INT DEFAULT 0;
  DECLARE customer_role_id BIGINT UNSIGNED;
  DECLARE admin_role_id BIGINT UNSIGNED;

  SET db_name = DATABASE();

  SELECT COUNT(*)
    INTO has_old_user_id_column
  FROM information_schema.columns
  WHERE table_schema = db_name
    AND table_name = 'user_roles'
    AND column_name = 'user_id';

  SELECT COUNT(*)
    INTO has_role_key_column
  FROM information_schema.columns
  WHERE table_schema = db_name
    AND table_name = 'user_roles'
    AND column_name = 'role_key';

  IF has_old_user_id_column > 0 OR has_role_key_column = 0 THEN
    DROP TABLE IF EXISTS user_roles;

    CREATE TABLE user_roles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      role_key ENUM('CUSTOMER', 'ADMIN') NOT NULL,
      name VARCHAR(80) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_roles_key (role_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  INSERT INTO user_roles (role_key, name)
  VALUES
    ('CUSTOMER', 'Customer'),
    ('ADMIN', 'Admin')
  ON DUPLICATE KEY UPDATE
    name = VALUES(name);

  SELECT COUNT(*)
    INTO has_users_role_id_column
  FROM information_schema.columns
  WHERE table_schema = db_name
    AND table_name = 'users'
    AND column_name = 'role_id';

  IF has_users_role_id_column = 0 THEN
    ALTER TABLE users
      ADD COLUMN role_id BIGINT UNSIGNED NULL AFTER full_name;
  END IF;

  SELECT id INTO customer_role_id
  FROM user_roles
  WHERE role_key = 'CUSTOMER'
  LIMIT 1;

  SELECT id INTO admin_role_id
  FROM user_roles
  WHERE role_key = 'ADMIN'
  LIMIT 1;

  UPDATE users
  SET role_id = customer_role_id
  WHERE role_id IS NULL
     OR role_id NOT IN (customer_role_id, admin_role_id);

  UPDATE users
  SET role_id = admin_role_id
  WHERE LOWER(email) = 'admin@example.com';

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = db_name
      AND table_name = 'users'
      AND index_name = 'idx_users_role_id'
  ) THEN
    ALTER TABLE users
      ADD INDEX idx_users_role_id (role_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = db_name
      AND table_name = 'users'
      AND constraint_name = 'fk_users_role'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_role
      FOREIGN KEY (role_id)
      REFERENCES user_roles(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  ALTER TABLE users
    MODIFY COLUMN role_id BIGINT UNSIGNED NOT NULL;
END$$
DELIMITER ;

CALL refactor_auth_roles_to_role_id();
DROP PROCEDURE IF EXISTS refactor_auth_roles_to_role_id;

COMMIT;
