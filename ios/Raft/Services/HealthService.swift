import Foundation
import HealthKit
import RaftKit

/// Reads today's value for a Health habit and asks the server to feed when the
/// threshold is met. Background delivery wakes this when new samples land.
final class HealthService {
    private let store = HKHealthStore()

    static var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    private func type(for kind: HabitKind) -> HKObjectType? {
        switch kind {
        case .healthWorkout: HKObjectType.workoutType()
        case .healthSteps: HKQuantityType(.stepCount)
        case .healthSleep: HKCategoryType(.sleepAnalysis)
        case .healthMindful: HKCategoryType(.mindfulSession)
        default: nil
        }
    }

    func requestAccess(for kind: HabitKind) async throws {
        guard let t = type(for: kind) else { return }
        try await store.requestAuthorization(toShare: [], read: [t])
    }

    /// Today's value in the unit the server expects: workout minutes, steps, sleep hours, mindful minutes.
    /// "Today" uses the 03:00 boundary so a late workout counts for the right day.
    func todayValue(for kind: HabitKind) async throws -> Double {
        let start = LocalDay.nextBoundary(after: .now).addingTimeInterval(-86_400)
        let pred = HKQuery.predicateForSamples(withStart: start, end: .now)
        switch kind {
        case .healthSteps:
            let q = HKStatisticsQueryDescriptor(predicate: .quantitySample(type: HKQuantityType(.stepCount), predicate: pred), options: .cumulativeSum)
            return try await q.result(for: store)?.sumQuantity()?.doubleValue(for: .count()) ?? 0
        case .healthWorkout:
            let q = HKSampleQueryDescriptor(predicates: [.workout(pred)], sortDescriptors: [])
            return try await q.result(for: store).reduce(0) { $0 + $1.duration / 60 }
        case .healthSleep:
            let q = HKSampleQueryDescriptor(predicates: [.categorySample(type: HKCategoryType(.sleepAnalysis), predicate: pred)], sortDescriptors: [])
            let asleep = try await q.result(for: store).filter { HKCategoryValueSleepAnalysis.allAsleepValues.contains(.init(rawValue: $0.value)!) }
            return asleep.reduce(0) { $0 + $1.endDate.timeIntervalSince($1.startDate) } / 3600
        case .healthMindful:
            let q = HKSampleQueryDescriptor(predicates: [.categorySample(type: HKCategoryType(.mindfulSession), predicate: pred)], sortDescriptors: [])
            return try await q.result(for: store).reduce(0) { $0 + $1.endDate.timeIntervalSince($1.startDate) / 60 }
        default:
            return 0
        }
    }

    /// Register for background delivery so new samples trigger a sync.
    func enableBackgroundDelivery(for kind: HabitKind) async throws {
        guard let t = type(for: kind) as? HKSampleType else { return }
        try await store.enableBackgroundDelivery(for: t, frequency: .hourly)
    }
}
