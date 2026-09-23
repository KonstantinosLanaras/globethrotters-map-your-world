-- Run once in Lovable Cloud > SQL editor.
-- Adds signup-source tracking and explicit outreach consent to profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent_version text,
  ADD COLUMN IF NOT EXISTS signup_source text NOT NULL DEFAULT 'organic';

COMMENT ON COLUMN public.profiles.marketing_opt_in IS
  'True only when the user explicitly opts in to product outreach.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, display_name, marketing_opt_in, marketing_consent_at,
    marketing_consent_version, signup_source
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true',
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true'
      THEN COALESCE((NEW.raw_user_meta_data ->> 'marketing_consent_at')::timestamptz, now())
      ELSE NULL
    END,
    NEW.raw_user_meta_data ->> 'marketing_consent_version',
    COALESCE(NEW.raw_user_meta_data ->> 'signup_source', 'organic')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_signup_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    marketing_opt_in = COALESCE(NEW.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true',
    marketing_consent_at = CASE
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true'
      THEN COALESCE((NEW.raw_user_meta_data ->> 'marketing_consent_at')::timestamptz, now())
      ELSE NULL
    END,
    marketing_consent_version = NEW.raw_user_meta_data ->> 'marketing_consent_version',
    signup_source = COALESCE(NEW.raw_user_meta_data ->> 'signup_source', signup_source),
    updated_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_signup_metadata_updated ON auth.users;
CREATE TRIGGER on_auth_user_signup_metadata_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.sync_profile_signup_metadata();

-- Owner-only verification query for the Lovable SQL editor.
SELECT
  count(*) AS total_signups,
  count(*) FILTER (WHERE marketing_opt_in) AS outreach_opt_ins
FROM public.profiles;

-- To list only people who explicitly agreed to product outreach, run this
-- separately in the SQL editor when needed:
-- SELECT
--   u.email,
--   p.display_name,
--   p.signup_source,
--   p.marketing_consent_at,
--   p.created_at AS signed_up_at
-- FROM auth.users u
-- JOIN public.profiles p ON p.user_id = u.id
-- WHERE p.marketing_opt_in = true
-- ORDER BY p.created_at DESC;
