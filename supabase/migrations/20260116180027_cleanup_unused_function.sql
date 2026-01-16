/*
  # Cleanup Unused Functions

  ## Changes
  - Drop `set_invited_user_id` function that is no longer used after invite system removal

  ## Security
  - Removes unused code that had a mutable search_path security issue
  - Improves overall database security posture
*/

DROP FUNCTION IF EXISTS set_invited_user_id();
