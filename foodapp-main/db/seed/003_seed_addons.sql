START TRANSACTION;

INSERT INTO addons (category_id, item_name, price, is_active)
SELECT
  staged.category_id,
  staged.item_name,
  staged.price,
  TRUE
FROM (
  SELECT 'cat-002' AS category_id, 'Extra kebab meat' AS item_name, 2.50 AS price
  UNION ALL SELECT 'cat-002', 'Garlic sauce', 1.20
  UNION ALL SELECT 'cat-002', 'Hot sauce', 1.00
  UNION ALL SELECT 'cat-004', 'Extra cheese', 2.00
  UNION ALL SELECT 'cat-004', 'Garlic dip', 1.20
  UNION ALL SELECT 'cat-004', 'Jalapeno topping', 1.50
  UNION ALL SELECT 'cat-005', 'Feta topping', 1.50
  UNION ALL SELECT 'cat-005', 'Olives', 1.20
  UNION ALL SELECT 'cat-003', 'Ice cubes', 0.50
) AS staged
INNER JOIN menu_categories mc ON mc.id = staged.category_id
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP(3);

COMMIT;

