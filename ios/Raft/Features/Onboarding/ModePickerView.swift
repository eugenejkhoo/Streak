import SwiftUI
import RaftKit

struct ModePickerView: View {
    @Environment(AppSession.self) private var session
    @State private var name = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Who are you raising it with?").font(.title.weight(.bold)).padding(.top, 32)
                TextField("Your first name", text: $name).textFieldStyle(.roundedBorder).padding(.horizontal, 32)
                modeCard(.crew, title: "Crew", line: "A friend you're doing something hard with. Gym, study, sober, anything daily.", symbol: "figure.2")
                modeCard(.couple, title: "Couple", line: "Your person. Near or far.", symbol: "heart.fill")
                Spacer()
                if let e = session.lastError { Text(e).font(.footnote).foregroundStyle(.red) }
            }
        }
    }

    private func modeCard(_ mode: PairMode, title: String, line: String, symbol: String) -> some View {
        Button {
            Task { await session.createPair(mode: mode, displayName: name.isEmpty ? "Me" : name) }
        } label: {
            HStack(spacing: 16) {
                Image(systemName: symbol).font(.title).frame(width: 44)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.headline)
                    Text(line).font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.leading)
                }
                Spacer()
            }
            .padding().background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain).padding(.horizontal, 24).disabled(name.isEmpty)
    }
}
