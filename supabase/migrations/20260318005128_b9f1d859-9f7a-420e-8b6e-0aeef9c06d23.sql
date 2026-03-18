
-- Add personal rating to experiences
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS rating integer DEFAULT 0;

-- Create storage bucket for experience photos
INSERT INTO storage.buckets (id, name, public) VALUES ('experience-photos', 'experience-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload experience photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'experience-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view experience photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'experience-photos');

CREATE POLICY "Users can delete own experience photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'experience-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
