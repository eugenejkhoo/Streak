import SwiftUI
import RaftKit

struct SettingsView: View {
    @Environment(AppSession.self) private var session
    var body: some View {
        List {
            Section("Pair") {
                LabeledContent("Mode", value: session.snapshot?.mode.rawValue.capitalized ?? "")
                NavigationLink("My habit") { Text("Habit editor TODO") }
                NavigationLink("Quiet hours") { Text("Quiet hours TODO") }
            }
            Section("Pair Plus") { Text("One purchase covers both of you.").foregroundStyle(.secondary) }
            Section { Button("Sign out", role: .destructive) { session.signOut() } }
        }
        .navigationTitle("Settings")
    }
}
