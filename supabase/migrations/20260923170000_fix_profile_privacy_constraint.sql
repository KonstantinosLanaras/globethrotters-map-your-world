-- Repair new-user profile creation.
-- The profile default was changed to `mixed` by an earlier migration while the
-- original check constraint still rejected that value.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_privacy_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_privacy_check
  CHECK (privacy IN ('private', 'friends', 'public', 'mixed'));

ALTER TABLE public.profiles
  ALTER COLUMN privacy SET DEFAULT 'mixed';
