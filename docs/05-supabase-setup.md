# Supabase setup runbook

_For the person creating the project. About 30 minutes the first time. Commands assume the Supabase CLI; if a flag has moved, `supabase <command> --help` is current and this doc is not._

## 1. Create the project

1. Sign in at supabase.com, create an organization if you do not have one, then **New project**.
2. Name it `kelp-dev` (one project per environment; make `kelp-prod` later, never share one).
3. Region: pick the one closest to your first users. US East if undecided.
4. Generate a strong database password and store it in a password manager. You will rarely type it.
5. Wait for provisioning, then open **Project Settings, API** and copy three values into your password manager:
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` public key (goes in the iOS app)
   - `service_role` secret key (server only, never in the app)
   The `<ref>` in the URL is the project ref used below.

## 2. Install and link the CLI

```sh
brew install supabase/tap/supabase       # macOS; see supabase.com/docs/guides/cli for others
cd /path/to/Streak
supabase login                           # opens a browser
supabase link --project-ref <ref>        # asks for the DB password once
```

## 3. Apply the schema and seeds

```sh
supabase db push                         # runs supabase/migrations/0001 and 0002
psql "$(supabase db url 2>/dev/null || echo "$SUPABASE_DB_URL")" -f supabase/seed.sql
psql "$(supabase db url 2>/dev/null || echo "$SUPABASE_DB_URL")" -f supabase/seed_prompts.sql
```

If `supabase db url` is not available in your CLI version, copy the connection string from **Project Settings, Database** and export it as `SUPABASE_DB_URL`.

Check in **Table Editor** that `seasons` has one row, `species` four, `prompts` 240.

Enable the two extensions the migration expects if they are not already on, in **Database, Extensions**: `pg_cron` and `pg_net`. (`pgcrypto` is on by default.)

## 4. Auth: Sign in with Apple

1. In the Apple Developer portal, create an App ID `app.kelp.ios` (or whatever the final bundle id is) with **Sign in with Apple** enabled.
2. Create a **Services ID** for the web flow, e.g. `app.kelp.web`, enable Sign in with Apple on it, and add the return URL Supabase shows you under **Authentication, Providers, Apple** (it looks like `https://<ref>.supabase.co/auth/v1/callback`).
3. Create a **Key** with Sign in with Apple enabled, download the `.p8` once, note the Key ID and your Team ID.
4. In Supabase **Authentication, Providers, Apple**: enable it, paste the Services ID as Client ID, and generate the secret from the `.p8` using the helper on that page (Team ID, Key ID, Services ID). For native iOS sign-in also add the App ID bundle identifier to the **Authorized Client IDs** list on the same page, or the identity token exchange from the app will be rejected.
5. Under **Authentication, URL Configuration** set the site URL to `https://kelp.app` (placeholder until the domain exists) and add `kelp://` as a redirect for the app.

## 5. Edge functions

Set the secrets the functions read:

```sh
supabase secrets set \
  APNS_TEAM_ID=XXXXXXXXXX \
  APNS_KEY_ID=YYYYYYYYYY \
  APNS_BUNDLE_ID=app.kelp.ios \
  APNS_SANDBOX=1 \
  APNS_PRIVATE_KEY="$(cat AuthKey_YYYYYYYYYY.p8)"
```

The APNs key is a separate key from the Sign in with Apple key: create it in the Apple portal with **Apple Push Notifications service (APNs)** checked. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

Deploy:

```sh
supabase functions deploy create-pair
supabase functions deploy join-pair
supabase functions deploy log-feed
supabase functions deploy answer-prompt
supabase functions deploy send-treat
supabase functions deploy restore-streak
supabase functions deploy resolve-pair-days --no-verify-jwt
supabase functions deploy dispatch-notifications --no-verify-jwt
```

The last two are called by cron with the service key, so JWT verification is off for them; they still require the bearer token in the header.

## 6. Schedule the two cron jobs

In the SQL editor, with the service role key stored in Vault first:

```sql
select vault.create_secret('<service_role_key>', 'service_key');

select cron.schedule('resolve-pair-days', '7 * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/resolve-pair-days',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_key')),
    body := '{}'::jsonb)
$$);

select cron.schedule('dispatch-notifications', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/dispatch-notifications',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_key')),
    body := '{}'::jsonb)
$$);
```

Check `select * from cron.job;` shows both, and after an hour `select * from cron.job_run_details order by start_time desc limit 5;` shows successes.

## 7. Storage

Create a private bucket `feed-photos`. Policy: authenticated users may upload to `pair/<pair_id>/...` only when `is_pair_member(pair_id)`, and may read the same prefix. The app uploads, then calls `log-feed` with the object path as `photoUrl`. Turn on image transformation so widgets can request small thumbnails.

## 8. Smoke test from a terminal

```sh
export URL=https://<ref>.supabase.co ANON=<anon>
# Create two throwaway users in Authentication, Users (email + password is fine for testing), then:
TOKEN_A=$(curl -s "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "content-type: application/json" \
  -d '{"email":"a@test.local","password":"testpass123"}' | jq -r .access_token)
curl -s "$URL/functions/v1/create-pair" -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN_A" \
  -H "content-type: application/json" -d '{"mode":"couple","displayName":"A","tz":"Europe/London"}'
# -> {"ok":true,"pairId":"...","inviteToken":"..."}; join with user B, insert a habit row for each in Table Editor, then:
curl -s "$URL/functions/v1/log-feed" -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN_A" \
  -H "content-type: application/json" -d '{"source":"manual","tz":"Europe/London"}'
curl -s "$URL/rest/v1/rpc/pair_view" -X POST -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN_A" -H "content-type: application/json" -d '{}'
```

`pair_view` should show A as `fed_today: true` and `notification_queue` should hold an N1 for B.

## 9. What to hand back to me

Project ref, and confirmation that steps 3 and 6 ran. Nothing secret. With those I can write the habit-setup endpoint, the Storage policy SQL and the StoreKit webhook against the live project.
