import SwiftUI
import RaftKit

/// Incubating state: the egg is here, the partner is not yet.
struct InviteView: View {
    @Environment(AppSession.self) private var session
    let token: String

    private var link: URL { URL(string: "https://raft.app/join/\(token)")! }

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "oval.fill").font(.system(size: 96)).foregroundStyle(.tint.opacity(0.6))
                .symbolEffect(.pulse)
            Text("The egg wakes when they join.").font(.title3.weight(.semibold))
            Text("Send the link. It works for 7 days.").foregroundStyle(.secondary)
            ShareLink(item: link, message: Text("Raise something with me? It only grows if we both show up.")) {
                Label("Send invite", systemImage: "paperplane.fill").frame(maxWidth: .infinity).padding()
            }
            .buttonStyle(.borderedProminent).padding(.horizontal, 32)
            Button("I've been invited instead") { /* TODO: paste-token sheet */ }.font(.footnote)
            Spacer()
            Button("Check again") { Task { await session.refresh() } }.padding(.bottom, 24)
        }
    }
}
