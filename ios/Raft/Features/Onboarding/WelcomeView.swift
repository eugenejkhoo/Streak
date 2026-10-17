import SwiftUI
import AuthenticationServices
import CryptoKit
import RaftKit

struct WelcomeView: View {
    @Environment(AppSession.self) private var session
    @State private var nonce = ""

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "pawprint.fill").font(.system(size: 72)).foregroundStyle(.tint)
            Text("A creature you can only raise together.")
                .font(.title2.weight(.semibold)).multilineTextAlignment(.center).padding(.horizontal, 32)
            Spacer()
            SignInWithAppleButton(.continue) { req in
                nonce = Self.randomNonce()
                req.requestedScopes = [.fullName]
                req.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            } onCompletion: { result in
                guard case .success(let auth) = result,
                      let cred = auth.credential as? ASAuthorizationAppleIDCredential,
                      let tokenData = cred.identityToken, let token = String(data: tokenData, encoding: .utf8) else { return }
                Task {
                    do {
                        let r = try await session.api.signInWithApple(idToken: token, nonce: nonce)
                        await session.signedIn(accessToken: r.accessToken, refreshToken: r.refreshToken)
                    } catch { session.lastError = error.localizedDescription }
                }
            }
            .frame(height: 50).padding(.horizontal, 32)
            if let e = session.lastError { Text(e).font(.footnote).foregroundStyle(.red) }
            Spacer().frame(height: 24)
        }
    }

    static func randomNonce(length: Int = 32) -> String {
        let chars = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        return String((0..<length).map { _ in chars[Int.random(in: 0..<chars.count)] })
    }
}
