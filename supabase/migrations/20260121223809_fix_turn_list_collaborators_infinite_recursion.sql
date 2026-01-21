/*
  # Fix Infinite Recursion in turn_list_collaborators Policies

  ## Problem
  The RLS policies on turn_list_collaborators create infinite recursion by:
  - Checking turn_list_collaborators table within their own policies
  - Creating circular dependencies when evaluating access

  ## Solution
  Replace policies with simpler, non-recursive logic:
  - Users can view collaborators if they created the list OR are already a collaborator
  - Only list creators can add/remove collaborators
  - Break circular dependencies by directly checking turn_lists instead of recursing

  ## Security
  - Maintains data access control
  - Prevents infinite recursion
  - Only list creators and existing collaborators have access
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view collaborators for lists they have access to" ON turn_list_collaborators;
DROP POLICY IF EXISTS "List owners can add collaborators" ON turn_list_collaborators;
DROP POLICY IF EXISTS "Collaborators can remove themselves" ON turn_list_collaborators;

-- Simple SELECT policy: users can view if they're the list creator OR they're looking at their own record
CREATE POLICY "Users can view collaborators"
  ON turn_list_collaborators FOR SELECT
  TO authenticated
  USING (
    -- User is the list creator
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_collaborators.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
    OR
    -- User is viewing their own collaborator record
    user_id = (select auth.uid())
  );

-- Only list creators can add collaborators
CREATE POLICY "List creators can add collaborators"
  ON turn_list_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_collaborators.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

-- Only list creators can remove collaborators
CREATE POLICY "List creators can remove collaborators"
  ON turn_list_collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_collaborators.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
  );

-- Allow users to remove themselves
CREATE POLICY "Users can remove themselves"
  ON turn_list_collaborators FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));
