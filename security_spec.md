# NEXUS Venture Studio — Firestore Security Specification

## 1. Data Invariants
1. **Strict Owner Isolation**: A `/users/{userId}` document and any `/users/{userId}/ventures/{ventureId}` document can ONLY be read, created, updated, or deleted when `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.uid == userId`.
2. **No Cross-User Access or Scraping**: Blanket `list` queries across `/users` are denied (`allow list: if false`). Subcollection `list` on `/users/{userId}/ventures` enforces both `request.auth.uid == userId` and `resource.data.userId == request.auth.uid`.
3. **Immutable Ownership & Creation Timestamps**: `userId`, `ventureId`, and `createdAt` cannot be modified after document creation. `createdAt` must equal `request.time` on `create`, and `updatedAt` / `lastLoginAt` must equal `request.time` on writes.
4. **No Shadow / Ghost Fields**: Top-level keys are strictly validated via `keys().hasAll(...)` and `keys().hasOnly(...)` on create, and `diff(existing()).affectedKeys().hasOnly(...)` on update.
5. **Bounded Sizes**: All string fields and array fields have explicit `.size()` bounds to prevent Denial-of-Wallet storage exhaustion.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `get /users/alice/ventures/farmtrace-ai` with `auth = null`.
2. **Cross-User Read**: `get /users/alice/ventures/farmtrace-ai` with `auth.uid = 'bob'`.
3. **Cross-User List**: `list /users/alice/ventures` with `auth.uid = 'bob'`.
4. **Unverified Email Spoof**: `create /users/alice` with `auth.uid = 'alice'`, `token.email_verified = false`.
5. **Owner UID Spoofing on Create**: `create /users/bob/ventures/farmtrace-ai` with `auth.uid = 'bob'` and `data.userId = 'alice'`.
6. **Shadow Field Injection on Create**: `create /users/alice` with extra field `isAdmin: true`.
7. **Shadow Field Injection on Update**: `update /users/alice/ventures/farmtrace-ai` adding unknown top-level key `role: 'admin'`.
8. **Immutable `createdAt` Tampering**: `update /users/alice/ventures/farmtrace-ai` modifying `createdAt`.
9. **Client-Forged Timestamp**: `create /users/alice/ventures/farmtrace-ai` with `updatedAt = timestamp('2020-01-01T00:00:00Z')` instead of `request.time`.
10. **Path Variable Poisoning**: `create /users/alice/ventures/bad$id..!` with invalid document ID characters.
11. **Out-of-Range `activeStage`**: `update /users/alice/ventures/farmtrace-ai` with `activeStage = 99`.
12. **Blanket Users Collection Enumeration**: `list /users` as any signed-in user.
