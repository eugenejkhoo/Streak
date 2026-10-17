# Raft (working name)

A creature you can only raise together. Two people, one creature. It grows only on days both of you show up.

## Repo layout

| Path | What |
|---|---|
| `docs/01-research-and-product-direction.md` | Competitor learnings (Finch, Pengu, Snap and TikTok streaks) and the product thesis |
| `docs/02-brainstorm-action-creature-monetization.md` | Daily action design, creature rarity and vitality system, monetization, mascot and name candidates |
| `docs/03-spec-v1.md` | Screens, algorithms, data model, notifications, 10-week build plan |
| `docs/04-prompt-packs.md` | Bond prompts, 120 Crew and 120 Couple, source for the JSON seeds |
| `content/prompts/*.json` | Generated prompt seeds |
| `supabase/migrations/0001_init.sql` | Postgres schema, RLS, `commit_pair_day()` |
| `supabase/seed.sql` | Set 1 "Tidepool" species |
| `supabase/functions/_shared/localDay.ts` | 03:00 local-day boundary, pair-day windows across time zones |
| `supabase/functions/_shared/resolve.ts` | Day resolution, streaks, shields, restore, hibernation, vitality, stages, adult form, hatch roll |
| `supabase/functions/_shared/invite.ts` | Invite tokens, 7-day expiry, join rules |
| `supabase/functions/_shared/feeds.ts` | Feed validation: source vs habit kind, Health thresholds, photo rule, duplicate and time-zone trust |
| `supabase/functions/_shared/notifications.ts` | Push caps, quiet hours, creature-voiced copy |
| `supabase/functions/resolve-pair-days/` | Hourly edge function that applies the resolution logic |
| `supabase/functions/{create-pair,join-pair,log-feed}/` | Edge functions for pairing and feeding |
| `ios/` | SwiftUI app, WidgetKit extension and the shared `RaftKit` package (XcodeGen spec, not yet compiled) |
| `tests/` | Node test suites for the domain logic |

## Running

```sh
npm test                 # Node 22.18+, no dependencies
npm run prompts:build    # regenerate content/prompts from docs/04
```

The migration has been applied end to end against Postgres 16 locally, including `commit_pair_day()` and the row-level-security policies. Supabase's `auth` schema and `pg_cron` are stubbed for that check.

## Rules the code enforces

- Growth never decreases. Streaks can.
- A missed day burns a shield if there is one, otherwise opens a 48-hour restore window, then resets the streak.
- Rarity is rolled server-side with fixed odds. Nothing in the economy changes them except a previous creature graduating Radiant or Secret.
- Seven empty days put the creature to sleep. One both-fed day wakes it.
