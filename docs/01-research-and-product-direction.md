# Streak: research and product direction

_Draft 1, 2026-10-17. Working name "Streak". Nothing here is final; it is a starting position to argue with._

## 0. The one-paragraph pitch

A pet that two people keep alive together. You and a friend (or partner, sibling, study buddy) hatch one shared creature. It only grows when **both** of you show up each day and do your small thing. Miss a day and it does not die, but it stalls, sulks, and tells the other person. It is Snapchat streaks with a reason to care beyond the number, and Finch with someone on the other side of the pet.

---

## 1. What the comparables actually teach

### 1.1 Finch (Finch Care, self-care pet)

**What it is.** Solo self-care app. You raise a bird ("birb"). You set small daily goals (drink water, stretch, journal). Completing goals fills an energy bar. Energy sends the bird on an "adventure" while you are away. Adventures return items, currency and discoveries. The bird levels up, grows from baby to adult, and you dress it and its home. Friends connect via "Tree Town" with invite codes and send hugs, high-fives and gifts. No chat.

**Numbers (third-party estimates, not company data).**

| Metric | Estimate | Source type |
|---|---|---|
| Gross revenue | ~$1M–3M / month, ~$30–40M ARR | Sensor Tower snapshots, AppSprint, Sparrow blog |
| Downloads | ~300–400K / month per store | Sensor Tower |
| D1 / D7 retention | 54% / 37% (vs Duolingo 51% / 35%) | Deconstructor of Fun citing Sensor Tower |
| Pricing | Finch Plus $9.99/mo or $69.99/yr | app store and help center |
| Funding | Bootstrapped, profitable | Multiple |

**Learnings.**

1. **The pet is a mirror, not a boss.** Finch never guilts you. The bird is sad-free. Reviewers call this out as the reason it works for anxious users who quit Duolingo-style streak apps. The emotional contract is "I take care of me by taking care of it," which is also exactly what their winning UGC ad says.
2. **Delayed, off-screen reward.** The adventure happens while you are gone. That turns "close the app" into "start the reward." The widget shows the bird sleeping or exploring, so the pet feels alive when you are not looking. This is their main retention lever per the Deconstructor of Fun teardown.
3. **Goals are tiny and self-chosen.** "Get out of bed" counts. Low floor means almost nobody has a zero day, which is what keeps the pet from ever feeling like a failed obligation.
4. **Social is asynchronous and purely positive.** You cannot nag a Finch friend. You can only send good vibes or gifts. That keeps it safe but also makes it weak as an accountability tool. This is our opening.
5. **Monetization is cosmetic and convenience.** Plus unlocks more outfits, more reflections, more pets (micropets). The core loop is never paywalled. Rainbow stones (hard currency) are earned slowly and buy cosmetics.
6. **Weaknesses to exploit.** Onboarding dumps too much at once (Pratt critique). Mechanics like energy and stones are never explained (YourStory, Pratt). The pet has no real stakes, so some users describe it as "modest depth." Marketing is 100% UGC on Meta and TikTok, which is copyable.

### 1.2 Pengu / "Friends – Pengu, Bao & Mellow" (Born, formerly SLAY, Berlin)

**What it is.** Pengu is a penguin that **two people raise together**, pitched at couples and best friends. You feed it, pet it, dress it, play mini-games for coins, and it levels up. Push notifications nudge both people to check in at the same time. It has home-screen widgets. In 2025 it was folded into "Friends" with solo companions Bao (wellbeing/habits) and Mellow (study help), all with an AI chat layer. Monetized by ads plus a "Pengu Pass" / "Friends Plus" subscription.

**Numbers.**

| Metric | Figure | Source type |
|---|---|---|
| Lifetime users | 15M+ claimed | Born press, funding coverage |
| Peak MAU / DAU | 2.5M / 650K (May 2024) | SLAY about page |
| Funding | $15M Series A Sep 2025 (Accel, Tencent), $25M total | TechCrunch, PocketGamer |
| Current revenue | ~$80K / month estimate, 150K installs / month | screensdesign estimate, unverified |
| US weekly downloads Q1 2025 | 46K falling to 32K | Sensor Tower |
| App Store rating | 4.8 from 5.7K ratings (your screenshot) | App Store |

**Learnings.**

