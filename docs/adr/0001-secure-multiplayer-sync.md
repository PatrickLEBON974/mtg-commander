# ADR 0001: Secure global multiplayer synchronization

- Status: Accepted
- Date: 2026-08-19

## Context

The previous multiplayer path synchronized only a subset of the local game and relied on broad authenticated database access. Whole-state last-write-wins updates could overwrite concurrent actions, reconnects did not reliably restore ownership, and the client did not have a single error or authorization model.

The app must support two to six seats across web and Capacitor clients while retaining the existing local play experience. Firebase Realtime Database remains the transport and authoritative shared store.

## Decision

### Identity, rooms, and lifecycle

- Use Firebase Anonymous Authentication with browser-local persistence. A restored client keeps the same Firebase UID and therefore the same seat ownership.
- Use schema version 3 with fixed seat identifiers `p0` through `p5`, a six-letter cryptographically generated room code, and a four-hour logical expiry.
- Treat the six-letter code as an address, not an authorization grant. It can create only a bounded request owned by the authenticated requester; it never permits room discovery, room reads, membership, or seat creation.
- Require explicit host approval to atomically turn a pending request into membership and owned seats. Rejection deletes the request without exposing room data. At most 12 simultaneous pending requests can exist, enforced by an atomic counter.
- Encode only the room code in the host QR. The Android custom link and the in-app ZXing scanner merely prefill that code; they cannot bypass the same admission request and host approval.
- Treat `settings.playerCount` as room capacity. The host may start once at least two seats are connected; every configured seat does not have to be occupied.
- Model room lifecycle as the forward-only sequence `lobby -> playing -> finished` and pregame lifecycle as `seating -> initiative -> playing`.
- Do not transfer host authority automatically. A disconnected host can restore its session, but another anonymous member cannot take over a privileged identity. This avoids an unsafe client-side election. Rooms are normally deleted when the host leaves; expired rooms reject writes and are hidden from outsiders.

### Shared state and concurrency

- Synchronize all gameplay state that affects participants: player totals, Commander damage and commanders, counters, Monarch, Initiative, City's Blessing, Ring level, Rad and Hourglass counters, turn/priority, day/night, timers, phase, and order.
- Keep presentation and device-owned data local: action history, redo stack, badge/layout positions, transient effects, and profile/deck mappings.
- Publish explicit field-level multi-location patches. Every accepted patch atomically increments a revision and records a server timestamp and authenticated writer UID.
- Rebase unsent local fields over newer remote revisions. Roll back to the last authoritative snapshot when a write is rejected or remote data is invalid.
- Debounce normal synchronization by 500 ms while retaining an explicit flush before finishing a game.

### Authorization

- Deny reads and writes by default.
- Permit room reads only to members. An outsider may read and delete only its exact admission-request path, never the room or other requests.
- Allow request creation only while the room exists, remains unexpired, is in `lobby`, and the requester is not already a member. A participant cannot create its own membership or seats; only the host can do so from an existing pending request.
- Count pending requests atomically. Host approval or rejection decrements the count, and the `lobby -> playing` transition requires it to be zero. Once the room is `playing` or `finished`, new requests are rejected by server rules regardless of the client used.
- The host owns lifecycle, settings, pregame order/phase, shared clocks, finish, and deletion.
- A participant owns its seat and player fields; the host may repair any player. Authenticated room members may update turn/priority/day-night state and perform atomic Monarch or Initiative transfers. Commander-damage entries must reference a commander registered in the shared game.
- Validate the exact schema, fixed seats, immutable identity fields, integer/range constraints, HTTPS image URLs, finite state transitions, string lengths/control characters, and unknown fields on the server.
- Attest web clients with reCAPTCHA Enterprise and Android clients with Play Integrity through Firebase App Check. Production must fail closed if attestation cannot initialize; debug providers are development-only and require explicitly registered debug tokens.

### Connectivity and errors

- Register `onDisconnect` presence operations before marking a member online, and re-arm them after every `.info/connected` reconnect.
- Restore persisted sessions at startup and on Capacitor resume. Subscription generations prevent late callbacks from an old room from mutating a new session.
- Keep recoverable offline departures retryable. Terminal room loss clears the remote game copy and routes the user back to multiplayer setup.
- Map Firebase failures to stable domain errors so the UI can distinguish configuration, authentication, validation, capacity, authorization, conflict, expiry, closure, and network recovery.

## Consequences

- Concurrent edits to different fields merge without replacing the room. Concurrent edits to the same field remain last accepted write wins, followed by revision-based reconciliation.
- Timer mutation has one authority (the host), avoiding clock multiplication across clients.
- No client can safely provide automatic host migration; adding it later requires a trusted backend lease/election protocol and a new ADR.
- Anonymous Authentication supplies a stable pseudonymous UID, not trust. Host approval, Realtime Database rules, App Check, quotas, bounded pending requests, and automatic anonymous-account cleanup are separate layers and remain necessary.
- The Firebase CLI 15 rules emulator requires Java 21. Production dependencies are independent of that development-only toolchain.
- Rules must be deployed explicitly after review; building the web/native bundle does not change production rules.

## Verification basis

The implementation was checked against Context7 library `/firebase/firebase-js-sdk`, the Capawesome App Check integration reference, and official Firebase references for atomic updates, offline presence and `onDisconnect`, persistent authentication, App Check enforcement, listener cancellation, and Realtime Database rule validation.

- [Read and write data on the web](https://firebase.google.com/docs/database/web/read-and-write)
- [Build presence with offline capabilities](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Realtime Database rule conditions and validation](https://firebase.google.com/docs/database/security/rules-conditions)
- [Realtime Database regular-expression subset](https://firebase.google.com/docs/reference/security/database/regex)
- [Firebase App Check for web with reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [Firebase App Check with Play Integrity on Android](https://firebase.google.com/docs/app-check/android/play-integrity-provider)
- [Capacitor App API and custom URL schemes](https://capacitorjs.com/docs/apis/app)
- [Capacitor Barcode Scanner](https://capacitorjs.com/docs/apis/barcode-scanner)
