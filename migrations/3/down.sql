
-- Remove all system categories
DELETE FROM categories WHERE is_system = 1;

-- Remove added columns
ALTER TABLE categories DROP COLUMN is_system;
ALTER TABLE categories DROP COLUMN parent_id;
ALTER TABLE categories DROP COLUMN icon;
