import SwiftUI
import RaftKit

@main
struct RaftApp: App {
    @State private var session = AppSession()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .onOpenURL { url in Task { await session.handle(url: url) } }
                .task { await session.restore() }
        }
    }
}

struct RootView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        switch session.state {
        case .loading: ProgressView()
        case .signedOut: WelcomeView()
        case .needsPair: ModePickerView()
        case .incubating(let token): InviteView(token: token)
        case .paired: HomeView()
        }
    }
}
