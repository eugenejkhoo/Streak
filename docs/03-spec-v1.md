# Spec v1: screens, algorithms, data model, build plan

_Draft 1, 2026-10-17. Working name RAFT (placeholder, see doc 02 addendum). Confirmed decisions: Crew and Couple modes; Feed / Bond / Expedition with Apple Health auto-feed; seasonal sets, hatch rarity, vitality-driven branching, graduation at day 100 into a habitat; Pair Plus + restore + cosmetic capsules, no ads, no creature gacha. iOS first, native SwiftUI._

---

## 1. Glossary

| Term | Meaning |
|---|---|
| Pair | Two users and their shared state. The unit of everything. |
| Mode | Crew or Couple. Changes prompts and copy only. |
| Feed | A user's daily habit log. Manual tap, photo, or Apple Health. |
| Pair day | One calendar date from each member's local perspective. Resolves when both members' local days have ended. |
| Both-fed | A pair day in which both members fed. The only thing that grows the creature. |
| Streak | Consecutive pair days that were both-fed, shielded or restored. Momentum. Can reset. |
| Growth | Count of both-fed days for the current creature. Permanent. Never decreases. |
| Shield | Pair-owned token that protects the streak on a missed day. Earned, 1 per 7 consecutive both-fed days. |
| Vitality | 0 to 100 condition score over the last 14 pair days. Drives appearance and the adult form. |
| Bond | Daily shared prompt plus treats. Optional. Raises vitality. |
| Expedition | Weekly pair challenge. Raises vitality, yields cosmetic tokens. |
| Habitat | The pair's shared scene. Graduated creatures live there. |
| Set | A seasonal roster of species. One per quarter. |

---

## 2. The local day

Every feed is stamped with the user's **local date** where the day boundary is **03:00 local**, not midnight. A feed at 01:30 on the 18th counts for the 17th. Store the device time zone on every feed.

Anti-gaming: a feed can only be stamped for the current local date. Changing device time zone does not reopen a closed date; the server computes the local date from the server timestamp and the user's last known time zone, and accepts a client time zone change only if it moves at most once per 24 hours.

A **pair day D** is open from the earliest member's 03:00 on D until the latest member's 03:00 on D+1. For a London and Los Angeles pair that is a 32-hour window. Each person just has to feed "today" in their own time; the server reconciles.

---

## 3. Day resolution

Runs server-side hourly. For each pair, resolve every pair day D whose window has closed and whose state is still `pending`.

```
feedsA = feeds(pair, A, local_date = D)
feedsB = feeds(pair, B, local_date = D)

if feedsA and feedsB:
    state = BOTH_FED
    streak += 1
    growth += 1
    if streak % 7 == 0 and shields < shield_cap: shields += 1
elif shields > 0:
    state = SHIELDED            # auto-applied, pair is told
    shields -= 1
    # streak unchanged, growth unchanged
else:
    state = AT_RISK             # restore window opens, 48h from resolution
    streak_at_risk = streak
    streak = 0                  # shown as "paused" in UI until window closes
```

Restore within 48 hours, either the free monthly one or a $0.99 purchase, sets `state = RESTORED` and `streak = streak_at_risk`. After 48 hours `state` becomes `MISSED_ONE` or `MISSED_NONE` and the paused streak is gone. Max two paid restores per pair per month.

**Hibernation.** Seven consecutive pair days with no feed from either member puts the creature to sleep (blanket, zzz on the widget). One both-fed day wakes it. Nothing else changes. Growth is kept.

**Shield cap.** Free: 2. Pair Plus: 5. (Doc 02 said "unlimited" for Plus. Corrected here: unlimited shields would make the streak meaningless.)

**Stage transitions** happen at resolution when growth crosses 3, 14, 45, 100. The hatch at growth 3 is held until both members have opened the app (section 6.2). Later evolutions play for each member on their next open.

---

## 4. Vitality

### 4.1 Daily score

Each resolved pair day gets a score `s`:

