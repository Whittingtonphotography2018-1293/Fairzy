/*
  # Create Storage Bucket for Member Photos

  ## Changes
  1. Create 'member-photos' storage bucket
  2. Set up RLS policies for secure photo uploads and access
  
  ## Security
  - Users can upload photos (authenticated only)
  - Users can view photos (authenticated only)
  - Users can update their own photos
  - Users can delete their own photos
*/

-- Create the storage bucket for member photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload member photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'member-photos');

-- Allow authenticated users to view photos
CREATE POLICY "Authenticated users can view member photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'member-photos');

-- Allow users to update their uploaded photos
CREATE POLICY "Users can update their member photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'member-photos' AND (select auth.uid()) = owner);

-- Allow users to delete their uploaded photos
CREATE POLICY "Users can delete their member photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'member-photos' AND (select auth.uid()) = owner);
