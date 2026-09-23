#!/usr/bin/env bash
set -euo pipefail

project_ref="${SUPABASE_PROJECT_REF:-qghawmrtwkchpdqthaof}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required: https://supabase.com/docs/guides/local-development/cli/getting-started"
  exit 1
fi

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in your shell}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD in your shell}"

echo "Linking Supabase project ${project_ref}"
supabase link --project-ref "$project_ref" --password "$SUPABASE_DB_PASSWORD"

echo "Applying catalogue migrations"
supabase db push --password "$SUPABASE_DB_PASSWORD"

if [[ -n "${GOOGLE_PLACES_API_KEY:-}" && -n "${CATALOG_IMPORT_SECRET:-}" ]]; then
  secret_file="$(mktemp)"
  trap 'rm -f "$secret_file"' EXIT
  chmod 600 "$secret_file"
  printf 'GOOGLE_PLACES_API_KEY=%s\nCATALOG_IMPORT_SECRET=%s\n' \
    "$GOOGLE_PLACES_API_KEY" "$CATALOG_IMPORT_SECRET" > "$secret_file"

  echo "Configuring server-side importer secrets"
  supabase secrets set --project-ref "$project_ref" --env-file "$secret_file"
  supabase functions deploy import-google-candidates \
    --project-ref "$project_ref" \
    --no-verify-jwt
else
  echo "Skipping Google importer deployment: provider secrets are not configured"
fi

echo "Catalogue deployment complete"
