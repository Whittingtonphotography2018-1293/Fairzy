/*
  # Fix Member Constraints for Turn Lists

  ## Changes
  - Remove unique constraint on (turn_list_id, user_id) to allow multiple members with same user_id
  - This allows the list creator to add multiple "members" (roles/participants) without needing separate user accounts

  ## Reasoning
  - Members represent participants in a rotation (e.g., family members, team members)
  - They don't need to be individual authenticated users
  - The display_name identifies the member, not the user_id
*/

-- Drop the existing unique constraint
ALTER TABLE turn_list_members 
  DROP CONSTRAINT IF EXISTS turn_list_members_turn_list_id_user_id_key;

-- Add a new unique constraint on turn_list_id and display_name instead
-- This prevents duplicate names in the same list
ALTER TABLE turn_list_members 
  ADD CONSTRAINT turn_list_members_list_name_unique 
  UNIQUE (turn_list_id, display_name);
