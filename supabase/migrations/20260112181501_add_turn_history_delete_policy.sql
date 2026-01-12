/*
  # Add DELETE Policy for Turn History
  
  ## Changes
  - Add DELETE policy for turn_history table to allow CASCADE deletes when turn lists are deleted
  
  ## Security
  - Only list creators can delete turn history (via CASCADE when deleting turn lists)
  - Maintains data integrity and security
*/

-- Add DELETE policy for turn_history
-- This allows CASCADE deletes to work when a turn_list is deleted
CREATE POLICY "List creators can delete turn history"
  ON turn_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_history.turn_list_id
      AND turn_lists.created_by = auth.uid()
    )
  );
