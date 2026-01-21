/*
  # Allow Collaborators to Access Turn Lists

  ## Changes
  Add additional SELECT and UPDATE policies for turn_lists to allow collaborators access:
  - Collaborators can view turn lists they've been added to
  - Collaborators can update turn lists (but not delete them)
  - Keep existing creator policies intact

  Also update policies for related tables:
  - turn_list_members: Collaborators can view/manage members
  - turn_history: Collaborators can view and add history

  ## Security
  - Only users explicitly added as collaborators get access
  - Deletion remains restricted to list creators only
  - All policies check authenticated users only
*/

-- =====================================================
-- TURN_LISTS: Add policies for collaborators
-- =====================================================

-- Collaborators can view turn lists they have access to
CREATE POLICY "Collaborators can view turn lists"
  ON turn_lists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_lists.id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );

-- Collaborators can update turn lists they have access to
CREATE POLICY "Collaborators can update turn lists"
  ON turn_lists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_lists.id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_lists.id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- TURN_LIST_MEMBERS: Add policies for collaborators
-- =====================================================

-- Collaborators can view members of lists they have access to
CREATE POLICY "Collaborators can view members"
  ON turn_list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_list_members.turn_list_id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );

-- Collaborators can add members to lists they have access to
CREATE POLICY "Collaborators can add members"
  ON turn_list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_list_members.turn_list_id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );

-- Collaborators can update members of lists they have access to
CREATE POLICY "Collaborators can update members"
  ON turn_list_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_list_members.turn_list_id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_list_members.turn_list_id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );

-- Collaborators can remove members from lists they have access to
CREATE POLICY "Collaborators can remove members"
  ON turn_list_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_list_members.turn_list_id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- TURN_HISTORY: Add policies for collaborators
-- =====================================================

-- Collaborators can view turn history
CREATE POLICY "Collaborators can view turn history"
  ON turn_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_history.turn_list_id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );

-- Collaborators can add turn history
CREATE POLICY "Collaborators can add turn history"
  ON turn_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_list_collaborators
      WHERE turn_list_collaborators.turn_list_id = turn_history.turn_list_id
      AND turn_list_collaborators.user_id = (select auth.uid())
    )
  );
