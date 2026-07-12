# Capacitor Auth Setup

## Do NOT use native Firebase Auth plugins

`@capacitor-firebase/authentication` crashes on iOS 26 with `RuntimeError` / `abort()` during
bridge init, killing the entire WebView. This was confirmed on pixwee Build 31–32.

## Instead: use Firebase Web SDK in the WebView

The Firebase Web SDK (`signInWithPopup`) works inside Capacitor's WebView:
- **Google**: `signInWithPopup(auth, googleProvider)` → pops a Safari VC for Google login
- **Apple**: `signInWithPopup(auth, appleProvider)` → pops Apple's native sign-in
- **Email/Password**: `signInWithEmailAndPassword` → works normally
- **Passkey**: WebAuthn `startRegistration` / `startAuthentication` works via Capacitor's bridge

## Capacitor config for popups

In `capacitor.config.json`:
```json
{
  "server": {
    "hostname": "localhost",
    "androidScheme": "https"
  }
}
```

## Apple setup
1. Firebase Console → Authentication → Sign-in method → Enable Apple
2. Apple Developer → Certificates → Register a Service ID
3. Add the Service ID as "Services ID" in Firebase Apple provider config
4. Add Domain (`localhost`, `alf.nakfaai.com`) and Return URL from Firebase

## Passkey on Capacitor
WebAuthn works out of the box in Capacitor WebView on iOS 16+ and Android 10+.
No native plugins needed. The `@simplewebauthn/browser` library bridges to the OS authenticator.

## iOS Info.plist
```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to sign in quickly</string>
```
