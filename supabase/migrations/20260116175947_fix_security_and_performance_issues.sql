/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Indexes on Foreign Keys
  Indexes improve query performance for foreign key lookups:
    - `turn_history.member_id` - for member-based queries
    - `turn_history.user_id` - for user-based queries
    - `turn_lists.created_by` - for creator-based queries

  ## 2. Remove Unused Indexes
  Cleanup indexes that are not being used:
    - `idx_turn_list_members_user` - unused index
    - `idx_turn_history_taken_at` - unused index
    - `idx_feedback_created_at` - unused index

  ## 3. Optimize RLS Policies for Performance
  Replace `auth.uid()` with `(select auth.uid())` to prevent re-evaluation for each row.
  This dramatically improves query performance at scale.
  
  Tables affected:
    - `turn_lists` - 4 policies updated
    - `turn_list_members` - 4 policies updated
    - `turn_history` - 3 policies updated
    - `feedback` - 2 policies updated

  ## 4. Fix Function Search Paths
  Add proper search_path settings to functions for security:
    - `update_updated_at_column` - updated with search_path

  ## Security
  All changes maintain existing security model while improving performance
*/

-- =====================================================
-- SECTION 1: Add Missing Foreign Key Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_turn_history_member_id ON turn_history(member_id);
CREATE INDEX IF NOT EXISTS idx_turn_history_user_id ON turn_history(user_id);
CREATE INDEX IF NOT EXISTS idx_turn_lists_created_by ON turn_lists(created_by);

-- =====================================================
-- SECTION 2: Drop Unused Indexes
-- =====================================================

DROP INDEX IF EXISTS idx_turn_list_members_user;
DROP INDEX IF EXISTS idx_turn_history_taken_at;
DROP INDEX IF EXISTS idx_feedback_created_at;

-- =====================================================
-- SECTION 3: Optimize RLS Policies
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view turn lists they created" ON turn_lists;
DROP POLICY IF EXISTS "Users can create turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can update own turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can delete own turn lists" ON turn_lists;

DROP POLICY IF EXISTS "Users can view members of their lists" ON turn_list_members;
DROP POLICY IF EXISTS "List creators can add members" ON turn_list_members;
DROP POLICY IF EXISTS "List creators can update members" ON turn_list_members;
DROP POLICY IF EXISTS "List creators can remove members" ON turn_list_members;

DROP POLICY IF EXISTS "Users can view turn history" ON turn_history;
DROP POLICY IF EXISTS "Members can add turn history" ON turn_history;
DROP POLICY IF EXISTS "List creators can delete turn history" ON turn_history;

DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;

-- Recreate turn_lists policies with optimized auth.uid()
CREATE POLICY "Users can view turn lists they created"
  ON turn_lists FOR SELECT
  TO authenticated
  USING (created_by = (select auth.uid()));

CREATE POLICY "Users can create turn lists"
  ON turn_lists FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update own turn lists"
  ON turn_lists FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete own turn lists"
  ON turn_lists FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- Recreate turn_list_members policies with optimized auth.uid()
CREATE POLICY "Users can view members of their lists"
  ON turn_list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "List creators can add members"
  ON turn_list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "List creators can update members"
  ON turn_list_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "List creators can remove members"
  ON turn_list_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

-- Recreate turn_history policies with optimized auth.uid()
CREATE POLICY "Users can view turn history"
  ON turn_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_members
      WHERE turn_list_members.turn_list_id = turn_history.turn_list_id
      AND turn_list_members.user_id = (select auth.uid())
      AND turn_list_members.is_active = true
    )
  );

CREATE POLICY "Members can add turn history"
  ON turn_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_list_members
      WHERE turn_list_members.turn_list_id = turn_history.turn_list_id
      AND turn_list_members.user_id = (select auth.uid())
      AND turn_list_members.is_active = true
    )
  );

CREATE POLICY "List creators can delete turn history"
  ON turn_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_history.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

-- Recreate feedback policies with optimized auth.uid()
CREATE POLICY "Users can insert own feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- SECTION 4: Fix Function Search Paths
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
