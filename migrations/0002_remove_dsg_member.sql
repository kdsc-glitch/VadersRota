-- Remove isDsgMember column from team_members table
ALTER TABLE team_members DROP COLUMN IF EXISTS is_dsg_member;