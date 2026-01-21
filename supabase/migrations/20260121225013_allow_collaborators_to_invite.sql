/*
  # Allow Collaborators to Send Invitations

  ## Changes
  Update turn_list_invitations policies to allow collaborators to send invitations:
  - Collaborators can create invitations for lists they have access to
  - Uses security definer function to avoid circular RLS dependencies

  ## Security
  - Only list creators and collaborators can send invitations
  - Uses security definer function for safe RLS bypass
*/

-- Drop old policy that only allows creators
DROP POLICY IF EXISTS "Create invitations simple" ON turn_list_invitations;

-- Allow both creators and collaborators to send invitations
CREATE POLICY "Creators and collaborators can create invitations"
  ON turn_list_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_invitations.turn_list_id
      AND turn_lists.created_by = (select auth.uid())
    )
    OR is_turn_list_collaborator(turn_list_id, (select auth.uid()))
  );
