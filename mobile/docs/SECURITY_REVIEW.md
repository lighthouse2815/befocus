# FocusFlow Mobile security review

Review date: 2026-08-13

## Controls verified

- Access/refresh tokens use Expo SecureStore on Android/iOS with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; AsyncStorage only contains non-sensitive timer presentation state and scheduled-notification identifiers.
- Axios attaches authorization centrally, serializes concurrent refresh requests and clears secure auth plus local timer state when refresh fails.
- Logout is resilient offline and clears SecureStore, timer cache, local notification schedules and TanStack Query cache.
- `EXPO_PUBLIC_API_URL` is configuration, not a secret. No backend secret, hard-coded JWT, account credential or sensitive console logging exists in mobile source.
- Server remains the authorization/business-data boundary. Mobile does not trust local progress, streak or session completion as authoritative.
- Notification deep links use an explicit internal route allowlist; arbitrary payload paths are ignored.
- API errors map network/auth/not-found/server cases to actionable user text and reject Java exception/stack-trace-shaped messages.
- App-owned destructive actions require confirmation; repository signing keys and store credentials are ignored and absent.
- Live backend health returned `UP`, and all 14 static endpoint patterns used by mobile (including refresh) were present in the running OpenAPI document at review time.

## Dependency audit

Command:

```powershell
npm audit --registry https://registry.npmjs.org --omit=dev
```

Current result: 23 transitive findings (8 moderate, 15 high) under Expo build tooling:

- `image-size@1.2.1` through Metro has denial-of-service advisories in ICNS/JXL/HEIF parsers.
- `uuid@7.0.3` through the `xcode` configuration package has a buffer-bound advisory for uncommon caller-provided buffers.

These packages are reached by the local/cloud build toolchain, not by FocusFlow API or application business code at runtime. The repository only asks Metro to parse controlled, committed app assets. This reduces exposure but does not erase the advisory.

`npm audit fix --force` is intentionally not applied: npm proposes replacing Expo SDK 57 with Expo 53, a breaking downgrade that violates the versioned native contract and would introduce greater release risk. There is no compatible patched 1.x `image-size` release; 2.x changes its API. Resolution is to update the Expo/Metro/config-plugin dependency line when Expo publishes a compatible patch, then rerun doctor, exports, tests and the audit.

## Release gates still requiring external evidence

- Physical-device verification is pending; native notifications, lock-screen lifecycle and OS permission behavior are not claimed verified yet.
- EAS cloud configuration requires an authenticated Expo account (`eas login` or `EXPO_TOKEN`). Android/iOS Hermes exports pass locally, but a signed EAS artifact has not been created.
- Store signing/submission and production HTTPS endpoint configuration remain environment-owner actions and must never be committed.
