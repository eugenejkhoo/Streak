import WidgetKit
import SwiftUI
import RaftKit

struct RaftSmallWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RaftSmall", provider: RaftProvider()) { entry in
            SmallView(entry: entry).containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Pip")
        .description("Your creature and who has fed it today.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct SmallView: View {
    let entry: RaftEntry
    var body: some View {
        let s = entry.snapshot
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: s?.creature?.hibernating == true ? "zzz" : "pawprint.fill")
                .font(.system(size: 40)).opacity(s?.band == .droopy ? 0.5 : 1)
            Spacer()
            HStack(spacing: 6) {
                dot(s?.me.fedToday ?? false)
                dot(s?.partner?.fedToday ?? false)
                Spacer()
                if let s { Label("\(s.streak)", systemImage: "flame.fill").font(.caption.weight(.semibold)) }
            }
            if let s, let p = s.partner {
                Text(line(s, p)).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            }
        }
        .widgetURL(URL(string: "raft://feed"))
    }
    private func dot(_ fed: Bool) -> some View {
        Circle().fill(fed ? Color.green : Color.secondary.opacity(0.3)).frame(width: 10, height: 10)
    }
    private func line(_ s: PairSnapshot, _ p: Member) -> String {
        switch (s.me.fedToday, p.fedToday) {
        case (true, true): "Both fed"
        case (false, true): "\(p.displayName) fed · you haven't"
        case (true, false): "You fed · waiting on \(p.displayName)"
        case (false, false): "Nobody yet"
        }
    }
}

struct RaftLockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RaftLock", provider: RaftProvider()) { entry in
            let s = entry.snapshot
            let fedCount = Double((s?.me.fedToday == true ? 1 : 0) + (s?.partner?.fedToday == true ? 1 : 0))
            Gauge(value: fedCount, in: 0...2) { Image(systemName: "pawprint.fill") }
                .gaugeStyle(.accessoryCircularCapacity)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Fed today")
        .description("Fills as each of you feeds.")
        .supportedFamilies([.accessoryCircular])
    }
}
