/*
  # Fix Collaborator RLS Infinite Recursion

  ## Problem
  The previous migration created circular RLS dependencies:
  - turn_lists policies check turn_list_collaborators
  - turn_list_collaborators policies check turn_lists
  - This creates infinite recursion when querying turn_lists

  ## Solution
  1. Drop all problematic policies that check turn_list_collaborators
  2. Create security definer functions to check collaborator access without triggering RLS
  3. Use these functions in new policies

  ## Security
  - Security definer functions bypass RLS safely by checking specific conditions
  - Maintains proper access control for collaborators
  - No circular dependencies
*/

-- =====================================================
-- Drop problematic policies that cause infinite recursion
-- =====================================================

DROP POLICY IF EXISTS "Collaborators can view turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Collaborators can update turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Collaborators can view members" ON turn_list_members;
DROP POLICY IF EXISTS "Collaborators can add members" ON turn_list_members;
DROP POLICY IF EXISTS "Collaborators can update members" ON turn_list_members;
DROP POLICY IF EXISTS "Collaborators can remove members" ON turn_list_members;
DROP POLICY IF EXISTS "Collaborators can view turn history" ON turn_history;
DROP POLICY IF EXISTS "Collaborators can add turn history" ON turn_history;

-- =====================================================
-- Create security definer functions to check collaborator access
-- =====================================================

-- Function to check if user is a collaborator on a turn list
CREATE OR REPLACE FUNCTION is_turn_list_collaborator(list_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM turn_list_collaborators
    WHERE turn_list_id = list_id
    AND turn_list_collaborators.user_id = is_turn_list_collaborator.user_id
  );
$$;

-- =====================================================
-- Create new policies using security definer functions
-- =====================================================

-- TURN_LISTS: Collaborators can view and update
CREATE POLICY "Collaborators can view turn lists via function"
  ON turn_lists FOR SELECT
  TO authenticated
  USING (is_turn_list_collaborator(id, (select auth.uid())));

CREATE POLICY "Collaborators can update turn lists via function"
  ON turn_lists FOR UPDATE
  TO authenticated
  USING (is_turn_list_collaborator(id, (select auth.uid())))
  WITH CHECK (is_turn_list_collaborator(id, (select auth.uid())));

-- TURN_LIST_MEMBERS: Collaborators can manage members
CREATE POLICY "Collaborators can view members via function"
  ON turn_list_members FOR SELECT
  TO authenticated
  USING (is_turn_list_collaborator(turn_list_id, (select auth.uid())));

CREATE POLICY "Collaborators can add members via function"
  ON turn_list_members FOR INSERT
  TO authenticated
  WITH CHECK (is_turn_list_collaborator(turn_list_id, (select auth.uid())));

CREATE POLICY "Collaborators can update members via function"
  ON turn_list_members FOR UPDATE
  TO authenticated
  USING (is_turn_list_collaborator(turn_list_id, (select auth.uid())))
  WITH CHECK (is_turn_list_collaborator(turn_list_id, (select auth.uid())));

CREATE POLICY "Collaborators can remove members via function"
  ON turn_list_members FOR DELETE
  TO authenticated
  USING (is_turn_list_collaborator(turn_list_id, (select auth.uid())));

-- TURN_HISTORY: Collaborators can view and add history
CREATE POLICY "Collaborators can view turn history via function"
  ON turn_history FOR SELECT
  TO authenticated
  USING (is_turn_list_collaborator(turn_list_id, (select auth.uid())));

CREATE POLICY "Collaborators can add turn history via function"
  ON turn_history FOR INSERT
  TO authenticated
  WITH CHECK (is_turn_list_collaborator(turn_list_id, (select auth.uid())));
