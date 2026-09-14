-- Create private voice-notes storage bucket (0023)
-- Audio recordings stored privately, served via signed URLs only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-notes', 'voice-notes', false, 52428800, ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: org members can read their own org's voice notes
CREATE POLICY "org_members_read_voice_notes" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = (storage.objects.name::text || '')::uuid IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM org_members WHERE org_id = o.id AND user_id = auth.uid())
        OR o.created_by = auth.uid()
      )
    )
  );

-- Policy: org members can insert their own org's voice notes
CREATE POLICY "org_members_insert_voice_notes" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND auth.uid() IS NOT NULL
  );

-- Policy: org members can update/delete their own voice notes
CREATE POLICY "org_members_update_own_voice_notes" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND auth.uid() = storage.objects.created_by
  );

CREATE POLICY "org_members_delete_own_voice_notes" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND auth.uid() = storage.objects.created_by
  );