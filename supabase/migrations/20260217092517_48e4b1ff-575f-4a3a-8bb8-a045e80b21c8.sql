
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  personality TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}',
  privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('private', 'friends', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public profiles" ON public.profiles FOR SELECT USING (privacy = 'public');
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Places table
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  type TEXT NOT NULL DEFAULT 'visited' CHECK (type IN ('visited', 'wishlist')),
  tags TEXT[] DEFAULT '{}',
  rating INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  date_visited DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own places" ON public.places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own places" ON public.places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own places" ON public.places FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own places" ON public.places FOR DELETE USING (auth.uid() = user_id);

-- Lists table
CREATE TABLE public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '📍',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lists" ON public.lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON public.lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON public.lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON public.lists FOR DELETE USING (auth.uid() = user_id);

-- List-places junction
CREATE TABLE public.list_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, place_id)
);

ALTER TABLE public.list_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own list_places" ON public.list_places FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.lists WHERE lists.id = list_places.list_id AND lists.user_id = auth.uid()));
CREATE POLICY "Users can insert own list_places" ON public.list_places FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.lists WHERE lists.id = list_places.list_id AND lists.user_id = auth.uid()));
CREATE POLICY "Users can delete own list_places" ON public.list_places FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.lists WHERE lists.id = list_places.list_id AND lists.user_id = auth.uid()));

-- Photos table (URLs only, files stored in storage)
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos" ON public.photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own photos" ON public.photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON public.photos FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON public.places FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY "Users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view public photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
