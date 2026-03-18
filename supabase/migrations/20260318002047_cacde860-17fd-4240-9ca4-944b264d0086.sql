
-- Allow users to view places of public-profile users
CREATE POLICY "Users can view public places"
ON public.places FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = places.user_id
    AND profiles.privacy = 'public'
  )
);

-- Allow users to view places of users they're connected to (when profile is 'friends')
CREATE POLICY "Connected users can view friend places"
ON public.places FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = places.user_id
    AND profiles.privacy = 'friends'
  )
  AND
  EXISTS (
    SELECT 1 FROM public.followers
    WHERE followers.following_id = places.user_id
    AND followers.follower_id = auth.uid()
    AND followers.status = 'active'
  )
);

-- Allow authenticated users to search profiles by username/display_name
CREATE POLICY "Authenticated users can search profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
