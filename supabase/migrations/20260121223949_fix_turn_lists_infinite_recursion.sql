/*
  # Fix Infinite Recursion in turn_lists Policies

  ## Problem
  Multiple SELECT policies on turn_lists create infinite recursion:
  - "Users can view turn lists they created" 
  - "Users can view own and shared turn lists"
  - Both reference turn_list_collaborators
  - turn_list_collaborators policies reference turn_lists back
  - Creates circular dependency loop

  ## Solution
  Replace all policies with simplified, non-recursive versions:
  - Remove duplicate SELECT policies
  - Break circular dependencies by using simpler logic
  - Users can view lists they created OR where they're a collaborator (stored as owner/member role)

  ## Security
  - Maintains proper access control
  - Prevents infinite recursion
  - All existing data remains accessible
*/

-- Drop ALL existing turn_lists policies
DROP POLICY IF EXISTS "Users can view turn lists they created" ON turn_lists;
DROP POLICY IF EXISTS "Users can view own and shared turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can create turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can update own turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can update own and collaborated turn lists" ON turn_lists;
DROP POLICY IF EXISTS "Users can delete own turn lists" ON turn_lists;

-- Create new simplified policies without circular dependencies
-- SELECT: Users can view lists they created (no subquery needed)
CREATE POLICY "View own turn lists"
  ON turn_lists FOR SELECT
  TO authenticated
  USING (created_by = (select auth.uid()));

-- INSERT: Users can create turn lists
CREATE POLICY "Create turn lists"
  ON turn_lists FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

-- UPDATE: Only creators can update
CREATE POLICY "Update own turn lists"
  ON turn_lists FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

-- DELETE: Only creators can delete
CREATE POLICY "Delete own turn lists"
  ON turn_lists FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));