1. **Shared ownership is the hook.** Reviewers consistently describe it as "we raise our penguin." The pet becomes a proxy for the relationship. That is the single most relevant thing for your idea and it is proven to pull installs at scale.
2. **It grew on TikTok, not on product.** The growth story is relentless short-form content of the penguin being cute and couples reacting. Installs spiked, then decayed. Revenue per user stayed low. Lesson: the concept is viral, but the loop under it was shallow.
3. **Nagging works until it backfires.** Users report notifications "every couple of hours" and the app telling one partner the other is "ignoring" them. Some love it, many churn or leave 1-star reviews. The mechanic (pet reports on your partner) is strong. The tuning was bad.
4. **Ads killed trust.** The most common complaint is interstitials and "free" actions gated behind rewarded ads. The 4.8 rating is a mix of a cute concept and review prompts, not loop satisfaction.
5. **Mini-games were filler.** Reviewers rate them 7.5/10 "because they earn coins," not because they are fun. Coins buy decorations. The economy is standard F2P and it is not what people came for.
6. **Pivot tells you where they got stuck.** Born moved from "pet" to "AI companions that fight loneliness" because the pet loop alone did not retain. The AI chat layer is their attempt at depth. For a small team that is expensive and off-thesis. We should get depth from the **relationship between two humans**, not from an LLM.

### 1.3 Snapchat Streaks (and TikTok's copy)

**Mechanics.** Two people must each send a snap within every rolling 24-hour window. Fire emoji plus count. Hourglass appears when time is running out. Since 2023 one free restore, then $0.99 per restore, with Snapchat+ getting freezes. TikTok launched "Streak Pets" in late 2025: message a friend daily, an egg hatches after 3 days, and the pet gets happier the longer the streak lasts. One pet per friendship.

**Learnings.**

1. **The obligation is to a person, not to an app.** This is why Snap streaks outlast every solo streak. You are not letting Duolingo down. You are letting Maya down. Your idea inherits this correctly.
2. **Loss aversion is the engine and the poison.** Big streaks create dread. A 47-day streak lost on day 48 produces shame and quitting, not restarting (Yu-kai Chou). Duolingo ran 600+ streak experiments and their biggest wins were all **protective**: streak freeze, streak saver notification, and streak wager (+14% D7). Design the recovery before you design the number.
3. **The cost of maintenance should be near zero, the value of the streak should be visible.** A snap takes 2 seconds. Snap streaks have no content requirement at all, which is also why they feel hollow. We want 10–30 seconds of real action, not zero.
4. **TikTok validated "streak = pet" at platform scale.** An egg that hatches on day 3 and gets happier over time is almost exactly your concept. That is good news (the mechanic resonates) and a constraint (you must be deeper than a sticker in a chat).
5. **Paid restore is accepted.** $0.99 to restore a streak is the most proven micro-transaction in this whole category.

### 1.4 Side notes from the wider category

- **Peridot (Niantic) shut down in 2026** after ~$2.9M lifetime revenue. Lesson: an expensive always-on pet (AR, heavy 3D) without a reason to return every day does not survive. Keep the tech cheap and the daily reason strong.
- **BeReal** peaked and faded. A daily prompt with no accumulation has no retention floor. Streaks plus a growing pet give accumulation.
- **Locket** (91M installs) proved the home-screen widget is the real distribution surface for two-person apps. The widget is not a feature, it is the product's front door.
- **Category economics** (your Buildercult slide): self-care pet apps earn ~$6.9M/month combined, Finch takes ~$3.7M, number two is ~$28K. One breakout, no second. The space is less "wide open" than it is "winner-take-most inside each vertical." The way in is a different vertical or a different relationship model, not a better Finch.

---

## 2. Where that leaves your idea

Your rough idea: Snapchat-style obligation, but the thing you keep alive is a growing pet or baby.

**What is strong about it.**
- Obligation to a person (Snap) plus a thing that visibly accumulates (Finch) plus shared ownership (Pengu). Each of those is individually proven. Nobody has combined all three well.
- The pet gives the streak a face and a story. The streak gives the pet stakes. They fix each other's weakness.

**What is risky about it.**
- "Pet dies if you miss" is the obvious design and it is the wrong one. Every data point says punitive streaks churn users at the first miss.
- "Baby" specifically is risky. It reads as either Tamagotchi-cute or deeply weird depending on who the two people are, and it narrows the audience to couples. Keep it as one skin option, not the identity.
- If the daily action is only "open the app," you have built TikTok's sticker. There has to be a small real-world or in-app action, or the growth means nothing.

