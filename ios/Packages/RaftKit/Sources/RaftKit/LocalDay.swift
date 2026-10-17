import Foundation

/// Mirror of supabase/functions/_shared/localDay.ts. The server is the source
/// of truth; the client uses this only to label "today" and schedule widget
/// timelines. Keep the two in sync.
public enum LocalDay {
    public static let boundaryHour = 3

    /// "YYYY-MM-DD" for the local day that `instant` belongs to, with a 03:00 boundary.
    public static func localDate(_ instant: Date = .now, in tz: TimeZone = .current) -> String {
        let shifted = instant.addingTimeInterval(-Double(boundaryHour) * 3600)
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        let c = cal.dateComponents([.year, .month, .day], from: shifted)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    /// Instant when the current local day closes (next 03:00 local).
    public static func nextBoundary(after instant: Date = .now, in tz: TimeZone = .current) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        var comps = cal.dateComponents([.year, .month, .day], from: instant)
        comps.hour = boundaryHour
        comps.minute = 0
        comps.second = 0
        let todayBoundary = cal.date(from: comps)!
        if instant < todayBoundary { return todayBoundary }
        return cal.date(byAdding: .day, value: 1, to: todayBoundary)!
    }
}
