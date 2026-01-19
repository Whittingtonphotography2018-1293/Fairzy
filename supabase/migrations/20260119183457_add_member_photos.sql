/*
  # Add Member Photo Support

  ## Changes
  - Add `photo_url` column to `turn_list_members` table to store member profile photos
  - Column is optional and defaults to null
  
  ## Security
  - No RLS changes needed as existing policies cover this column
  - Photos will be stored in Supabase Storage with separate RLS policies
*/

ALTER TABLE turn_list_members 
  ADD COLUMN IF NOT EXISTS photo_url text DEFAULT null;
