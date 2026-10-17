// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "RaftKit",
    platforms: [.iOS(.v17)],
    products: [.library(name: "RaftKit", targets: ["RaftKit"])],
    targets: [
        .target(name: "RaftKit"),
        .testTarget(name: "RaftKitTests", dependencies: ["RaftKit"]),
    ]
)
