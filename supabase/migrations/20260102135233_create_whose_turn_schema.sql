/*
  # Whose Turn App - Initial Schema

  ## Tables Created
  
  ### turn_lists
  - `id` (uuid, primary key) - Unique identifier for each turn board
  - `name` (text) - Display name (e.g., "Dinner Picker", "Movie Night")
  - `category` (text) - Optional category/theme
  - `created_by` (uuid, foreign key to auth.users) - Board creator
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### turn_list_members
  - `id` (uuid, primary key) - Unique identifier
  - `turn_list_id` (uuid, foreign key) - Reference to turn_lists
  - `user_id` (uuid, foreign key to auth.users) - Member user
  - `display_name` (text) - Display name for this member
  - `position` (integer) - Position in rotation order
  - `joined_at` (timestamptz) - When they joined
  - `is_active` (boolean) - Whether they're active in rotation

  ### turn_history
  - `id` (uuid, primary key) - Unique identifier
  - `turn_list_id` (uuid, foreign key) - Reference to turn_lists
  - `user_id` (uuid, foreign key to auth.users) - Who took the turn
  - `turn_taken_at` (timestamptz) - When the turn was taken
  - `notes` (text) - Optional notes about the turn

  ## Security
  - RLS enabled on all tables
  - Users can read turn lists they're members of
  - Users can create their own turn lists
  - Users can update turn lists they created
  - Members can add turn history to lists they belong to
  - Only list creators can add/remove members
*/

-- Create turn_lists table
CREATE TABLE IF NOT EXISTS turn_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create turn_list_members table
CREATE TABLE IF NOT EXISTS turn_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_list_id uuid REFERENCES turn_lists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  position integer NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  UNIQUE(turn_list_id, user_id)
);

-- Create turn_history table
CREATE TABLE IF NOT EXISTS turn_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_list_id uuid REFERENCES turn_lists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  turn_taken_at timestamptz DEFAULT now() NOT NULL,
  notes text DEFAULT ''
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_turn_list_members_list ON turn_list_members(turn_list_id);
CREATE INDEX IF NOT EXISTS idx_turn_list_members_user ON turn_list_members(user_id);
CREATE INDEX IF NOT EXISTS idx_turn_history_list ON turn_history(turn_list_id);
CREATE INDEX IF NOT EXISTS idx_turn_history_taken_at ON turn_history(turn_taken_at DESC);

-- Enable RLS
ALTER TABLE turn_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE turn_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE turn_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for turn_lists

-- Users can view turn lists they're members of
CREATE POLICY "Users can view their turn lists"
  ON turn_lists FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM turn_list_members
      WHERE turn_list_members.turn_list_id = turn_lists.id
      AND turn_list_members.user_id = auth.uid()
      AND turn_list_members.is_active = true
    )
  );

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

-- RLS Policies for turn_list_members

-- Users can view members of turn lists they belong to
CREATE POLICY "Users can view turn list members"
  ON turn_list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_lists
      WHERE turn_lists.id = turn_list_members.turn_list_id
      AND (
        turn_lists.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM turn_list_members tlm
          WHERE tlm.turn_list_id = turn_lists.id
          AND tlm.user_id = auth.uid()
          AND tlm.is_active = true
        )
      )
    )
  );

-- Only list creators can add members
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

-- Only list creators can update members
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

-- Only list creators can remove members
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

-- RLS Policies for turn_history

-- Users can view history of turn lists they belong to
CREATE POLICY "Users can view turn history"
  ON turn_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM turn_list_members
      WHERE turn_list_members.turn_list_id = turn_history.turn_list_id
      AND turn_list_members.user_id = auth.uid()
      AND turn_list_members.is_active = true
    )
  );

-- Members can add turn history to lists they belong to
CREATE POLICY "Members can add turn history"
  ON turn_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turn_list_members
      WHERE turn_list_members.turn_list_id = turn_history.turn_list_id
      AND turn_list_members.user_id = auth.uid()
      AND turn_list_members.is_active = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_turn_lists_updated_at ON turn_lists;
CREATE TRIGGER update_turn_lists_updated_at
  BEFORE UPDATE ON turn_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();