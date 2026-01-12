/*
  # Fix Turn History to Track Members Instead of Users

  ## Problem
  The turn_history table currently tracks user_id, but since multiple members
  can share the same user_id (different display names), we can't determine
  which specific member took the turn.

  ## Solution
  1. Add member_id column to track the specific member who took the turn
  2. Keep user_id for backward compatibility and RLS policies
  3. Add foreign key constraint for data integrity
  4. Update existing history records to link to members

  ## Changes
  - Add member_id column to turn_history
  - Add foreign key constraint from turn_history to turn_list_members
  - Migrate existing data to populate member_id based on user_id and turn_list_id
*/

-- Add member_id column to turn_history
ALTER TABLE turn_history 
  ADD COLUMN IF NOT EXISTS member_id uuid;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'turn_history_member_id_fkey'
  ) THEN
    ALTER TABLE turn_history
      ADD CONSTRAINT turn_history_member_id_fkey 
      FOREIGN KEY (member_id) 
      REFERENCES turn_list_members(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Migrate existing data: try to match history entries to members
-- This attempts to find the first matching member for each history entry
UPDATE turn_history h
SET member_id = m.id
FROM turn_list_members m
WHERE h.member_id IS NULL
  AND h.turn_list_id = m.turn_list_id
  AND h.user_id = m.user_id
  AND m.id = (
    SELECT id FROM turn_list_members
    WHERE turn_list_id = h.turn_list_id
      AND user_id = h.user_id
    ORDER BY joined_at ASC
    LIMIT 1
  );

-- For any remaining unmatched history entries, link to any member from that list
UPDATE turn_history h
SET member_id = m.id
FROM turn_list_members m
WHERE h.member_id IS NULL
  AND h.turn_list_id = m.turn_list_id
  AND m.id = (
    SELECT id FROM turn_list_members
    WHERE turn_list_id = h.turn_list_id
    ORDER BY position ASC
    LIMIT 1
  );