-- Run once in Lovable Cloud > SQL editor to repair new-user signup.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_privacy_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_privacy_check
  CHECK (privacy IN ('private', 'friends', 'public', 'mixed'));

ALTER TABLE public.profiles
  ALTER COLUMN privacy SET DEFAULT 'mixed';

-- Verification: should return `mixed` and all four accepted values.
SELECT
  column_default AS privacy_default,
  pg_get_constraintdef(c.oid) AS privacy_constraint
FROM information_schema.columns i
JOIN pg_constraint c
  ON c.conrelid = 'public.profiles'::regclass
 AND c.conname = 'profiles_privacy_check'
WHERE i.table_schema = 'public'
  AND i.table_name = 'profiles'
  AND i.column_name = 'privacy';
