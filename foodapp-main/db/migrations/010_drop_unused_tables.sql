-- Drop legacy/unused transactional and reporting tables that are no longer used by runtime code.
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS refresh_report_materializations;

DROP TABLE IF EXISTS cart_item_modifiers;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;

DROP TABLE IF EXISTS order_item_modifiers;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS order_status_events;
DROP TABLE IF EXISTS payment_events;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS orders;

DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS jwt_revocations;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS addresses;

DROP TABLE IF EXISTS delivery_fee_rules;
DROP TABLE IF EXISTS delivery_zones;
DROP TABLE IF EXISTS offers;

DROP TABLE IF EXISTS report_popular_items;
DROP TABLE IF EXISTS report_daily_sales;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
