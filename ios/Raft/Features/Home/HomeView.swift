import SwiftUI
import RaftKit

struct HomeView: View {
    @Environment(AppSession.self) private var session
    @State private var showFeed = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    CreatureScene(snapshot: session.snapshot).frame(height: 300)
                    if let s = session.snapshot {
                        TodayStrip(snapshot: s)
                        FeedButton(fed: s.me.fedToday) { showFeed = true }
                        BondCard(snapshot: s)
                        ExpeditionCard()
                    }
                }
                .padding()
            }
            .navigationTitle(session.snapshot?.creature == nil ? "Egg" : "Pip")
            .toolbar {
                NavigationLink { SettingsView() } label: { Image(systemName: "gearshape") }
            }
            .refreshable { await session.refresh() }
            .sheet(isPresented: $showFeed) { FeedSheet() }
        }
    }
}

struct CreatureScene: View {
    let snapshot: PairSnapshot?
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24).fill(LinearGradient(colors: [.teal.opacity(0.25), .blue.opacity(0.15)], startPoint: .top, endPoint: .bottom))
            VStack(spacing: 8) {
                // Placeholder until the Rive rigs land. Band drives opacity/scale for now.
                Image(systemName: snapshot?.creature?.hibernating == true ? "zzz" : "pawprint.fill")
                    .font(.system(size: 96))
                    .scaleEffect(scale)
                    .opacity(opacity)
                    .animation(.easeInOut(duration: 0.6), value: snapshot?.vitality)
                if let c = snapshot?.creature {
                    Text("\(c.stage.rawValue.capitalized) · day \(c.growthDays)").font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
    }
    private var scale: CGFloat {
        switch snapshot?.band ?? .normal { case .droopy: 0.85; case .normal: 1; case .bright: 1.05; case .glowing: 1.1 }
    }
    private var opacity: Double { snapshot?.band == .droopy ? 0.6 : 1 }
}

struct TodayStrip: View {
    let snapshot: PairSnapshot
    var body: some View {
        HStack(spacing: 16) {
            avatar(snapshot.me)
            if let p = snapshot.partner { avatar(p) } else { Text("Waiting").foregroundStyle(.secondary) }
            Spacer()
            Label("\(snapshot.streak)", systemImage: "flame.fill").font(.headline)
            HStack(spacing: 3) { ForEach(0..<snapshot.shields, id: \.self) { _ in Image(systemName: "shield.fill").font(.caption2) } }
            Gauge(value: Double(snapshot.vitality), in: 0...100) { EmptyView() }
                .gaugeStyle(.accessoryCircularCapacity).scaleEffect(0.6).frame(width: 36, height: 36)
        }
        .padding(.horizontal, 4)
    }
    private func avatar(_ m: Member) -> some View {
        VStack(spacing: 4) {
            ZStack(alignment: .bottomTrailing) {
                Circle().fill(.secondary.opacity(0.2)).frame(width: 40, height: 40)
                    .overlay(Text(String(m.displayName.prefix(1))).font(.headline))
                Image(systemName: m.fedToday ? "checkmark.circle.fill" : "circle").foregroundStyle(m.fedToday ? .green : .secondary).background(Circle().fill(.background))
            }
            Text(m.displayName).font(.caption2)
        }
    }
}

struct FeedButton: View {
    let fed: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Label(fed ? "Fed" : "Feed", systemImage: fed ? "checkmark" : "fork.knife")
                .font(.title3.weight(.semibold)).frame(maxWidth: .infinity).padding()
        }
        .buttonStyle(.borderedProminent).tint(fed ? .green : .accentColor).disabled(fed)
    }
}

struct BondCard: View {
    let snapshot: PairSnapshot
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Today's question", systemImage: "bubble.left.and.bubble.right").font(.headline)
            Text("What's the one thing you have to do today, no matter what?").font(.body)
            HStack {
                Text(snapshot.me.answeredToday ? "You answered" : "Answer").font(.footnote)
                Spacer()
                if let p = snapshot.partner { Text(p.answeredToday ? "\(p.displayName) answered" : "Waiting for \(p.displayName)").font(.footnote).foregroundStyle(.secondary) }
            }
        }
        .padding().background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

struct ExpeditionCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("This week", systemImage: "map").font(.headline)
            Text("Both feed 5 of 7 days").font(.body)
            ProgressView(value: 0.4)
        }
        .padding().background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

struct FeedSheet: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var note = ""
    var body: some View {
        NavigationStack {
            Form {
                Section("Today") { TextField("Note (optional)", text: $note) }
                Section { Button("Feed") { Task { await session.feed(source: .manual, note: note.isEmpty ? nil : note); dismiss() } } }
            }
            .navigationTitle("Feed").toolbar { Button("Cancel") { dismiss() } }
        }
        .presentationDetents([.medium])
    }
}