| Component | Points | Condition |
|---|---|---|
| Both fed | 65 | state BOTH_FED |
| Bond | 25 | both members answered the day's prompt |
| Treats | 10 | at least one treat exchanged in either direction |
| Shielded or restored day | 30 flat | replaces the row above; bond and treats still add |
| One fed, no shield | 20 flat | bond and treats still add |
| None fed | 0 | |

### 4.2 Vitality

```
V = mean(s over the last 14 resolved pair days) + expedition_bonus
expedition_bonus = 5 if the most recent completed week's expedition was completed, else 0
V clamped to [0, 100]
```

For creatures younger than 14 pair days, missing days in the window are filled with a neutral prior of 70. This means a new egg starts at vitality 70 and moves toward the pair's real behaviour over two weeks.

Worked examples, 14-day window, no expedition:

| Pair behaviour | Days | Score each | Mean | V |
|---|---|---|---|---|
| Perfect: both fed, bond, treats daily | 14 | 100 | 100 | **100** |
| Both fed daily, bond on 7 days, no treats | 7 / 7 | 90 / 65 | 77.5 | **78** |
| Both fed 12 days, 1 shielded, 1 missed one, bond 10 days | 12 / 1 / 1 | ~86 avg / 55 / 20 | ~80 | **80** |
| Both fed 9 days, 5 one-fed, bond 4 days | 9 / 5 | ~76 / 20 | 56 | **56** |
| A single missed day (shielded) on an otherwise perfect pair | 13 / 1 | 100 / 30 | 95 | **95** |

So a single bad day costs about 5 points. Two weeks of one-sided effort drags V into the 50s. This matches the goal in doc 02: visible, never catastrophic.

### 4.3 What vitality drives

- **Appearance now.** Four visual bands: under 40 droopy, 40 to 70 normal, 70 to 90 bright, over 90 glowing. Band changes are animated so the pair sees it happen.
- **Widget state.** Over 70 the creature is awake and active on the widget during waking hours. Under 40 it mostly sleeps.
- **Overnight exploration.** If yesterday's s was at least 90, the creature "goes exploring" and the next morning's open shows a small find: a sticker, a replay of a past answer, a cosmetic token.
- **Adult form** (next section).

---

## 5. Creature lifecycle

### 5.1 Stages

| Stage | Growth days | Visual |
|---|---|---|
| Egg | 0 to 2 | set-colored egg, tier hinted by pattern only after hatch |
| Hatchling | 3 | species revealed, tiny |
| Juvenile | 14 | bigger, first accessory slot |
| Adolescent | 45 | distinct silhouette, second slot |
| Adult | 100 | one of four forms, graduates to habitat |

### 5.2 Hatch

Species and tier are rolled server-side when the egg is created, sealed, and revealed at growth 3. Odds per doc 02: common 60, uncommon 25, rare 12, legendary 3; shiny 1 in 100 independent. **Lucky egg**: if the pair's previous creature graduated as Radiant or Secret, roll rare+ at 1.5x (rare 18, legendary 4.5, common absorbs the difference).

The hatch animation plays only when **both** members have the app open after growth hits 3, or 24 hours after, whichever first, so a travelling partner cannot block it forever. The app shows "ready to hatch, waiting for Maya" and offers a one-tap nudge. Both devices play the same 3-second wobble and reveal. The share card is generated immediately with both names, the species, tier and date.

### 5.3 Adult form

Computed at growth 100 from the pair days between reaching Adolescent and reaching Adult:

```
avgV   = mean of daily V over that period
misses = count of pair days in that period not BOTH_FED (shields count as misses)

if avgV > 85 and misses == 0: SECRET
elif avgV > 85:               RADIANT
elif avgV >= 50:              STANDARD
else:                         SCRAPPY
```

Every form is a full adult. Scrappy is lovable, not a failure state. Secret is the chase.

### 5.4 Graduation

At Adult the creature walks into the habitat, picks an idle spot, and stays. The pair gets a 100-day card and, if they want, the memory book export. A new egg from the current set appears. If the set changed during the 100 days, the new egg is from the current set.

### 5.5 Pair breakup

Either member can leave. The other is offered **adoption**: the creature and habitat stay with them in a solo "waiting" state where feeds still log but nothing grows. Inviting a new partner re-pairs it; growth resumes, streak starts fresh. Memory book entries authored by the departed member remain visible unless that member deletes their account, in which case their photos and answers are removed and their feeds become anonymous "partner" rows.

---

## 6. Screens

### 6.1 Onboarding

1. Splash with the mascot and one line.
2. Sign in with Apple.
3. "Who are you raising it with?" Crew or Couple, with two illustrations and one sentence each.
4. Create pair. Share sheet opens with an invite link (universal link). Message pre-filled in mode tone.
5. **Incubating state** while waiting: the inviter sees the egg in a nest, sets their own habit (section 6.3), turns on Apple Health if they want, and sees "egg wakes when Maya joins." Daily nudge to re-share the link, max 3.
6. Partner opens the link, signs in, lands directly in the pair, sets their habit.
7. Both see "Day 1" with the egg awake. Notification settings are asked here, with the creature voicing why.

Invite links expire after 7 days. One active pair per user in v1.

### 6.2 Home

Top to bottom:
- **Scene**: the creature in the habitat, animated per vitality band. Graduated residents visible in the background.
- **Today strip**: two avatars with fed state (filled, hollow, or Health-pending), streak flame with count, shields as small pips.
- **Feed button**: large, one tap. Becomes "Fed" with a checkmark. Shows "Logged from Health" when auto-fed.
- **Bond card**: today's prompt, your state, partner state, reveal when both done.
- **Expedition card**: this week's challenge with two progress bars.
- **Vitality ring** small, tappable for the breakdown.

### 6.3 Habit setup

Choose a kind: Manual ("I'll tap it"), Photo required, or Apple Health (Workout any, Steps with target, Sleep with min hours, Mindful minutes with target). Title and emoji. One habit per member in v1. Changing a habit takes effect the next pair day.

### 6.4 Feed sheet

Manual: tap, optional note, optional photo, done. Photo kind: camera opens, photo required. Health kind: shows today's data and the threshold, fed automatically when crossed, with a manual override "log it anyway" that is marked as manual in the memory book.

### 6.5 Bond

Prompt of the day from the mode's pack. Text answer up to 280 characters, or a photo. Shows "waiting for Maya" until both answered, then reveals both side by side. Treats: from the partner's feed row, send one of five treats with one tap. Treats are a one-tap acknowledgment, not a message.

### 6.6 Expedition

One per week, Monday to Sunday in the pair's earlier time zone. Templates for v1: "both feed 5 of 7", "both answer 4 prompts", "both send a photo feed on the same day", "both fed 3 days in a row". Progress bars per member. Completion gives both a cosmetic token and the vitality bonus.

### 6.7 Habitat and collection

Full-screen habitat. Tap a resident for its card: species, set, tier, shiny, adult form, dates, days to adult, best streak. Set catalog shows the current season's species silhouettes, filled in for ones the pair has hatched. Decorations from Plus and capsules are placed here.

### 6.8 Memory book

Reverse-chronological timeline of pair days: both feeds with photos and notes, revealed prompt answers, treats, milestones, hatch and evolution cards. Filter by creature. Export at graduation (Plus).

### 6.9 Pair settings

Mode, habits, quiet hours per member, reminder time per member, Health permissions, shields and restores remaining, Pair Plus status and management, leave pair, delete account.

### 6.10 Paywall

Shown on: second egg attempt, habitat decoration tap, third shield-cap hit, memory book export, and once at day 14. Never on the Feed path. Copy leads with "one purchase, both of you".

### 6.11 Widgets

- **Small**: creature in current band and the two fed-state dots.
- **Medium**: creature, streak count, "Maya fed · you haven't" line, Bond state.
- **Lock screen circular**: creature face with a ring that fills as each of you feeds.
- **Lock screen rectangular**: streak and today's status line.

Widgets refresh on push and on timeline at 03:00 local, reminder time, and partner feed events. Tap targets: small opens Feed; medium has Feed and Bond deep links.

### 6.12 Share cards

Generated server-side as images: hatch, each evolution, graduation, every 50 streak days, Secret form. Both names, species, date, pair mode tone. 9:16 and 1:1.

---

## 7. Notifications

Voice is the creature's. Never "your partner is ignoring you". Hard cap of 2 non-milestone pushes per member per day. All respect quiet hours.

| Code | Trigger | Copy sketch | Cap |
|---|---|---|---|
| N1 | Partner fed, you have not, today | "Maya fed me. No rush." | 1/day |
| N2 | Reminder time reached, you have not fed | "Day's almost done. Still hungry." | 1/day |
| N3 | Pair day resolved AT_RISK | "We paused. You have 48 hours if you want to pick it back up." | 1/event |
| N4 | Hatch ready, waiting on you | "Something's happening. Come look." | 1/event, repeat after 12h |
| N5 | Evolution, graduation, expedition complete | celebratory | 1/event |
| N6 | Partner answered Bond, you have not | merged into N1 if same day | 1/day |
| N7 | Incubating, partner not joined | "Still waiting for Maya." day 1, 3, 6 | 3 total |

N1 is also delivered as a widget refresh, which is the quieter channel for most of the day.

---

## 8. Data model

Postgres via Supabase. Row-level security: a user reads and writes only rows for pairs they are a member of. All resolution, rolls and entitlements happen in Edge Functions with the service key.

```sql
users            id, apple_sub, display_name, avatar_url, tz, tz_updated_at,
                 reminder_local_time, quiet_start, quiet_end, health_enabled, created_at, deleted_at

pairs            id, mode (crew|couple), created_by, status (pending|active|solo|ended),
                 streak, streak_at_risk, at_risk_until, growth_total, shields, shield_cap,
                 free_restore_used_month, paid_restores_month, plus_until, created_at

pair_members     pair_id, user_id, habit_id, joined_at, left_at, role (creator|partner)

habits           id, pair_id, user_id, title, emoji,
                 kind (manual|photo|health_workout|health_steps|health_sleep|health_mindful),
                 target_value, effective_from, archived_at

feeds            id, pair_id, user_id, local_date, source (manual|photo|health|override),
                 note, photo_url, health_value, device_tz, created_at
                 unique (pair_id, user_id, local_date)

pair_days        pair_id, local_date, state (pending|both_fed|shielded|at_risk|restored|missed_one|missed_none),
                 score, vitality_after, streak_after, growth_after, resolved_at
                 primary key (pair_id, local_date)

seasons          id, name, starts_at, ends_at
species          id, season_id, name, tier (common|uncommon|rare|legendary), art_key, sort

creatures        id, pair_id, season_id, species_id, tier, shiny, lucky_egg,
                 stage (egg|hatchling|juvenile|adolescent|adult), growth_days,
                 created_at, hatch_ready_at, hatched_at, adult_form (scrappy|standard|radiant|secret),
                 graduated_at, habitat_slot, hibernating_since

prompts          id, mode, pack, text, active
prompt_answers   id, pair_id, prompt_id, user_id, local_date, text, photo_url, created_at
                 unique (pair_id, user_id, local_date)

treats           id, pair_id, from_user, to_user, feed_id, kind, created_at

expeditions      id, pair_id, week_start, template_id, progress_a, progress_b, completed_at

items            id, kind (hat|accessory|prop|theme), season_id, rarity, art_key
inventory        pair_id, item_id, qty, equipped_on (creature_id or habitat slot)
capsule_pity     pair_id, opens_since_rare

purchases        id, pair_id, user_id, product_id, store_tx_id, kind (plus|restore|capsule|pass), created_at
tokens           pair_id, cosmetic_tokens

notifications    id, user_id, code, pair_day, sent_at
events           id, user_id, pair_id, name, props, created_at
```

Pair Plus entitlement: StoreKit 2 transaction verified server-side, written to `purchases`, and `pairs.plus_until` set for the pair regardless of which member bought it. Renewal webhooks (App Store Server Notifications v2) update it.

---

## 9. Architecture

- **Client**: SwiftUI, iOS 17+. WidgetKit for four widgets. HealthKit with background delivery for the four Health habit kinds. StoreKit 2. Rive for creature state machines. Deep links via universal links.
- **Backend**: Supabase. Postgres with RLS, Auth with Sign in with Apple, Storage for photos (pair-scoped buckets), Edge Functions for feed ingestion, rolls, day resolution, entitlements, share card rendering, APNs. pg_cron hourly job for resolution and daily for expedition rollover.
- **Push**: APNs direct from an Edge Function. Silent pushes to refresh widgets on partner events.
- **Analytics**: event table in Postgres plus PostHog or Amplitude. Events: `pair_created`, `invite_opened`, `invite_accepted`, `habit_set`, `feed_logged` (source), `bond_answered`, `treat_sent`, `pair_day_resolved` (state, score), `hatch_viewed`, `evolution_viewed`, `expedition_completed`, `shield_consumed`, `restore_purchased`, `paywall_viewed` (placement), `plus_purchased`, `capsule_opened`, `pair_left`.
- **Art pipeline**: Rive files per species with a shared state machine: idle, happy, eat, sleepy, nap, hibernate, celebrate, explore-return. Stages are scale and part swaps on one rig per species where possible. Shiny is a palette swap at runtime. Adult forms are four part-sets on the adult rig. Budget this as the biggest cost line and contract one illustrator-animator in week 1.

---

## 10. Art scope for Set 1

Full doc 02 scope is 8 species. For v1 ship **4**: the mascot as common, one uncommon, one rare, one legendary. Each needs egg (shared per set, tinted), hatchling, juvenile, adolescent, and four adult forms. Shiny is free. That is 4 rigs with stage variants plus 16 adult part-sets, one habitat background with day and night, about 20 cosmetics, 5 treat icons. Add the other 4 species in the first post-launch set drop.

---

## 11. Build plan, 10 weeks, 1 to 2 engineers plus one artist

| Week | Deliverable |
|---|---|
| 1 | Supabase project, schema, RLS, Sign in with Apple, pair create and invite via universal link, incubating state. Artist starts mascot. |
| 2 | Habits, manual and photo feeds, local-date logic, day resolution function and cron, pair_days, streak and shields. Unit tests on resolution with multi-time-zone fixtures. |
| 3 | HealthKit habits with background delivery, override path. Home screen with placeholder creature. |
| 4 | Widgets, silent push refresh, APNs, N1 and N2 and N3. |
| 5 | Creature model, sealed rolls, stages, hatch gating, vitality computation, bands. First Rive rig integrated. |
| 6 | Bond prompts and reveal, treats, prompt packs for both modes (120 prompts each to start). |
| 7 | Expeditions, cosmetic tokens, adult form computation, graduation, habitat with residents. |
| 8 | StoreKit 2, Pair Plus pair entitlement, restore purchase, capsules with pity, paywall placements. |
| 9 | Memory book, share cards, adoption flow, account deletion, quiet hours, settings. |
| 10 | TestFlight with 20 to 30 real pairs, half crew, half couple. Instrument, fix, tune notification caps. |

Launch gate after 4 weeks of TestFlight: invite acceptance over 50%, both-fed rate over 60%, D30 pair retention over 20%. Below that, iterate before any paid acquisition.

---

## 12. Open items

- Final name and mascot (doc 02 addendum).
- Prompt packs need writing: Crew and Couple, 120 each for launch, plus a long-distance pack for Plus.
- Decide whether Health-sourced feeds show the raw number to the partner (steps count) or just "fed". Recommendation: just "fed", number visible to self only.
- Legal: 13+ minimum, no free text visible to anyone outside the pair, report and block, photo content moderation on upload (Apple's sensitive content analysis on-device plus a server-side classifier for Storage).
- App Review: pair entitlement from a single subscription is fine as long as it is sold as a service. Keep the wording "Pair Plus covers both of you".
