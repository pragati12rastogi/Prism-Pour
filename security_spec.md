# Prism Pour Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership**: A player may only read, create, update, or delete their own `/users/{userId}` document and `/users/{userId}/sessions/{sessionId}` documents (`request.auth.uid == userId` and `request.auth.token.email_verified == true`).
2. **Master Gate on Sessions**: A session document under `/users/{userId}/sessions/{sessionId}` cannot exist or be written unless the parent `/users/{userId}` document already exists.
3. **24-Hour Daily Reward Integrity**: Claiming the daily reward (`+50` coins) is only permitted when `lastDailyRewardAt == null` or `request.time >= existing().lastDailyRewardAt + duration.value(24, 'h')`. The claim action must set `lastDailyRewardAt == request.time`, increment `dailyRewardCount` by exactly `1`, and increase `coins` by exactly `50`.
4. **No Arbitrary Coin Injection**: Standard progress saves (`isSaveProgressAction`) cannot modify `lastDailyRewardAt` or `dailyRewardCount`, and cannot increase `coins` by more than `35` in a single write (the maximum level-completion reward).
5. **Monotonic Level Unlock & Immutable Fields**: `uid` and `createdAt` are immutable after creation; `unlockedLevel` cannot decrease; `createdAt` and `updatedAt` must equal `request.time`.
6. **Zero Blanket Reads / List Scraping**: `allow list` is disabled on `/users` and restricted to owner-only on `/users/{userId}/sessions` (`resource.data.uid == request.auth.uid`).

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Cross-User Read**: Signed-in user `userA` attempts `get` on `/users/userB`.
2. **Unverified Email Write**: Signed-in user with `email_verified: false` attempts `create` on `/users/userA`.
3. **Identity Spoofing on Create**: User `userA` attempts `create` on `/users/userA` with `{ uid: "userB", ... }`.
4. **Shadow / Ghost Field Injection**: User `userA` creates `/users/userA` with an unexpected field `isAdmin: true`.
5. **Client-Forged Timestamp**: User `userA` creates `/users/userA` with `createdAt` set to a client-chosen past timestamp instead of `request.time`.
6. **Early Daily Reward Replay (< 24h)**: User `userA` claims daily reward when `lastDailyRewardAt` was 2 hours ago (`request.time < existing().lastDailyRewardAt + duration.value(24, 'h')`).
7. **Daily Reward Coin Inflation**: User `userA` claims daily reward with `coins: existing().coins + 5000` instead of `+ 50`.
8. **Backdated Daily Reward Timestamp**: User `userA` updates `lastDailyRewardAt` inside `isSaveProgressAction` to reset the 24-hour timer.
9. **Level Unlock Downgrade**: User `userA` updates `unlockedLevel` to `1` when `existing().unlockedLevel == 5`.
10. **Coin Inflation in Progress Save**: User `userA` updates `coins` by `+1000` in a single progress save (`> existing().coins + 35`).
11. **Oversized ID Poisoning**: User `userA` attempts `create` on `/users/userA/sessions/invalid$id!with*spaces` or a >128-character ID.
12. **Orphaned Session Creation**: User `userA` attempts to create `/users/userA/sessions/current` before `/users/userA` exists.
