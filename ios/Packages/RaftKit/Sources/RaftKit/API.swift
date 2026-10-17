import Foundation

/// Minimal Supabase client: PostgREST reads under RLS, edge functions for writes.
/// Intentionally dependency-free so the package builds anywhere. Swap for
/// supabase-swift later if realtime is needed.
public actor RaftAPI {
    public struct Config: Sendable {
        public var url: URL
        public var anonKey: String
        public init(url: URL, anonKey: String) { self.url = url; self.anonKey = anonKey }
    }

    public enum APIError: Error, LocalizedError {
        case http(Int, String)
        case notSignedIn
        case server(String)
        public var errorDescription: String? {
            switch self {
            case .http(let c, let b): "HTTP \(c): \(b)"
            case .notSignedIn: "Not signed in"
            case .server(let r): r
            }
        }
    }

    private let config: Config
    private var accessToken: String?
    private let session = URLSession(configuration: .default)

    public init(config: Config) { self.config = config }

    public func setAccessToken(_ t: String?) { accessToken = t }

    // MARK: Auth

    /// Exchange a Sign in with Apple identity token for a Supabase session.
    public func signInWithApple(idToken: String, nonce: String) async throws -> (accessToken: String, refreshToken: String, userId: UUID) {
        var req = URLRequest(url: config.url.appendingPathComponent("auth/v1/token").appending(queryItems: [.init(name: "grant_type", value: "id_token")]))
        req.httpMethod = "POST"
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["provider": "apple", "id_token": idToken, "nonce": nonce])
        let (data, resp) = try await session.data(for: req)
        try Self.check(resp, data)
        struct R: Decodable { let access_token: String; let refresh_token: String; let user: U; struct U: Decodable { let id: UUID } }
        let r = try JSONDecoder().decode(R.self, from: data)
        accessToken = r.access_token
        return (r.access_token, r.refresh_token, r.user.id)
    }

    // MARK: Edge functions

    public struct CreatePairResponse: Decodable, Sendable { public let pairId: UUID; public let inviteToken: String }
    public func createPair(mode: PairMode, displayName: String) async throws -> CreatePairResponse {
        try await function("create-pair", body: ["mode": mode.rawValue, "displayName": displayName, "tz": TimeZone.current.identifier])
    }

    public struct JoinPairResponse: Decodable, Sendable { public let pairId: UUID }
    public func joinPair(token: String, displayName: String) async throws -> JoinPairResponse {
        try await function("join-pair", body: ["token": token, "displayName": displayName, "tz": TimeZone.current.identifier])
    }

    public struct LogFeedResponse: Decodable, Sendable { public let localDate: String }
    public func logFeed(source: FeedSource, note: String? = nil, photoUrl: String? = nil, healthValue: Double? = nil) async throws -> LogFeedResponse {
        var body: [String: Any] = ["source": source.rawValue, "tz": TimeZone.current.identifier]
        if let note { body["note"] = note }
        if let photoUrl { body["photoUrl"] = photoUrl }
        if let healthValue { body["healthValue"] = healthValue }
        return try await function("log-feed", body: body)
    }

    private func function<T: Decodable>(_ name: String, body: [String: Any]) async throws -> T {
        guard let accessToken else { throw APIError.notSignedIn }
        var req = URLRequest(url: config.url.appendingPathComponent("functions/v1/\(name)"))
        req.httpMethod = "POST"
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await session.data(for: req)
        try Self.check(resp, data)
        struct Envelope<U: Decodable>: Decodable { let ok: Bool; let reason: String? }
        if let env = try? JSONDecoder().decode(Envelope<T>.self, from: data), !env.ok {
            throw APIError.server(env.reason ?? "unknown")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: PostgREST

    /// Generic read under RLS. `path` is a PostgREST query, e.g. "pairs?select=*".
    public func select<T: Decodable>(_ path: String, as: T.Type) async throws -> T {
        guard let accessToken else { throw APIError.notSignedIn }
        var req = URLRequest(url: config.url.appendingPathComponent("rest/v1/").appending(path: path))
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await session.data(for: req)
        try Self.check(resp, data)
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        return try dec.decode(T.self, from: data)
    }

    private static func check(_ resp: URLResponse, _ data: Data) throws {
        guard let http = resp as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
    }
}
