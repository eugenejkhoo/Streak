import Foundation

public enum PairMode: String, Codable, Sendable { case crew, couple }
public enum HabitKind: String, Codable, Sendable, CaseIterable {
    case manual, photo
    case healthWorkout = "health_workout"
    case healthSteps = "health_steps"
    case healthSleep = "health_sleep"
    case healthMindful = "health_mindful"

    public var isHealth: Bool { rawValue.hasPrefix("health_") }
    public var title: String {
        switch self {
        case .manual: "I'll tap it"
        case .photo: "Photo required"
        case .healthWorkout: "Any workout"
        case .healthSteps: "Steps"
        case .healthSleep: "Sleep"
        case .healthMindful: "Mindful minutes"
        }
    }
}
public enum FeedSource: String, Codable, Sendable { case manual, photo, health, override }
public enum Stage: String, Codable, Sendable { case egg, hatchling, juvenile, adolescent, adult }
public enum Tier: String, Codable, Sendable { case common, uncommon, rare, legendary }
public enum PairDayState: String, Codable, Sendable {
    case pending, bothFed = "both_fed", shielded, atRisk = "at_risk", restored
    case missedOne = "missed_one", missedNone = "missed_none"
}

public struct Member: Codable, Sendable, Identifiable, Equatable {
    public var id: UUID
    public var displayName: String
    public var fedToday: Bool
    public var answeredToday: Bool
    public init(id: UUID, displayName: String, fedToday: Bool, answeredToday: Bool) {
        self.id = id; self.displayName = displayName; self.fedToday = fedToday; self.answeredToday = answeredToday
    }
}

public struct Creature: Codable, Sendable, Equatable {
    public var speciesId: String
    public var tier: Tier
    public var shiny: Bool
    public var stage: Stage
    public var growthDays: Int
    public var hibernating: Bool
    public var hatchReady: Bool
    public init(speciesId: String, tier: Tier, shiny: Bool, stage: Stage, growthDays: Int, hibernating: Bool, hatchReady: Bool) {
        self.speciesId = speciesId; self.tier = tier; self.shiny = shiny; self.stage = stage
        self.growthDays = growthDays; self.hibernating = hibernating; self.hatchReady = hatchReady
    }
}

/// Everything the home screen and the widgets need, in one struct.
/// The app writes it to the App Group after every sync; widgets only read it.
public struct PairSnapshot: Codable, Sendable, Equatable {
    public var pairId: UUID
    public var mode: PairMode
    public var me: Member
    public var partner: Member?
    public var creature: Creature?
    public var streak: Int
    public var shields: Int
    public var vitality: Int
    public var atRiskUntil: Date?
    public var localDate: String
    public var updatedAt: Date

    public init(pairId: UUID, mode: PairMode, me: Member, partner: Member?, creature: Creature?, streak: Int, shields: Int, vitality: Int, atRiskUntil: Date?, localDate: String, updatedAt: Date) {
        self.pairId = pairId; self.mode = mode; self.me = me; self.partner = partner; self.creature = creature
        self.streak = streak; self.shields = shields; self.vitality = vitality; self.atRiskUntil = atRiskUntil
        self.localDate = localDate; self.updatedAt = updatedAt
    }

    public var bothFedToday: Bool { me.fedToday && (partner?.fedToday ?? false) }
    public var band: VitalityBand { VitalityBand(vitality) }
}

public enum VitalityBand: String, Sendable {
    case droopy, normal, bright, glowing
    public init(_ v: Int) {
        self = v > 90 ? .glowing : v >= 70 ? .bright : v >= 40 ? .normal : .droopy
    }
}
