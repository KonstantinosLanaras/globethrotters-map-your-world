
-- Add privacy column to places table
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Create experiences table
CREATE TABLE public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  caption text,
  city text,
  country text,
  category text NOT NULL DEFAULT 'general',
  experience_date date,
  visibility text NOT NULL DEFAULT 'public',
  tags text[] DEFAULT '{}',
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own experiences" ON public.experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own experiences" ON public.experiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own experiences" ON public.experiences FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own experiences" ON public.experiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public experiences" ON public.experiences FOR SELECT USING (visibility = 'public');

-- Create experience attachments table
CREATE TABLE public.experience_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  attachment_type text NOT NULL DEFAULT 'link',
  url text NOT NULL,
  title text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experience_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attachments" ON public.experience_attachments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.experiences WHERE id = experience_attachments.experience_id AND user_id = auth.uid())
);
CREATE POLICY "Anyone can view public attachments" ON public.experience_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.experiences WHERE id = experience_attachments.experience_id AND visibility = 'public')
);

-- Create followers table
CREATE TABLE public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  is_close_friend boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can follow" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.followers FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "Users can update own follows" ON public.followers FOR UPDATE USING (auth.uid() = follower_id);
CREATE POLICY "Users can view follows" ON public.followers FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Add bio, home_base, username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_base text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dream_destinations text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel_style text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS next_trip text DEFAULT '';

-- Create trigger for experiences updated_at
CREATE TRIGGER update_experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
