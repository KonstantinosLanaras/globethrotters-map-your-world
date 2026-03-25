
-- Journey members table (friends added to a trip)
CREATE TABLE public.journey_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(journey_id, user_id)
);

ALTER TABLE public.journey_members ENABLE ROW LEVEL SECURITY;

-- Owner can manage members
CREATE POLICY "Journey owner can manage members"
ON public.journey_members FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_members.journey_id AND user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_members.journey_id AND user_id = auth.uid())
);

-- Members can view their own membership
CREATE POLICY "Members can view own membership"
ON public.journey_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can accept/decline their own invites
CREATE POLICY "Users can update own membership"
ON public.journey_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Journey join requests table
CREATE TABLE public.journey_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(journey_id, user_id)
);

ALTER TABLE public.journey_join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can request to join
CREATE POLICY "Users can insert own join requests"
ON public.journey_join_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Requesters can view own requests
CREATE POLICY "Users can view own join requests"
ON public.journey_join_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Journey owner can view and manage requests
CREATE POLICY "Journey owner can manage join requests"
ON public.journey_join_requests FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_join_requests.journey_id AND user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_join_requests.journey_id AND user_id = auth.uid())
);

-- Add open_to_join flag to journeys
ALTER TABLE public.journeys ADD COLUMN IF NOT EXISTS open_to_join BOOLEAN NOT NULL DEFAULT false;

-- Add conversation_id to journeys for trip chat
ALTER TABLE public.journeys ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id);

-- Allow journey members to view the journey
CREATE POLICY "Members can view joined journeys"
ON public.journeys FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.journey_members WHERE journey_id = journeys.id AND user_id = auth.uid() AND status = 'accepted')
);

-- Allow members to add experiences to journeys they belong to
CREATE POLICY "Members can insert journey experiences"
ON public.journey_experiences FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.journey_members WHERE journey_id = journey_experiences.journey_id AND user_id = auth.uid() AND status = 'accepted')
);

-- Allow members to view journey experiences
CREATE POLICY "Members can view journey experiences"
ON public.journey_experiences FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.journey_members WHERE journey_id = journey_experiences.journey_id AND user_id = auth.uid() AND status = 'accepted')
);

-- Allow members to create trip posts
CREATE POLICY "Members can create trip posts"
ON public.trip_posts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.journey_members WHERE journey_id = trip_posts.journey_id AND user_id = auth.uid() AND status = 'accepted')
);

-- Allow members to view trip posts in their journeys
CREATE POLICY "Members can view journey trip posts"
ON public.trip_posts FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.journey_members WHERE journey_id = trip_posts.journey_id AND user_id = auth.uid() AND status = 'accepted')
);
