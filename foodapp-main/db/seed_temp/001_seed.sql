START TRANSACTION;

DELETE FROM starter_menu_items;
DELETE FROM kebabit_menu_items;
DELETE FROM salaatit_menu_items;

DELETE FROM menu_categories
WHERE slug IN ('starters', 'mains');

INSERT INTO menu_categories (id, slug, name, sort_order, is_active)
VALUES
  ('cat-002', 'kebabit', 'Kebabit', 1, TRUE),
  ('cat-005', 'salaatit', 'Salaatit', 2, TRUE),
  ('cat-004', 'pizzat', 'Pizzat', 3, TRUE),
  ('cat-003', 'drinks', 'Drinks', 4, TRUE)
ON DUPLICATE KEY UPDATE
  slug = VALUES(slug),
  name = VALUES(name),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO images_metadata (image_name, image_link, image_height, image_width, image_type)
SELECT
  'pizza/fantasia.jpg',
  '/images/pizza/fantasia.jpg',
  1105,
  1182,
  'image/jpeg'
WHERE NOT EXISTS (
  SELECT 1
  FROM images_metadata im
  WHERE im.image_name = 'pizza/fantasia.jpg'
);

INSERT INTO images_metadata (image_name, image_link, image_height, image_width, image_type)
SELECT
  'pizza/darra.jpg',
  '/images/pizza/darra.jpg',
  1325,
  1440,
  'image/jpeg'
WHERE NOT EXISTS (
  SELECT 1
  FROM images_metadata im
  WHERE im.image_name = 'pizza/darra.jpg'
);

INSERT INTO images_metadata (image_name, image_link, image_height, image_width, image_type)
SELECT
  'pizza/finlandia.jpg',
  '/images/pizza/finlandia.jpg',
  1195,
  1172,
  'image/jpeg'
WHERE NOT EXISTS (
  SELECT 1
  FROM images_metadata im
  WHERE im.image_name = 'pizza/finlandia.jpg'
);

INSERT INTO images_metadata (image_name, image_link, image_height, image_width, image_type)
SELECT
  'pizza/kebab.jpg',
  '/images/pizza/kebab.jpg',
  1200,
  1292,
  'image/jpeg'
WHERE NOT EXISTS (
  SELECT 1
  FROM images_metadata im
  WHERE im.image_name = 'pizza/kebab.jpg'
);

INSERT INTO images_metadata (image_name, image_link, image_height, image_width, image_type)
SELECT
  'pizza/yew_york.jpg',
  '/images/pizza/yew_york.jpg',
  1127,
  1183,
  'image/jpeg'
WHERE NOT EXISTS (
  SELECT 1
  FROM images_metadata im
  WHERE im.image_name = 'pizza/yew_york.jpg'
);

INSERT INTO images_metadata (image_name, image_link, image_height, image_width, image_type)
SELECT
  'kebab/kebab_ranskalaisilla.jpg',
  '/images/kebab/kebab_ranskalaisilla.jpg',
  1600,
  1200,
  'image/jpeg'
WHERE NOT EXISTS (
  SELECT 1
  FROM images_metadata im
  WHERE im.image_name = 'kebab/kebab_ranskalaisilla.jpg'
);

UPDATE images_metadata
SET
  image_link = '/images/kebab/kebab_ranskalaisilla.jpg',
  image_height = 1600,
  image_width = 1200,
  image_type = 'image/jpeg',
  updated_at = CURRENT_TIMESTAMP(3)
WHERE image_name = 'kebab/kebab_ranskalaisilla.jpg';

