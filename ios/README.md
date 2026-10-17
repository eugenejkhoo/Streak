# Raft iOS

SwiftUI app plus WidgetKit extension, sharing `RaftKit` (models, local-day logic, App Group snapshot store, API client).

## Generate the project

```sh
brew install xcodegen
cd ios && xcodegen generate && open Raft.xcodeproj
```

Set `DEVELOPMENT_TEAM`, `RAFT_SUPABASE_URL` and `RAFT_SUPABASE_ANON_KEY` in `project.yml` (or an xcconfig). Register `group.app.raft.shared` and the Sign in with Apple capability on the App ID.

## What is here

| Path | State |
|---|---|
| `Packages/RaftKit` | Models mirroring the DB enums, `LocalDay` (03:00 boundary), `SnapshotStore` (App Group JSON), `RaftAPI` (Sign in with Apple exchange, edge functions, PostgREST reads). XCTest for local day and bands. |
| `Raft/RaftApp.swift` | Root state machine: signed out, needs pair, incubating, paired. Handles `raft.app/join/<token>` universal links. |
| `Raft/Services/AppSession.swift` | Auth tokens in Keychain, refresh, writes the widget snapshot. `refresh()` still fetches only the pair row; members, creature and today's feeds need one `pair_view()` RPC. |
| `Raft/Services/HealthService.swift` | HealthKit reads for the four Health habit kinds using the 03:00 day, background delivery hook. |
| `Raft/Features/Onboarding` | Welcome with Sign in with Apple, Crew or Couple picker, incubating invite screen with ShareLink. |
| `Raft/Features/Home` | Creature scene placeholder (SF Symbol until Rive rigs exist), today strip, feed button and sheet, bond and expedition cards. |
| `RaftWidget` | Small and medium home widget, lock screen circular gauge. Timeline flips at the next 03:00. |

## Not written yet

Habit setup screen, Bond answer flow, photo feeds (upload to Storage then `log-feed` with `photoUrl`), hatch animation and gating UI, habitat, memory book, paywall and StoreKit 2, push registration, `pair_view()` RPC on the server.

## Note

This skeleton was written without Xcode available, so it has not been compiled. Expect a handful of small fixes on first build, most likely around `HKSampleQueryDescriptor` predicates and the `@Observable` environment injection.
