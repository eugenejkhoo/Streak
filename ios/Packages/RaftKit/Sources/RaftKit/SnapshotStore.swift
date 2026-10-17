import Foundation

/// App Group file shared between the app and the widget extension.
public enum SnapshotStore {
    public static let appGroup = "group.app.raft.shared"
    static let fileName = "pair-snapshot.json"

    static var url: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
            .appendingPathComponent(fileName)
    }

    public static func load() -> PairSnapshot? {
        guard let url, let data = try? Data(contentsOf: url) else { return nil }
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        return try? dec.decode(PairSnapshot.self, from: data)
    }

    public static func save(_ s: PairSnapshot) throws {
        guard let url else { return }
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        try enc.encode(s).write(to: url, options: .atomic)
    }

    public static func clear() {
        guard let url else { return }
        try? FileManager.default.removeItem(at: url)
    }
}
