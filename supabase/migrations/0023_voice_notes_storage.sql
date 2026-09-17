-- Create private voice-notes storage bucket (0023)
-- Audio recordings stored privately, served via signed URLs only

DO $$
BEGIN
  -- 1. Insert bucket if storage schema exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('voice-notes', 'voice-notes', false, 52428800, ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'])
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 2. Secure storage.objects if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "org_members_read_voice_notes" ON storage.objects;
    CREATE POLICY "org_members_read_voice_notes" ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'voice-notes'
        AND (
          (storage.foldername(name))[1] = (public.current_org_id())::text
          OR auth.uid() = storage.objects.owner
        )
      );

    DROP POLICY IF EXISTS "org_members_insert_voice_notes" ON storage.objects;
    CREATE POLICY "org_members_insert_voice_notes" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'voice-notes'
        AND (
          (storage.foldername(name))[1] = (public.current_org_id())::text
          OR auth.uid() IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "org_members_update_own_voice_notes" ON storage.objects;
    CREATE POLICY "org_members_update_own_voice_notes" ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'voice-notes'
        AND auth.uid() = storage.objects.owner
      );

    DROP POLICY IF EXISTS "org_members_delete_own_voice_notes" ON storage.objects;
    CREATE POLICY "org_members_delete_own_voice_notes" ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'voice-notes'
        AND auth.uid() = storage.objects.owner
      );
  END IF;
END $$;