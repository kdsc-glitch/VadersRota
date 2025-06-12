-- Remove availability-related columns from team_members table
ALTER TABLE team_members 
DROP COLUMN IF EXISTS is_available,
DROP COLUMN IF EXISTS unavailable_start,
DROP COLUMN IF EXISTS unavailable_end,
DROP COLUMN IF EXISTS holiday_start,
DROP COLUMN IF EXISTS holiday_end;