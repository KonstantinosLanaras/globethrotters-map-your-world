DROP POLICY IF EXISTS "Connected users can view friend places" ON public.places;

CREATE POLICY "Anyone can view mixed-privacy places"
  ON public.places FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = places.user_id
        AND profiles.privacy = 'mixed'
    )
  );