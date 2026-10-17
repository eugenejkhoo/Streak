import WidgetKit
import SwiftUI

@main
struct RaftWidgetBundle: WidgetBundle {
    var body: some Widget {
        RaftSmallWidget()
        RaftLockWidget()
    }
}
