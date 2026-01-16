/*
  # Remove turn list invites feature

  1. Changes
    - Drop `turn_list_invites` table and all related policies
    - Clean up any RLS policies associated with the invites table

  2. Notes
    - This reverses the turn_list_invites migration
    - Removes all invite-related database structures
*/

DROP TABLE IF EXISTS turn_list_invites CASCADE;