### 2.1 Recommended positioning

**"A creature you can only raise together."**

- Unit of play: a **pair** (two humans, one creature). Groups can come later. Pairs are the proven unit for streaks and for Pengu, and they are simplest to balance.
- Daily obligation: each person completes **one small, self-chosen action** and "feeds" it to the creature. The action is the content of the streak. Examples: a 1-line check-in, a photo, a habit tick, a 30-second question answered about the other person.
- Growth: the creature only gains a growth point on days **both** people fed it. Solo days keep the creature alive and content but not growing. That is the key design decision and it is what makes the other person matter.
- Miss a day: nothing dies. The creature gets a visible "sleepy" state and the widget shows it. The streak count pauses rather than resets if the pair has a shield. Shields are earned (every 7 clean days) and purchasable.
- Over time: the creature evolves at milestones (day 3 hatch, 7, 14, 30, 60, 100, 365). Evolution is permanent. Even if the pair quits, the creature is a trophy. This gives you the accumulation Snap lacks.

### 2.2 Who it is for (pick one to launch)

1. **Couples, incl. long-distance** (Pengu's audience). Highest willingness to pay, highest emotional charge, highest churn when the relationship ends. Easiest to market on TikTok.
2. **Best-friend pairs 16–24** (Snap's audience). Largest, most viral, lowest willingness to pay, aggressive about ads.
3. **Accountability pairs** (gym buddy, study partner, sober buddy, two people doing the same habit). Smaller but durable, and it gives the daily action a real purpose. Retention should be the strongest here because the pet is the wrapper and the habit is the point.

**Recommendation: launch for 3 with a skin that works for 1.** Marketing can show couples because that is what spreads, but the product should be built around "we are both doing X every day." That keeps you out of Pengu's "cute but shallow" trap and out of the ad-funded teen market you cannot afford.

---

## 3. Core loop (v1)

```
Invite partner  ->  pick an egg + pick each person's daily action
      |
      v
[Daily]  Person A does action (10-30s)  ->  "feeds" creature  ->  widget updates for B
         Person B does action           ->  "feeds" creature  ->  both fed = growth point
      |
      v
[Evening] If one side unfed by 8pm local: creature "waits" on the other's widget (gentle nudge)
[Midnight] Day resolves: Both fed = +1 streak +1 growth. One fed = streak protected if shield, else paused. Zero = sleepy.
      |
      v
[Milestones] Day 3 hatch, 7/14/30/60/100 evolutions, cosmetics unlocked, shareable card
```

Design rules that fall out of the research:

- **Floor the cost.** Daily action must be completable in under 30 seconds from the widget or lock screen. Finch's "get out of bed counts" principle.
- **Make the other person the notification.** Instead of the app saying "feed your pet," the creature says "Maya already fed me today." Pengu proved this lands. Cap it at one nudge per day per person. Never say "ignoring."
- **Protect, don't punish.** Shields (streak freeze), one free restore per month, paid restore at $0.99. Streak pauses are shown as the creature napping, not as a loss.
- **Reward absence.** Something happens while you are away. Both fed means the creature "goes exploring" overnight and brings back a small thing in the morning (a sticker, a fact about your partner's answers, a cosmetic). Finch's adventure pattern.
- **Make growth permanent and visible.** Evolution stages are the status symbol. The pair's creature should look obviously different at day 30 vs day 3, and it should be shareable as an image or Story.
- **Keep the pet dumb.** No LLM chat in v1. Personality comes from animation states and from the two humans' inputs (the creature "remembers" the answers and replays them). This is cheaper, safer for 13+ users, and differentiates from Born's pivot.

---

## 4. What the daily "action" should be

This is the biggest open decision. Options, ranked:

| Option | Pros | Cons | Fits audience |
|---|---|---|---|
| **A. Same habit for both** (we both work out / read / no-phone-before-bed) | Real value, strongest retention logic, clear "why" | Needs honesty, no verification | Accountability pairs |
| **B. Daily question about each other** ("What's one thing that made you smile?") both answer, then see each other's | Very low effort, produces content for the creature to "remember," great for couples and LDR | Can feel like Paired/Agapé, question bank needs to be large | Couples, friends |
| **C. Photo or 1-line check-in** (Locket / BeReal style) | Zero friction, visual, widget-native | Hollow over time, BeReal fade risk | Teens |
| **D. User-defined per person** (A does pushups, B does journaling) | Flexible, Finch-like | Harder to explain, the "together" story is weaker | Everyone |

**Recommendation: ship A and B together.** Each person picks one habit (A). Every day the creature also asks one shared question (B). Feeding requires the habit tick; the question is the bonus that earns the overnight exploration. A gives the retention spine, B gives the emotional content and the shareable moments. C and D can be unlocked later.

---

## 5. Monetization (do not copy Pengu)

- **No interstitial or rewarded ads.** Pengu's 1-star reviews are the proof. Ads also cap you at teen-market ARPU.
- **Pair subscription, ~$4.99/mo or $29.99/yr, one purchase covers both people.** Buying for your partner is a gift, which converts better than buying for yourself. Unlocks: extra creatures (one per pair in free), full cosmetic shop, unlimited shields, memory book (the archive of answers and photos), evolution branches.
- **Micro-transactions only for protection and cosmetics.** $0.99 restore (Snap proved it), seasonal cosmetic packs. Never sell growth points. Growth has to be earned together or the whole thing is fake.
- **Target metric.** Finch converts at roughly 3–5% to Plus on estimates. With a pair model and a gift framing, aim for 5%+ of pairs.

---

## 6. Growth

- **Built-in loop.** The product is unusable alone. Every signup is an invite. Measure invite acceptance within 48 hours as the top-of-funnel metric. Give a solo "egg incubating" state so the inviter is not staring at a dead screen while waiting.
- **Shareable artifacts.** Hatch day card, each evolution, the 100-day card. Designed for Stories and TikTok with the pair's names on it.
- **UGC ads from day 1**, copying Finch's playbook: real couples or friends reacting to the creature nudging them. The hook line writes itself: "my best friend and I have to keep this thing alive."
- **Widget as front door.** Lock screen and home screen widgets showing the creature's state and whether the other person has fed it. This is also the viral surface, since people screenshot their home screens.

---

## 7. Risks and how to defuse them

| Risk | Why it is real | Mitigation |
|---|---|---|
| Breakup / friendship ends | Pengu's core churn cause | "Adoption": one person keeps the creature solo, can re-pair it later. Archive instead of delete. |
| Nag fatigue | Pengu reviews | One nudge per person per day, user-set quiet hours, never negative wording. |
| Punitive streak = quit on first miss | Duolingo, Yu-kai Chou | Shields, pause not reset, free monthly restore. |
| Hollow daily action | BeReal, Snap | Habit tick plus shared question. Measure "meaningful feed" not just opens. |
| Viral spike then decay | Pengu 2024–25 | Do not spend on TikTok until D30 retention of pairs is above ~25%. |
| Minors and safety | 13+ audience, two-person messaging | No free-text chat in v1. Structured answers only. Report and block. COPPA-safe onboarding. |
| "Baby" framing | Narrow and odd | Creature first. Baby, plant, dragon, penguin as skins. |

---

## 8. Suggested MVP scope (8–10 weeks, 1–2 engineers)

**In.**
- Pair invite via link, one creature per pair, three egg skins.
- Each person sets one daily habit. One daily shared question from a bank of ~200.
- Feed, growth points, streak with shields, pause/restore logic, 6 evolution stages.
- Push: one "partner fed me" nudge, one "day ends soon" nudge, both capped.
- iOS first, home + lock screen widgets. Android in phase 2.
- Share card at hatch and each evolution.
- Pair subscription via RevenueCat or StoreKit 2, $0.99 restore.
- Analytics on: invite accept rate, both-fed rate, D1/D7/D30 per pair, shield usage, restore purchases.

**Out (for now).**
- Groups larger than two, AI chat, mini-games, decoratable rooms, Android, free-text messaging, multiple creatures per pair.

**Tech, kept boring on purpose.** Swift/SwiftUI + WidgetKit (widgets are non-negotiable and they are much better native). Supabase or Firebase for auth, pair state and push. Lottie or Rive for creature states (2D, cheap, looks great on a widget). Server-side day resolution at each user's local midnight, with the pair's streak computed from both sides.

---

## 9. Decisions I need from you

1. **Launch audience:** accountability pairs (my recommendation), couples, or teen friends?
2. **Daily action:** habit + shared question (my recommendation), or something else?
3. **Creature identity:** one hero creature like Pengu's penguin, or egg-with-skins? Hero creature markets better. Skins retain better.
4. **Platform:** iOS-only first, yes or no?
5. **Monetization stance:** confirm no ads.

Once those are set, the next doc is a screen-by-screen spec plus the data model for pairs, feeds and day resolution.

---

## Sources

Finch: [Deconstructor of Fun widget teardown](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl), [Sparrow Apps "$30M ARR"](https://blog.sparrowapps.io/p/finch-how-a-self-care-app-hit-30m-arr-without-vc-money), [Pratt design critique 2026](https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/), [Pratt design critique 2025](https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/), [YourStory review](https://yourstory.com/2022/06/app-review-self-care-pet-finch-gamifies-mental-wellbeing), [Sensor Tower iOS](https://app.sensortower.com/overview/1528595748?country=US), [Sensor Tower Android](https://app.sensortower.com/overview/com.finch.finch?country=US), [AppSprint revenue estimate](https://appsprint.app/finch-monthly-recurring-revenue), [Adapty paywall](https://adapty.io/paywall-library/finch/), [RecurDash pricing](https://recurdash.com/subscription-pricing/finch), [Internet Matters on Tree Town](https://www.internetmatters.org/advice/apps-and-platforms/wellbeing/finch/), [Selfpause review](https://www.selfpause.com/resources/finch).

Pengu / Born: [App Store listing](https://apps.apple.com/us/app/friends-pengu-bao-mellow/id6462927800), [Google Play listing](https://play.google.com/store/apps/details?id=com.slay.pengu&hl=en), [TechCrunch Series A](https://techcrunch.com/2025/09/10/born-maker-of-virtual-pet-pengu-raises-15m-to-launch-a-new-wave-of-social-ai-companions/), [PocketGamer](https://www.pocketgamer.biz/ai-powered-pengu-app-maker-born-raises-15m/), [Born press](https://www.born.com/press), [GamesBeat seed round](https://gamesbeat.com/pengu-creator-slay-raises-5m-for-social-gaming-platform/), [SLAY about page](https://www.slay.cool/about-us), [Shortimize TikTok strategy](https://www.shortimize.com/blog/tiktok-strategies-pet-penguin-app-generating-millions-in-revenue), [Sensor Tower UK Q1 2024](https://sensortower.com/blog/2024-q1-unified-top-5-virtual%20pet-units-gb-62f83d1bf5dff39390bc09c4), [Sensor Tower US Q1 2025](https://sensortower.com/blog/2025-q1-unified-top-5-virtual%20pet-units-us-62f83d1bf5dff39390bc09c4), [screensdesign estimate](https://screensdesign.com/showcase/pengu-raise-virtual-ai-pets), [JustUseApp reviews](https://justuseapp.com/en/app/6462927800/pengu-virtual-pets/reviews), [Smart Snout 2026 guide](https://thesmartsnout.com/2026/02/21/virtual-pet-apps-guide-2026-ai-coparenting/), [Lemon8 review](https://www.lemon8-app.com/@kangaruyuan/7426599558748127760?region=sg).

Streaks: [Duolingo on streaks](https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals), [Lenny's podcast summary with Duolingo retention PM](https://www.recall.it/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team), [Econsultancy Duolingo A/B tests](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/), [Yu-kai Chou on streak recovery](https://yukaichou.com/?p=38981), [iMore on paid Snapstreak restore](https://www.imore.com/apps/social-apps/snapchats-snapstreak-restore-feature-will-soon-cost-you-money-via-in-app-purchase), [TechCrunch on Snapstreak pause](https://techcrunch.com/2023/03/01/snapchat-will-now-let-you-pause-your-snap-streaks/amp/), [Dexerto on TikTok Streak Pets](https://www.dexerto.com/tiktok/how-to-get-a-streak-pet-on-tiktok-2990155), [MakeTechEasier on TikTok Streak Pets](https://maketecheasier.com/get-streak-pet-tiktok/).

Category: [PocketGamer on Peridot shutdown](https://www.pocketgamer.biz/niantic-to-shut-down-peridot-mobile-as-ar-ambitions-shift-beyond-smartphones/), [MobileGamer on Peridot](https://mobilegamer.biz/niantic-is-closing-its-virtual-pet-game-peridot/), [Social Samosa on Locket installs](https://www.socialsamosa.com/news-2/locket-91-mn-installs-10622388), [Thred on Gen Z social app sustainability](https://thred.com/newsletters/are-gen-z-social-media-apps-sustainable-long-term/).
