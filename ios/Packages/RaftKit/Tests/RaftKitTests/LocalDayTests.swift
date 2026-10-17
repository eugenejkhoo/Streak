import XCTest
@testable import RaftKit

final class LocalDayTests: XCTestCase {
    let london = TimeZone(identifier: "Europe/London")!
    let la = TimeZone(identifier: "America/Los_Angeles")!

    func testBoundaryAt3am() {
        // 2026-10-18 00:30Z = 01:30 BST -> previous day
        let t = ISO8601DateFormatter().date(from: "2026-10-18T00:30:00Z")!
        XCTAssertEqual(LocalDay.localDate(t, in: london), "2026-10-17")
        let t2 = ISO8601DateFormatter().date(from: "2026-10-18T02:00:00Z")!
        XCTAssertEqual(LocalDay.localDate(t2, in: london), "2026-10-18")
    }

    func testNextBoundary() {
        let t = ISO8601DateFormatter().date(from: "2026-10-17T20:00:00Z")! // 13:00 PDT
        XCTAssertEqual(LocalDay.nextBoundary(after: t, in: la), ISO8601DateFormatter().date(from: "2026-10-18T10:00:00Z")!)
    }

    func testVitalityBands() {
        XCTAssertEqual(VitalityBand(39), .droopy)
        XCTAssertEqual(VitalityBand(40), .normal)
        XCTAssertEqual(VitalityBand(70), .bright)
        XCTAssertEqual(VitalityBand(91), .glowing)
    }
}
