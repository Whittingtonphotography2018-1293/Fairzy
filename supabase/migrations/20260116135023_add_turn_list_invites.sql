/*
  # Add Turn List Invites System

  1. New Tables
    - `turn_list_invites`
      - `id` (uuid, primary key)
      - `turn_list_id` (uuid, foreign key to turn_lists)
      - `invited_by` (uuid, foreign key to auth.users) - Who sent the invite
      - `invited_email` (text) - Email of the invited user
      - `invited_user_id` (uuid, nullable, foreign key to auth.users) - User ID if they're already registered
      - `status` (text) - 'pending', 'accepted', 'declined'
      - `created_at` (timestamptz)
      - `responded_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on invites table
    - List members can view invites for their lists
    - List members can create invites
    - Invited users can view their pending invites
    - Invited users can update their invite status (accept/decline)

  3. Changes
    - Allow invited users to join turn lists when accepting invites
    - Update member insertion policy to allow self-adding when invite is accepted
*/

-- Create turn_list_invites table
CREATE TABLE IF NOT EXISTS turn_list_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_list_id uuid REFERENCES turn_lists(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  responded_at timestamptz,
  CHECK (status IN ('pending', 'accepted', 'declined'))
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_turn_list_invites_email ON turn_list_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_turn_list_invites_user ON turn_list_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_turn_list_invites_list ON turn_list_invites(turn_list_id);
CREATE INDEX IF NOT EXISTS idx_turn_list_invites_status ON turn_list_invites(status);

-- Enable RLS
ALTER TABLE turn_list_invites ENABLE ROW LEVEL SECURITY;

-- List members can view invites for their lists
CREATE POLICY "Members can view turn list invites"
  ON turn_list_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_members
      WHERE turn_list_members.turn_list_id = turn_list_invites.turn_list_id
      AND turn_list_members.user_id = auth.uid()
      AND turn_list_members.is_active = true
    )
    OR invited_user_id = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- List members can create invites
CREATE POLICY "Members can create invites"
  ON turn_list_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_list_members
      WHERE turn_list_members.turn_list_id = turn_list_invites.turn_list_id
      AND turn_list_members.user_id = auth.uid()
      AND turn_list_members.is_active = true
    )
    AND invited_by = auth.uid()
  );

-- Invited users can update their invite status
CREATE POLICY "Invited users can respond to invites"
  ON turn_list_invites FOR UPDATE
  TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invited_user_id = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Update member insertion policy to allow self-adding when accepting invite
DROP POLICY IF EXISTS "List creators can add members" ON turn_list_members;

CREATE POLICY "Members can be added by creator or via invite"
  ON turn_list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND turn_lists.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM turn_list_invites
      WHERE turn_list_invites.turn_list_id = turn_list_members.turn_list_id
      AND turn_list_invites.status = 'accepted'
      AND (
        turn_list_invites.invited_user_id = auth.uid()
        OR turn_list_invites.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      AND turn_list_members.user_id = auth.uid()
    )
  );

-- Function to automatically set invited_user_id when user with that email exists
CREATE OR REPLACE FUNCTION set_invited_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invited_user_id IS NULL THEN
    SELECT id INTO NEW.invited_user_id
    FROM auth.users
    WHERE email = NEW.invited_email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set invited_user_id on insert
DROP TRIGGER IF EXISTS set_invited_user_id_trigger ON turn_list_invites;
CREATE TRIGGER set_invited_user_id_trigger
  BEFORE INSERT ON turn_list_invites
  FOR EACH ROW
  EXECUTE FUNCTION set_invited_user_id();