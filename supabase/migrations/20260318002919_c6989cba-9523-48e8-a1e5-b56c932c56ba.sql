
-- Place ratings table
CREATE TABLE public.place_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  tags text[] DEFAULT '{}'::text[],
  safety_rating integer CHECK (safety_rating >= 1 AND safety_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),
  accessibility_rating integer CHECK (accessibility_rating >= 1 AND accessibility_rating <= 5),
  crowd_rating integer CHECK (crowd_rating >= 1 AND crowd_rating <= 5),
  family_rating integer CHECK (family_rating >= 1 AND family_rating <= 5),
  comment text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)
);

-- RLS
ALTER TABLE public.place_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own ratings" ON public.place_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" ON public.place_ratings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view all ratings" ON public.place_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can delete own ratings" ON public.place_ratings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
