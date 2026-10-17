import Foundation
import Observation
import RaftKit
import WidgetKit

/// Top-level state machine. Owns auth, the API client and the current snapshot.
@Observable
@MainActor
final class AppSession {
    enum State: Equatable {
        case loading, signedOut, needsPair
        case incubating(inviteToken: String)
        case paired
    }

    private(set) var state: State = .loading
    private(set) var snapshot: PairSnapshot?
    var lastError: String?

    let api: RaftAPI
    private let keychain = Keychain(service: "app.raft.auth")

    init() {
        let info = Bundle.main.infoDictionary ?? [:]
        let url = URL(string: info["RAFT_SUPABASE_URL"] as? String ?? "https://invalid.local")!
        let key = info["RAFT_SUPABASE_ANON_KEY"] as? String ?? ""
        api = RaftAPI(config: .init(url: url, anonKey: key))
    }

    // MARK: Lifecycle

    func restore() async {
        guard let token = keychain.read("access_token") else { state = .signedOut; return }
        await api.setAccessToken(token)
        await refresh()
    }

    func signedIn(accessToken: String, refreshToken: String) async {
        keychain.write("access_token", accessToken)
        keychain.write("refresh_token", refreshToken)
        await api.setAccessToken(accessToken)
        await refresh()
    }

    func signOut() {
        keychain.delete("access_token")
        keychain.delete("refresh_token")
        SnapshotStore.clear()
        snapshot = nil
        state = .signedOut
    }

    // MARK: Pairing

    func createPair(mode: PairMode, displayName: String) async {
        do {
            let r = try await api.createPair(mode: mode, displayName: displayName)
            state = .incubating(inviteToken: r.inviteToken)
        } catch { lastError = error.localizedDescription }
    }

    func handle(url: URL) async {
        // raft.app/join/<token>
        guard url.pathComponents.count >= 3, url.pathComponents[1] == "join" else { return }
        let token = url.pathComponents[2]
        do {
            _ = try await api.joinPair(token: token, displayName: "Me")
            await refresh()
        } catch { lastError = error.localizedDescription }
    }

    // MARK: Data

    /// Pull the pair view and write the shared snapshot for the widgets.
    func refresh() async {
        struct PairRow: Decodable {
            let id: UUID; let mode: PairMode; let status: String; let streak: Int; let shields: Int
            let invite_token: String?; let at_risk_until: Date?
        }
        do {
            let pairs: [PairRow] = try await api.select("pairs?select=id,mode,status,streak,shields,invite_token,at_risk_until&limit=1", as: [PairRow].self)
            guard let p = pairs.first else { state = .needsPair; return }
            if p.status == "pending" { state = .incubating(inviteToken: p.invite_token ?? ""); return }
            // TODO: members, creature, today's feeds and answers. One RPC `pair_view()` is cleaner than four selects.
            let me = Member(id: UUID(), displayName: "Me", fedToday: false, answeredToday: false)
            let snap = PairSnapshot(pairId: p.id, mode: p.mode, me: me, partner: nil, creature: nil, streak: p.streak, shields: p.shields, vitality: 70, atRiskUntil: p.at_risk_until, localDate: LocalDay.localDate(), updatedAt: .now)
            snapshot = snap
            try? SnapshotStore.save(snap)
            WidgetCenter.shared.reloadAllTimelines()
            state = .paired
        } catch {
            lastError = error.localizedDescription
            if case .loading = state { state = .signedOut }
        }
    }

    func feed(source: FeedSource, note: String? = nil, photoUrl: String? = nil) async {
        do {
            _ = try await api.logFeed(source: source, note: note, photoUrl: photoUrl)
            await refresh()
        } catch { lastError = error.localizedDescription }
    }
}
