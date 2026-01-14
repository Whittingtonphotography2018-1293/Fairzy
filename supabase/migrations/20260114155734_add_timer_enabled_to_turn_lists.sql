/*
  # Add Timer Feature Toggle

  1. Changes
    - Add `timer_enabled` column to `turn_lists` table
    - Defaults to false (timer hidden by default)
    - Allows users to opt-in to timer feature per list

  2. Security
    - No RLS changes needed
    - Column inherits existing table permissions
*/

-- Add timer_enabled column to turn_lists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turn_lists' AND column_name = 'timer_enabled'
  ) THEN
    ALTER TABLE turn_lists ADD COLUMN timer_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;