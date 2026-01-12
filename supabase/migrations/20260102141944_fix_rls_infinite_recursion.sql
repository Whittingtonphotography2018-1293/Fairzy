/*
  # Fix RLS Infinite Recursion

  ## Changes
  - Drop existing policies that cause circular references
  - Create simplified policies that avoid self-referencing queries
  - Ensure users can still access their data securely

  ## Security
  - Maintain data access control
  - Prevent infinite recursion in policy checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view turn list members" ON turn_list_members;
DROP POLICY IF EXISTS "List creators can add members" ON turn_list_members;
DROP POLICY IF EXISTS "List creators can update members" ON turn_list_members;
DROP POLICY IF EXISTS "List creators can remove members" ON turn_list_members;

DROP POLICY IF EXISTS "Users can view their turn lists" ON turn_lists;

-- Recreate turn_lists policies (these are fine, just being explicit)
DROP POLICY IF EXISTS "Users can create turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can update own turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can delete own turn lists" ON turn_lists;

-- Simple policy: users can view turn lists they created
CREATE POLICY "Users can view turn lists they created"
  ON turn_lists FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Users can create turn lists
CREATE POLICY "Users can create turn lists"
  ON turn_lists FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update turn lists they created
CREATE POLICY "Users can update own turn lists"
  ON turn_lists FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete turn lists they created
CREATE POLICY "Users can delete own turn lists"
  ON turn_lists FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Simplified turn_list_members policies without circular references

-- Users can view members if they created the parent turn list
CREATE POLICY "Users can view members of their lists"
  ON turn_list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = auth.uid()
    )
  );

-- List creators can add members
CREATE POLICY "List creators can add members"
  ON turn_list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = auth.uid()
    )
  );

-- List creators can update members
CREATE POLICY "List creators can update members"
  ON turn_list_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = auth.uid()
    )
  );

-- List creators can remove members
CREATE POLICY "List creators can remove members"
  ON turn_list_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = auth.uid()
    )
  );