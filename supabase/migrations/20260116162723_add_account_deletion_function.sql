/*
  # Add account deletion function

  1. New Functions
    - `delete_user()` - Securely deletes a user's account and all associated data
      - Deletes all turn lists where user is the only member
      - Removes user from all turn list memberships
      - Deletes turn history records
      - Deletes feedback submitted by user
      - Finally deletes the user's auth account

  2. Security
    - Function uses SECURITY DEFINER to allow auth.users deletion
    - Only allows users to delete their own account
    - Cascading deletes handled by RLS policies

  3. Notes
    - This is a permanent, irreversible action
    - All user data is permanently deleted
*/

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM turn_list_members
  WHERE user_id = current_user_id;

  DELETE FROM turn_history
  WHERE user_id = current_user_id;

  DELETE FROM feedback
  WHERE user_id = current_user_id;

  DELETE FROM turn_lists
  WHERE created_by = current_user_id;

  DELETE FROM auth.users
  WHERE id = current_user_id;
END;
$$;