-- Add isHidden column to users table
-- This allows users to be hidden from leaderboards and user counts

BEGIN;

-- Add is_hidden column to users table with default value of false
ALTER TABLE users 
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

COMMIT;
