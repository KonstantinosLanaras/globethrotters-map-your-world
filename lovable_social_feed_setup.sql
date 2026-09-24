-- Globethrotters social-feed visibility repair
-- Run once in Lovable > More > Cloud > SQL editor.
-- Safe to run again: policies are replaced by name.

DROP POLICY IF EXISTS "Users can update own follows"
  ON public.followers;
DROP POLICY IF EXISTS "Users can update active connection settings"
  ON public.followers;
CREATE POLICY "Users can update active connection settings"
  ON public.followers FOR UPDATE
  TO authenticated
  USING (auth.uid() = follower_id AND status = 'active')
  WITH CHECK (auth.uid() = follower_id AND status = 'active');

DROP POLICY IF EXISTS "Recipients can accept connection requests"
  ON public.followers;
CREATE POLICY "Recipients can accept connection requests"
  ON public.followers FOR UPDATE
  TO authenticated
  USING (auth.uid() = following_id AND status = 'pending')
  WITH CHECK (auth.uid() = following_id AND status = 'active');

DROP POLICY IF EXISTS "Users can remove received connections"
  ON public.followers;
CREATE POLICY "Users can remove received connections"
  ON public.followers FOR DELETE
  TO authenticated
  USING (auth.uid() = following_id);

DROP POLICY IF EXISTS "Connections can view shared experiences"
  ON public.experiences;
CREATE POLICY "Connections can view shared experiences"
  ON public.experiences FOR SELECT
  TO authenticated
  USING (
    visibility = 'followers'
    AND EXISTS (
      SELECT 1
      FROM public.followers AS connection
      WHERE connection.follower_id = auth.uid()
        AND connection.following_id = experiences.user_id
        AND connection.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Close friends can view shared experiences"
  ON public.experiences;
CREATE POLICY "Close friends can view shared experiences"
  ON public.experiences FOR SELECT
  TO authenticated
  USING (
    visibility = 'close_friends'
    AND EXISTS (
      SELECT 1
      FROM public.followers AS connection
      WHERE connection.follower_id = experiences.user_id
        AND connection.following_id = auth.uid()
        AND connection.status = 'active'
        AND connection.is_close_friend
    )
  );

DROP POLICY IF EXISTS "Connections can view shared attachments"
  ON public.experience_attachments;
CREATE POLICY "Connections can view shared attachments"
  ON public.experience_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.experiences AS experience
      WHERE experience.id = experience_attachments.experience_id
        AND (
          (
            experience.visibility = 'followers'
            AND EXISTS (
              SELECT 1
              FROM public.followers AS connection
              WHERE connection.follower_id = auth.uid()
                AND connection.following_id = experience.user_id
                AND connection.status = 'active'
            )
          )
          OR (
            experience.visibility = 'close_friends'
            AND EXISTS (
              SELECT 1
              FROM public.followers AS connection
              WHERE connection.follower_id = experience.user_id
                AND connection.following_id = auth.uid()
                AND connection.status = 'active'
                AND connection.is_close_friend
            )
          )
        )
    )
  );

SELECT
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('followers', 'experiences', 'experience_attachments')
  AND policyname IN (
    'Connections can view shared experiences',
    'Close friends can view shared experiences',
    'Connections can view shared attachments',
    'Users can update active connection settings',
    'Recipients can accept connection requests',
    'Users can remove received connections'
  )
ORDER BY tablename, policyname;
