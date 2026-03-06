-- =============================================================================
-- Migration 013: Add image focal point columns to menu_items
--
-- image_focal_x / image_focal_y store a 0–100 percentage that maps directly
-- to CSS object-position (e.g. object-position: 60% 30%).
-- NULL means use the default centred position (50% 50%).
-- =============================================================================

ALTER TABLE menu_items
  ADD COLUMN image_focal_x DECIMAL(5,2) NULL,
  ADD COLUMN image_focal_y DECIMAL(5,2) NULL;
