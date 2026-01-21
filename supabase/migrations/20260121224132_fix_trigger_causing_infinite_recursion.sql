/*
  # Fix Trigger Causing Infinite Recursion

  ## Problem
  The trigger `add_creator_as_collaborator_trigger` creates infinite recursion:
  1. SELECT from turn_lists triggers RLS policy check
  2. Trigger executes and tries to INSERT into turn_list_collaborators
  3. INSERT into turn_list_collaborators checks RLS policy
  4. RLS policy queries turn_lists (back to step 1 - infinite loop!)

  ## Solution
  Make the function use SECURITY DEFINER with proper search_path to bypass RLS checks.
  This allows the automatic collaborator creation to work without triggering recursion.

  ## Security
  - Function only inserts the creator as owner (safe operation)
  - Uses ON CONFLICT to prevent duplicates
  - search_path prevents SQL injection
*/

-- Drop and recreate the function with SECURITY DEFINER
DROP TRIGGER IF EXISTS add_creator_as_collaborator_trigger ON turn_lists;
DROP FUNCTION IF EXISTS add_creator_as_collaborator();

CREATE OR REPLACE FUNCTION add_creator_as_collaborator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO turn_list_collaborators (turn_list_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (turn_list_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER add_creator_as_collaborator_trigger
  AFTER INSERT ON turn_lists
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_collaborator();
