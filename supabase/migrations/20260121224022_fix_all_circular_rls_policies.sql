/*
  # Fix All Circular RLS Policy References

  ## Problem
  Multiple tables have circular policy dependencies:
  - turn_list_collaborators checks itself (infinite recursion)
  - turn_list_members has duplicate policies checking turn_list_collaborators
  - turn_history has duplicate policies checking turn_list_collaborators
  - turn_list_invitations checks turn_list_collaborators
  - All create circular dependency loops with turn_lists

  ## Solution
  Simplify ALL policies to remove circular dependencies:
  - Use only created_by checks where possible
  - Remove all duplicate policies
  - Keep access control simple and direct

  ## Security
  - Maintains proper access control
  - All existing data remains accessible
  - Only list creators can manage their lists
*/

-- =====================================================
-- TURN_LIST_COLLABORATORS: Fix self-referencing policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view collaborators" ON turn_list_collaborators;
DROP POLICY IF EXISTS "List creators can add collaborators" ON turn_list_collaborators;
DROP POLICY IF EXISTS "List creators can remove collaborators" ON turn_list_collaborators;
DROP POLICY IF EXISTS "Users can remove themselves" ON turn_list_collaborators;

-- Simple non-recursive policies
CREATE POLICY "View collaborators simple"
  ON turn_list_collaborators FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_collaborators.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Add collaborators simple"
  ON turn_list_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_collaborators.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Remove collaborators simple"
  ON turn_list_collaborators FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_collaborators.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

-- =====================================================
-- TURN_LIST_MEMBERS: Remove duplicate policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view members of accessible turn lists" ON turn_list_members;
DROP POLICY IF EXISTS "Users can insert members to accessible turn lists" ON turn_list_members;
DROP POLICY IF EXISTS "Users can update members of accessible turn lists" ON turn_list_members;
DROP POLICY IF EXISTS "Users can delete members from accessible turn lists" ON turn_list_members;

-- Keep only the simple creator-based policies
-- (The old "List creators can..." policies remain)

-- =====================================================
-- TURN_HISTORY: Remove duplicate policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view history of accessible turn lists" ON turn_history;
DROP POLICY IF EXISTS "Users can insert history to accessible turn lists" ON turn_history;

-- Keep only the simple member-based policies
-- (The old policies remain: "Users can view turn history", "Members can add turn history", "List creators can delete turn history")

-- =====================================================
-- TURN_LIST_INVITATIONS: Simplify to avoid circular refs
-- =====================================================

DROP POLICY IF EXISTS "List owners and collaborators can create invitations" ON turn_list_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON turn_list_invitations;
DROP POLICY IF EXISTS "Recipients can update invitation status" ON turn_list_invitations;
DROP POLICY IF EXISTS "Invitation creators can delete invitations" ON turn_list_invitations;

-- Simple invitation policies without circular dependencies
CREATE POLICY "Create invitations simple"
  ON turn_list_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_invitations.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "View own invitations"
  ON turn_list_invitations FOR SELECT
  TO authenticated
  USING (
    invited_by = (select auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
  );

CREATE POLICY "Update invitation status simple"
  ON turn_list_invitations FOR UPDATE
  TO authenticated
  USING (invited_email = (SELECT email FROM auth.users WHERE id = (select auth.uid())))
  WITH CHECK (invited_email = (SELECT email FROM auth.users WHERE id = (select auth.uid())));

CREATE POLICY "Delete invitations simple"
  ON turn_list_invitations FOR DELETE
  TO authenticated
  USING (
    invited_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_invitations.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );
