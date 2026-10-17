# Brainstorm 2: the daily action, the creature, and money

_Draft 1, 2026-10-17. Follows `01-research-and-product-direction.md`. Inputs from Eugene: audience is accountability pairs and couples, daily action and creature identity still open, platform indifferent, monetization depends on the rest._

---

## 1. Audience: accountability pairs + couples

These two overlap more than they look. A couple that decides to "both go to the gym" is an accountability pair. The shared trait is **a two-person relationship the pair wants to keep healthy, expressed through a small daily act**. So the product is one mechanic with two tones.

Decision: one app, two **modes** picked at pair creation.

| | Crew mode | Couple mode |
|---|---|---|
| Who | gym buddy, study partner, sober buddy, siblings, two friends doing a 75-hard style thing | partners, incl. long-distance |
| Daily feed | each person's habit | each person's habit, or "check in" if they have no habit |
| Bonding prompt | plan / reflect ("what's your one thing tomorrow?") | relationship prompts ("what did they do this week that you didn't thank them for?") |
| Copy tone | coach-ish, dry | warm, playful |
| Share cards | "Day 30. Both of us." | "Our 30th day with Pip" |

Same creatures, same streak, same economy. Modes change prompts, copy and marketing, nothing structural. That keeps engineering cheap and lets you learn which audience actually retains before you commit.

---

## 2. The daily action

### 2.1 What the action must do

1. **Be finishable in under 30 seconds from the widget or lock screen.** Anything longer becomes a chore the pet is blamed for.
2. **Produce a visible event for the partner.** The feed is a message. "Maya fed Pip" is the whole social layer in v1.
3. **Be honest enough that a shiny means something.** If feeds are a tap with no consequence, rarity and vitality are fake.
4. **Leave a trace.** Over 100 days the traces become the memory book, which is the thing people cannot bring themselves to delete.

### 2.2 Candidate actions, graded against that

| Action | Friction | Partner-visible | Honest | Leaves a trace | Verdict |
|---|---|---|---|---|---|
| Habit tick (self-report) | very low | yes | weak | weak | spine, but needs help |
| Habit tick + optional proof photo | low | strong | medium | strong | **yes** |
| Habit auto-logged from Apple Health (workout, steps, sleep, mindfulness) | zero | yes | strong | medium | **yes, biggest differentiator** |
| Shared prompt both answer, revealed when both done | low | strong | n/a | strong | **yes, as bonding layer** |
| Photo or 1-line check-in (BeReal) | very low | strong | n/a | medium | fallback feed for people with no habit |
| Chat message (Snap) | zero | yes | n/a | none | no, hollow |
| Partner must confirm your feed | medium | yes | strong | weak | no as a rule, yes as an optional "vouch" |
| Location (gym geofence) | zero | yes | strong | weak | later, privacy cost |
| Screen Time ("no phone after 10") | zero | yes | strong | weak | later, API is awkward |

### 2.3 Recommended structure: three layers

```
Layer 1  FEED (required, ~10s)        -> keeps streak, both fed = growth point
         log your habit. tap, or attach a proof photo, or let Apple Health do it.

Layer 2  BOND (optional, ~30s)        -> raises vitality, unlocks overnight exploration
         answer today's shared prompt. react to partner's feed with a treat.

Layer 3  EXPEDITION (weekly, both)    -> set items, rare cosmetics, big share card
         one pair challenge per week: "both hit your habit 5 of 7 days", "both send a proof photo on the same day".
```

Why layers and not one action:
- Layer 1 alone is a Snap streak with a face. Too thin.
- Layer 2 alone is Paired, and people stop answering questions after week 3.
- Layer 1 as the floor keeps the streak cheap. Layer 2 makes the creature feel loved, not just fed. Layer 3 gives a reason to open on a Sunday and a slot for rarity to live in.

### 2.4 Honesty without policing

- **Apple Health auto-feed** is the main answer. Workouts, step goals, sleep duration, mindful minutes and water (HealthKit) cover the most common accountability habits. The creature is fed when the data lands. No tapping, no lying. Marketing line: "it knows when you actually went."
- **Proof photo** for everything Health cannot see. Stored in the pair's memory book. The pressure is social, not enforced.
- **Vouch** is a one-tap reaction from the partner ("saw it") that adds a small vitality bonus. It rewards paying attention to each other. It never blocks the feed.
- **No partner-confirmation requirement.** Pengu-style "your partner says you did not" is conflict in a box.

### 2.5 Things worth prototyping later, not now

- **Pass the egg.** The creature "sleeps over" with one person each night and must be handed back. Creates a daily touchpoint with an owner. Cute, possibly annoying. Test as an opt-in event.
- **Third wheel.** Let a third person join as a "godparent" who can send treats but does not feed. Low-cost virality without breaking the pair rule.
- **Silent days.** A pair can declare a holiday (max 7 days per quarter). Streak freezes, creature goes on its own trip, sends postcards. Duolingo-grade protection with story attached.

### 2.6 Mini-games: no in v1, maybe later in one form

Pengu levelled the penguin through mini-games and reviewers rated them "7.5/10 because they earn coins." Finch has none and is the category breakout. A mini-game minute is a minute not spent on the real-world habit, and the creature must not reward that.

- **Never as a feed.** Growth and streak days come only from Layer 1.
- **Not in v1.** Each game is its own small product. Too expensive for the retention it buys.
- **Later, only as pair-only asynchronous micro-games inside the Bond layer**, 30 seconds, max once a day, rewarding vitality or cosmetic tokens:
  - Guess their answer: both answer a question, then guess the other's. Reveal when both done. First candidate, cheapest, doubles as a better bonding prompt.
  - Draw it, they guess. Alternate days.
  - Same-second tap: both hold a button at the same moment. Occasional event only.
  - Expedition minis: a weekly co-op puzzle as the mechanic inside Layer 3, not a games tab.
- **Decision trigger.** Revisit after D30 data. High Bond completion means no games needed. Low means try "guess their answer" first.

---

## 3. The creature: rarity and vitality, borrowed from Pokémon cards and Labubu

### 3.1 What those two actually run on

**Labubu / Pop Mart.** Blind boxes in named series. One "secret" chase variant per series at roughly 1 in 72 or 1 in 144. The pull is filmed and posted. The figure hangs on a bag, so ownership is public. Drops are time-limited, which makes scarcity about *when*, not just money. Trading and resale follow from all of this.

**Pokémon cards.** Tiered rarity with disclosed pull rates. Set completion as a long goal. Condition and grading as a second axis of value on the same card. Evolution lines give a card a story, not just a picture.

**Pokémon the game and Tamagotchi**, which matter more for us than the cards: shiny variants at 1 in 4096, and in Tamagotchi the **adult form depends on how well you cared for it**. Care quality is the hidden stat that decides what you end up with.

### 3.2 The rule that keeps it from becoming a casino

> **Rarity can be found or earned. It can never be bought.**

The pair model only works if a rare creature is proof the pair showed up. The moment a shiny can be purchased, every shiny on TikTok is a receipt instead of a flex. Blind-box monetization stays in **cosmetics only**, with odds disclosed and a pity counter.

### 3.3 Proposed system

**Species and sets.** Creatures come in named seasonal sets of about 8 species each (Set 1 "Tidepool", Set 2 "Night Market", one per quarter). An egg from a set only hatches during that season. This is Labubu's drop cadence with time as the scarcity, not cash.

**Rarity tiers at hatch.**

| Tier | Odds | Notes |
|---|---|---|
| Common | 60% | includes the brand mascot species, so the mascot is everywhere |
| Uncommon | 25% | |
| Rare | 12% | |
| Legendary | 3% | one per set |
| Shiny (any tier) | 1 in 100, independent | palette swap plus sparkle, the TikTok moment |

The odds are the same for everyone. A pair can nudge them only through behaviour: completing the previous creature at high vitality adds a small "lucky egg" bonus on the next hatch. Earned, not bought.

**Synchronized hatch.** The egg hatches on day 3 only when **both** people open the app after the day resolves. Both see the reveal at the same time, with a 3-second egg wobble. This is the unboxing clip. Give it a one-tap "record" that captures both reactions if they are on a call, or a share card if not.

**Vitality.** A live 0 to 100 stat computed from the last 14 days: both-fed rate (heavy weight), bond prompts answered, treats exchanged, shields used (small penalty), expedition completed (bonus). Vitality drives how the creature *looks right now*: posture, glow, animation set, whether it is awake on the widget. A single missed day can never drop vitality more than a few points. Vitality is the "condition" axis from card grading, applied to a living thing.

**Growth stages and branching evolution.**

```
Egg (day 0)  ->  Hatchling (day 3)  ->  Juvenile (day 14)  ->  Adolescent (day 45)  ->  Adult (day 100)
```

At the Adolescent to Adult step the creature **branches** based on average vitality over days 45 to 100:

- vitality under 50: "Scrappy" form. Still cute, clearly been through it.
- 50 to 85: standard adult.
- over 85: "Radiant" form, visibly different silhouette.
- over 85 **and** zero missed days: "Secret" form, the chase variant. This is the Pokémon secret rare, and it is only reachable by a perfect pair.

Growth is pure day-count on both-fed days. Vitality decides *which* adult, never *whether*. Nobody is punished out of evolving.

**Graduation and the habitat.** At Adult the creature moves into the pair's **habitat**, a shared home screen scene, and sits there permanently, waving, sleeping, occasionally doing something. A new egg appears. Over a year a pair builds a habitat with three or four residents, each with its own set, tier and form. The habitat is the collection shelf, the Pokédex and the relationship timeline in one picture. It is also the screenshot people post.

Why graduate at 100 rather than grow forever like Finch:
- 100 days is a real habit horizon and a natural season.
- A broken streak at day 230 on a single forever-creature is devastating. A broken streak at day 60 on creature number three is a bad week.
- It gives rarity somewhere to accumulate. One creature forever has nothing to collect.
- It gives the pair a fresh "what will we get" moment every quarter.

**Hero versus skins, resolved.** The brand mascot (the penguin equivalent) is the most common species in every set. It is on the icon, in every ad, and most pairs' first creature. Rare species are the chase. You get Pengu's marketing clarity and Pokémon's collection depth from the same system.

### 3.4 What not to do

- **No trading between pairs in v1.** It creates real-money markets, fraud and support load, and it lets rarity leak away from the pair who earned it. Gifting cosmetics is enough.
- **No creature blind boxes for cash.** See the rule above.
- **No death.** Neglected creatures hibernate. A hibernating egg or hatchling can be revived by one both-fed day. Nothing is ever lost, only paused.
- **No stat grind.** Vitality is derived, never trained. There is no "tap 50 times to raise happiness".

### 3.5 Physical, later

Labubu's lesson that a thing on your bag is worth more than a thing on your screen is real. Phase 3 candidate: at Adult, print-on-demand a card (holo for Radiant, foil-stamped for Secret) or a small vinyl figure of the pair's creature with both names and the dates. Low build cost, high margin, strong gift and strong UGC. Note it, do not build it yet.

---

## 4. Platform

You are indifferent, so decide on constraints. **iOS first, native SwiftUI.**

- Widgets, Live Activities and lock screen are the front door. WidgetKit is far ahead of anything cross-platform.
- Apple Health auto-feed (section 2.4) is iOS-only and is the biggest differentiator.
- Couples and self-care app revenue skews heavily to iOS in the US. Finch bought Android traffic only after iOS was profitable.
- StoreKit 2 and family-style pair purchases are simpler on one platform.

Android when iOS pairs show D30 above about 25%. If you are a React Native or Flutter person and not a Swift person, Expo with a native widget module is acceptable, but budget two extra weeks for the widget and Health bridges.

---

## 5. Monetization

Designed around the rule in 3.2 and the audiences in section 1. Couples and accountability pairs pay for subscriptions and gifts. Teens pay with ad views. We chose the former, so:

### 5.1 Free tier (the whole loop)

Feed, bond, expedition, one egg at a time, full growth and evolution, all rarity tiers at full odds, earned shields (one per 7 clean days, hold up to 2), one free restore per month, basic habitat, share cards, Apple Health auto-feed.

### 5.2 Pair Plus, one purchase covers both people

Around $4.99 a month or $29.99 a year. Either partner can buy it and it applies to the pair. Buying it is a gift, and gifts convert better than self-purchases.

Includes: incubator (a second egg in parallel), habitat decorations and themes, extra bonding prompt packs (long-distance, new parents, sober, exam season), unlimited shields, memory book export (PDF or video at Adult), early access to each season's set by one week, higher *cosmetic* capsule odds, and the "holiday" feature from 2.5.

Never includes: better creature odds, growth, or streak days.

### 5.3 Consumables

- **Streak restore**, $0.99. Snap proved it. Available within 48 hours of the miss, max two a month so it cannot replace showing up.
- **Cosmetic capsules**, $1.99, or earned with expedition tokens. Blind box of hats, accessories and habitat props for the current set. Disclosed odds, pity at 10. This is the Labubu lever, pointed at cosmetics only.
- **Season pass**, $4.99 per quarter, a cosmetic track that fills from both-fed days. Free track exists too.

### 5.4 Physical (phase 3)

Day-100 card or figure, $15 to $30. Also a "pair box" gift at launch of each season.

### 5.5 Ads

**None.** Reasons: Pengu's reviews, the subscription audience we picked, and the fact that a rewarded ad for a shield makes showing up optional. Revisit only if Pair Plus converts under 2% of pairs after three months and nothing else is working. If that day comes, the only acceptable form is an opt-in rewarded ad for cosmetic tokens, never for shields or growth.

### 5.6 Targets to sanity-check the model

Rough, for a plan not a pitch deck:

| Metric | Target by month 6 |
|---|---|
| Invite accepted within 48h | 60% of created pairs |
| Both-fed rate, active pairs | 70% of days |
| D30 retention, pairs | 25% |
| Pair Plus conversion | 5% of active pairs |
| Restore buyers per month | 8% of active pairs |
| Blended revenue per active pair per month | $0.80 to $1.20 |

At 50K active pairs that is roughly $40K to $60K a month, which is already Pengu-scale revenue with a fraction of the installs, because pairs pay and teens do not.

---

## 6. Decisions now open

1. **Modes:** confirm Crew and Couple as the two onboarding modes, same mechanics.
2. **Feed layers:** confirm Feed / Bond / Expedition and Apple Health auto-feed in v1.
3. **Creature system:** confirm seasonal sets, hatch rarity, vitality-driven branching, graduation at day 100 into a habitat.
4. **Mascot:** pick the species that is the common in every set. Needs to read at widget size, be sexless and ageless, and not be a penguin.
5. **Monetization:** confirm Pair Plus plus restore plus cosmetic capsules, no ads, no creature gacha.
6. **Name.** "Streak" is the repo. The app needs a name that says "together" more than "streak".

Next doc once these are set: screen-by-screen spec, the day-resolution and vitality algorithms with worked examples, and the data model for pairs, feeds, creatures and seasons.

---

## Addendum 2026-10-17: decisions and remaining suggestions

Confirmed by Eugene: Crew and Couple modes; Feed / Bond / Expedition with Apple Health auto-feed in v1; seasonal sets, hatch rarity, vitality branching, graduation at 100; Pair Plus + restore + capsules, no ads, no creature gacha. Mini-games deferred per 2.6.

### Mascot candidates

Constraints: reads at widget size, ageless and sexless, animates cheaply in 2D, not a penguin, carries the "two of us" idea.

| Candidate | For | Against |
|---|---|---|
| **Sea otter** (recommended) | Otters hold hands while sleeping so they do not drift apart. That fact is the entire brand in one sentence. Round head, whiskers and paws read at 40px. Universally liked, not yet a meme. Wrapping in kelp gives a free visual for shields and naps. A group of otters is called a raft. | More animal-shaped than blob-shaped, so the rig is a bit more work. |
| Axolotl | Regenerates, which matches "nothing dies, only pauses". Pink with gill fronds reads at small size. Big with 16 to 25. | Already everywhere in merch and Minecraft. Hard to own. |
| Moss or seed sprite | Literally grows. Seasonal sets map to plants naturally. | Plants are hard to make emotive. Plant Nanny and Forest own the space. |
| Abstract blob or ghost | Cheapest to animate, infinitely skinnable. | Cold. No metaphor. Bao in Born's app is already a blob. |
| Capybara | Peak cute, social animal. | Meme fatigue, brown blob at widget size. |

Pick the otter as the common species in every set. Logo: two otters holding paws, or one otter wrapped in kelp. The other three Set 1 species can be other coastal animals so the habitat is a tidepool: a hermit crab (uncommon), a sea slug nudibranch (rare, naturally wild colors), a tiny whale or manta (legendary).

### Name candidates

All need a trademark and App Store search before committing. Not checked here.

| Name | Why | Risk |
|---|---|---|
| **Raft** (recommended) | A raft is a group of otters holding on to each other. Short, one syllable, says "we stay together", pairs with the mascot without being a pun. Clean icon. | Generic word, so searchability depends on brand. Check for conflicts in Social and Health categories. |
| Kelp | What otters wrap in so they do not drift. Cute, memorable, unusual. | Slightly obscure, sounds like a food app to some. |
| Holdfast | The anchor of kelp, and literally "hold firmly". Strong meaning. | Two syllables, a little serious for a cute app. |
| Both | Direct, bold, confident. "Did you both?" | Impossible to search, likely conflicts. |
| Tandem | Perfect meaning. | Tandem is a large language-exchange app. Avoid. |
| Tether | Connected across distance. Good for long-distance couples. | Tether is a crypto stablecoin. Avoid. |

Tagline either way: **"A creature you can only raise together."**

### More name candidates (round 2)

Asked for names that sound good and roll off the tongue. One or two syllables, soft consonants, easy to say in "did you do your ___ today?". Trademark and App Store checks still needed on all of them.

| Name | Say it | Why it fits | Watch out |
|---|---|---|---|
| **Raft** | one syllable, closed, confident | a raft of otters holding on to each other | generic word, see round 1 |
| **Tend** | one syllable, warm verb | "tend to it", works equally for crew and couple, says care without saying pet | Tend is a US dental chain brand |
| **Pebble** | two soft syllables, playful | otters keep one favourite rock in a pouch for life. Also what you crack shells with, so it reads "small, kept, useful" | Pebble smartwatch brand was revived in 2025 |
| **Kelp** | one syllable, bouncy | what otters wrap in so they do not drift apart | obscure to non-otter people, sounds a bit like a food app |
| **Nuzzle** | two syllables, very soft | the affection gesture itself, instantly warm | leans couple, may feel too cute for crews |
| **Holdfast** | two syllables, firm | kelp's anchor, and literally hold firmly | serious tone, harder icon |
| **Bask** | one syllable, relaxed | otters bask in rafts, implies rest and reward | less about "together" |
| **Twofold** | two syllables, rhythmic | says two, says growth, no animal needed | slightly corporate |

Ranking by sound plus meaning: Raft, Tend, Pebble, Kelp, Nuzzle. If Raft fails clearance, take Tend.

Default creature name for the mascot otter: **Pip**. One syllable, works in every sentence the creature says.
