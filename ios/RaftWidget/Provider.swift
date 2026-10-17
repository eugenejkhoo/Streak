import WidgetKit
import RaftKit

struct RaftEntry: TimelineEntry {
    let date: Date
    let snapshot: PairSnapshot?
}

struct RaftProvider: TimelineProvider {
    func placeholder(in context: Context) -> RaftEntry { RaftEntry(date: .now, snapshot: nil) }
    func getSnapshot(in context: Context, completion: @escaping (RaftEntry) -> Void) {
        completion(RaftEntry(date: .now, snapshot: SnapshotStore.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<RaftEntry>) -> Void) {
        // One entry now, one at the next 03:00 boundary so "today" flips without a push.
        let now = Date.now
        let entries = [RaftEntry(date: now, snapshot: SnapshotStore.load()),
                       RaftEntry(date: LocalDay.nextBoundary(after: now), snapshot: SnapshotStore.load())]
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}