INSERT INTO kebabit_menu_items (id, category_id, name, image_metadata_id, price, prep_minutes, is_active)
VALUES
  ('kebab-001', 'cat-002', 'PITAKEBAB', NULL, 9.90, 12, TRUE),
  ('kebab-002', 'cat-002', 'KEBAB SALAATILLA', NULL, 11.00, 12, TRUE),
  ('kebab-003', 'cat-002', 'KEBAB-RANSKALAISILLA', NULL, 11.00, 12, TRUE),
  ('kebab-004', 'cat-002', 'RULLAKEBAB', NULL, 11.50, 12, TRUE),
  ('kebab-005', 'cat-002', 'ISKENDER KEBAB', NULL, 11.00, 12, TRUE),
  ('kebab-006', 'cat-002', 'KEBAB LOHKOPERUNOILLA', NULL, 11.00, 12, TRUE),
  ('kebab-007', 'cat-002', 'KEBAB RIISILLÄ', NULL, 11.50, 12, TRUE),
  ('kebab-008', 'cat-002', 'KEBABRISTIKKOPERUNOILLA', NULL, 11.00, 12, TRUE)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  image_metadata_id = NULL,
  price = VALUES(price),
  prep_minutes = VALUES(prep_minutes),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO salaatit_menu_items (id, category_id, name, description, image_metadata_id, price, prep_minutes, is_active)
VALUES
  ('salaatti-001', 'cat-005', 'KANASALAATTI', 'Salaattiannos sisältää: jäävuorisalaatti, kurkku, tomaatti, turkinpippuri. Kana, oliivi, ananas', NULL, 10.00, 8, TRUE),
  ('salaatti-002', 'cat-005', 'KREIKKALAINEN SALAATTI', 'Salaattiannos sisältää: jäävuorisalaatti, kurkku, tomaatti, turkinpippuri. Fetajuusto, oliivi, punasipuli, tomaatti', NULL, 10.00, 8, TRUE),
  ('salaatti-003', 'cat-005', 'TONNIKALASALAATTI', 'Salaattiannos sisältää: jäävuorisalaatti, kurkku, tomaatti, turkinpippuri. Tonnikala, punasipuli, turkinpippuri', NULL, 10.00, 8, TRUE)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  description = VALUES(description),
  image_metadata_id = NULL,
  price = VALUES(price),
  prep_minutes = VALUES(prep_minutes),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO drink_menu_items (id, category_id, name, description, image_metadata_id, price, prep_minutes, is_active)
VALUES
  (
    'item-003',
    'cat-003',
    'Lime Mint Sparkler',
    'Sparkling lime soda with mint syrup.',
    NULL,
    4.70,
    3,
    TRUE
  )
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  description = VALUES(description),
  image_metadata_id = NULL,
  price = VALUES(price),
  prep_minutes = VALUES(prep_minutes),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO pizza_menu_items (
  id,
  category_id,
  menu_number,
  name,
  description,
  image_metadata_id,
  large_price,
  family_price,
  prep_minutes,
  is_active
)
VALUES
  ('item-004', 'cat-004', 1, 'MARGARITA', 'Juusto, rukola, kirsikkatomaatti', NULL, 9.90, 17.90, 15, TRUE),
  ('item-005', 'cat-004', 2, 'HAWAI', 'Kinkku, ananas, aurajuusto', NULL, 10.50, 18.00, 15, TRUE),
  ('item-006', 'cat-004', 3, 'POLLO', 'Kana, persikka, aurajuusto', NULL, 10.50, 18.00, 15, TRUE),
  ('item-007', 'cat-004', 4, 'JAUHELIHAPIZZA', 'Jauheliha, juusto', NULL, 10.50, 18.00, 15, TRUE),
  ('item-008', 'cat-004', 5, 'QUATTRO', 'Tonnikala, herkkusieni, kinkku, katkarapu', NULL, 11.00, 19.00, 15, TRUE),
  ('item-009', 'cat-004', 6, 'KEBAB-PIZZA', 'Kebab, sipuli, tomaatti, turkinpippuri', NULL, 11.00, 19.00, 15, TRUE),
  ('item-010', 'cat-004', 7, 'MEREN ANTIMET', 'Tonnikala, simpukka, katkarapu', NULL, 11.00, 19.00, 15, TRUE),
  ('item-011', 'cat-004', 8, 'KANA-PIZZA', 'Kana, ananas, sipuli, aurajuusto', NULL, 11.00, 19.00, 15, TRUE),
  ('item-012', 'cat-004', 9, 'ROMEO', 'Salami, ananas, pekoni, katkarapu', NULL, 11.00, 19.00, 15, TRUE),
  ('item-013', 'cat-004', 10, 'PEPPERONI PIZZA', 'Pepperoni, salami, paprika', NULL, 11.00, 19.00, 15, TRUE),
  ('item-014', 'cat-004', 11, 'KASVIS-PIZZA', 'Oliivi, sipuli, feta, persikka, tomaatti, rukola', NULL, 11.50, 19.90, 15, TRUE),
  ('item-015', 'cat-004', 12, 'ÄIJÄ', 'Kebab, jauheliha, kinkku, salami', NULL, 11.90, 20.50, 15, TRUE),
  ('item-016', 'cat-004', 13, 'BEARNAISE', 'Kebab, feta, persikka, Bearnaise-kastike', NULL, 11.90, 21.00, 15, TRUE),
  ('item-017', 'cat-004', 14, 'HOTMIX', 'Kebab, jalapeno, paprika, pepperoni, valkosipuli, chilikastike', NULL, 11.90, 21.00, 15, TRUE),
  ('item-018', 'cat-004', 15, 'DARRA', 'Kebab, salami, pekoni, pepperoni, valkosipuli', NULL, 11.90, 21.00, 15, TRUE),
  ('item-019', 'cat-004', 16, 'TIKANMAAN-SPECIAL', 'Kebab, pepperoni, bearnaise-kastike, ranskalaiset', NULL, 12.50, 22.00, 15, TRUE),
  ('item-020', 'cat-004', 17, 'FINLANDIA', 'Ananas, salami, katkarapu, aurajuusto, valkosipuli', NULL, 12.50, 22.00, 15, TRUE),
  ('item-021', 'cat-004', 18, 'SALAATTI-PIZZA', 'Mozzarella, tomaatti, kurkku, jäävuorisalaatti', NULL, 12.50, 22.00, 15, TRUE),
  ('item-022', 'cat-004', 19, 'NEW YORK-PIZZA', 'Kinkku, herkkusieni, punasipuli, pekoni, kebab', NULL, 13.00, 23.00, 15, TRUE),
  ('item-023', 'cat-004', 20, 'TEXAS', 'Kinkku, salami, jalapeno, paprika, aurajuusto, kebab', NULL, 13.00, 23.00, 15, TRUE),
  ('item-024', 'cat-004', 21, 'FANTASIA PIZZA', '4:1lä täytteellä', NULL, 13.00, 23.00, 15, TRUE)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  menu_number = VALUES(menu_number),
  name = VALUES(name),
  description = VALUES(description),
  image_metadata_id = NULL,
  large_price = VALUES(large_price),
  family_price = VALUES(family_price),
  prep_minutes = VALUES(prep_minutes),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP(3);

UPDATE starter_menu_items
SET image_metadata_id = NULL;

UPDATE kebabit_menu_items
SET image_metadata_id = NULL;

UPDATE salaatit_menu_items
SET image_metadata_id = NULL;

UPDATE kebabit_menu_items k
INNER JOIN images_metadata im ON im.image_name = 'kebab/kebab_ranskalaisilla.jpg'
SET k.image_metadata_id = im.id
WHERE k.id = 'kebab-003';

UPDATE drink_menu_items
SET image_metadata_id = NULL;

UPDATE pizza_menu_items
SET image_metadata_id = NULL;

UPDATE pizza_menu_items p
INNER JOIN images_metadata im ON im.image_name = 'pizza/fantasia.jpg'
SET p.image_metadata_id = im.id
WHERE p.id = 'item-024';

UPDATE pizza_menu_items p
INNER JOIN images_metadata im ON im.image_name = 'pizza/darra.jpg'
SET p.image_metadata_id = im.id
WHERE p.id = 'item-018';

UPDATE pizza_menu_items p
INNER JOIN images_metadata im ON im.image_name = 'pizza/finlandia.jpg'
SET p.image_metadata_id = im.id
WHERE p.id = 'item-020';

UPDATE pizza_menu_items p
INNER JOIN images_metadata im ON im.image_name = 'pizza/kebab.jpg'
SET p.image_metadata_id = im.id
WHERE p.id = 'item-009';

UPDATE pizza_menu_items p
INNER JOIN images_metadata im ON im.image_name = 'pizza/yew_york.jpg'
SET p.image_metadata_id = im.id
WHERE p.id = 'item-022';

COMMIT;
