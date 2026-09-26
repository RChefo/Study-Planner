# Study Planner — Security & Reliability Audit

| | |
|---|---|
| **Date** | 2026-09-26 |
| **Version audited** | `main` at `7e64cda` (before) → `main` after this audit (see commit list below) |
| **Scope** | Express API (`server.js`, `server/`), React frontend (`src/`), authentication (Google ID tokens, Discord OAuth 2.0), sessions, uploads/downloads (GridFS), cloud sync, Excel import/export, browser storage, HTTP headers, CORS/CSRF, rate limiting, error handling, logging, shutdown, performance |
| **Environment** | Local only. The real application code was run against an in-memory MongoDB/GridFS stand-in and fake Google/Discord providers (`tests/support/`). No external systems, production hosts, Google or Discord were attacked or load-tested. |
| **Method** | Code review of every route/middleware/data path → reproduce suspected issues against the running server → fix → add a regression test → re-test. Load and failure testing against the local server. |

> No application is "unhackable". This audit reduced the attack surface, fixed every issue that was found and reproduced, and added regression tests so the fixes stay fixed. Remaining risks are listed at the end.

---

## 1. Findings

Severity uses impact × likelihood for this app (a personal study planner holding users' notes, schedules and PDFs).

| ID | Severity | Finding | How it was confirmed | Fix | Regression test |
|---|---|---|---|---|---|
| F-01 | **Critical** | **Unauthenticated remote crash.** A malformed `rafiq_oauth_state` cookie sent to `GET /api/auth/discord/callback` made `decodeURIComponent` throw outside `try` in an async Express 4 handler → unhandled rejection → the Node process exited. One request took the service down. (Introduced in the Discord work of the previous phase.) | Reproduced with a single `curl`-style request; server exited with code 1. | Non-throwing cookie parser; upgrade to Express 5 (async errors reach the error handler); process-level `unhandledRejection` handler logs instead of dying. | `tests/security/robustness.test.js` — 8 malformed cookies × 5 routes; server must stay up. |
| F-02 | **High** | Every route (including unauthenticated sign-in) accepted and fully parsed JSON bodies up to ~61 MB before any auth check — cheap memory/CPU exhaustion. | A 20 MB body to `/api/auth/google` was parsed in 108 ms. | Per-route limits: 8 KB auth, 12 MB sync, upload size + base64 overhead for uploads; JSON-only bodies (415 otherwise). | `robustness.test.js` — 2 MB body to auth → 413 in < 2 s; sync above limit → 413. |
| F-03 | **High** | No rate limiting anywhere (sign-in, OAuth callback, uploads, sync, general API). | Code review; 50k requests accepted in the load test before the fix. | `express-rate-limit` per category, configurable via env; `429` + `Retry-After` + structured body. Uploads/sync limited per user, the rest per IP (IPv6 /56). | `tests/security/rate-limits.test.js` (7 tests) and the flood scenarios in `npm run load:test`. |
| F-04 | **High** (latent) | `trust proxy` was hard-coded to `1`. Deployed without a proxy, any client could set `X-Forwarded-For` and pick its own "IP" — defeating per-IP limits. | Test with rotating `X-Forwarded-For`. | `TRUST_PROXY` is opt-in (default off); documented. | `rate-limits.test.js` — spoofed headers ignored by default; honoured only with `TRUST_PROXY=1`. |
| F-05 | **Medium** | **Stored XSS via attachments.** A crafted Excel backup could carry a `data:text/html` "PDF". Preview created a blob with the data URL's *own* MIME type; blob URLs inherit the app's origin, so the script ran with the victim's session (could read/overwrite `/api/data`). Requires importing a malicious file and clicking preview. | Proof of concept in the browser: script executed in `http://localhost:5173` with `fetch` available. | `src/lib/attachments.ts`: allow-list (PDF/PNG/JPEG/WebP) + magic-byte verification; blobs always use the *verified* type; downloads via verified blobs with sanitized names (no raw data-URL links); all untrusted planner data (IndexedDB, Excel, cloud) passes a defensive normalizer that strips unsafe attachments. | `tests/frontend/attachments.test.mts` (6 tests); PoC re-run → blocked. |
| F-06 | **Medium** | Planner sync accepted any JSON shape up to 12 MB (unbounded strings/arrays, unknown keys). | Code review + tests. | zod schemas for every body, query and route param; bounded lengths/counts; unknown keys stripped; strict envelopes. | `robustness.test.js` (NoSQL-operator objects, wrong types, prototype-pollution keys, length bounds). |
| F-07 | **Medium** | Uploads trusted the declared MIME type (no content check), had no per-user quota, never cleaned up orphans, stored raw file names, and downloads were served inline. | Code review + tests. | Magic-byte check must match the declared type; per-user quota (`USER_STORAGE_QUOTA_MB`); orphan cleanup after a grace period; sanitized display names (no paths, control chars, reserved chars, misleading extensions); downloads use `Content-Disposition: attachment` + `Content-Security-Policy: default-src 'none'; sandbox` + `nosniff`. Storage names are random GridFS ObjectIds — user names never touch a filesystem. | `tests/security/uploads.test.js` (9 tests: types, magic bytes, traversal names, quota, cleanup, download headers). |
| F-08 | **Medium** | Logout only deleted the cookie; a copied session token stayed valid for 14 days. | Replayed a token after logout → 200. | Server-side sessions: the signed token carries a random `sid` that must exist in `sessions` (TTL index). Logout revokes it; new **sign out everywhere** revokes all; a fresh `sid` on every sign-in (no fixation). | `tests/security/auth.test.js` — replay after logout → 401; logout-all; fixation; forged/expired/tampered tokens. |
| F-09 | **Medium** | Only 3 security headers; no CSP, HSTS, frame protection or COOP; no explicit CORS/CSRF origin policy. | `curl -I`. | `helmet` with a CSP scoped to what the app loads (Google Identity Services, Google Fonts, avatar hosts), `frame-ancestors 'none'`, COOP `same-origin-allow-popups` (keeps the Google popup working), HSTS + `upgrade-insecure-requests` in production; CORS only for configured origins (never `*`); Origin check on state-changing requests. Verified in the browser that sign-in, fonts, charts and Excel still work under the CSP (0 violations). | `tests/security/headers-cors.test.js` (7 tests). |
| F-10 | **Medium** (integrity) | With two tabs open, a stale tab overwrote newer data on its next save, and both tabs logged the same finished Pomodoro. | Code review; reproduced in two browser tabs. | `BroadcastChannel` propagates saves/sign-out; timer state follows `localStorage`; only one tab (Web Locks leader) performs timer transitions; focus rounds use deterministic ids (idempotent logging). | Verified in the browser with two tabs (one log entry per round, both tabs and IndexedDB consistent). |
| F-11 | **Medium** (availability) | **Graceful shutdown never completed** when a client kept its connection alive: `closeIdleConnections()` ran once, an in-flight request's socket became idle afterwards, and every shutdown ended in the forced 10 s kill (exit 1) — e.g. on each deploy behind a load balancer. | Found by the new lifecycle test (real `server.js` entry point). | Responses during shutdown send `Connection: close`; idle sockets are swept until drained. | `tests/security/lifecycle.test.js` — in-flight request completes, new connections refused, DB closed, exit 0. |
| F-12 | **Low** | Error responses leaked internals (`"URI malformed"`, `"Unexpected end of JSON input"`, library messages) in an inconsistent format; invalid Google tokens returned `server_error`. | Probes. | Centralized handler; fixed catalog `{ error: { code, message, requestId } }`; stack traces/URIs only in server logs (with redaction). | `headers-cors.test.js` ("never leak internals"), `robustness.test.js`. |
| F-13 | **Low** | Unknown `/api/*` routes returned the HTML app with 200; wrong methods returned Express's HTML page. | Probes. | JSON 404 / 405 for the API. | `robustness.test.js` (6 method/route cases). |
| F-14 | **Low** | Database or provider outages made requests hang ~30 s (driver defaults). | Code review. | Mongo `serverSelectionTimeoutMS` 5 s → `503 DATABASE_UNAVAILABLE`; provider calls time out (`PROVIDER_TIMEOUT_MS`) → `502 PROVIDER_UNAVAILABLE`. | `tests/security/failures.test.js`. |
| F-15 | **Low** (reliability) | Failed cloud syncs were never retried (only a toast); later found that retries stalled during a *server* outage while the browser stayed online. | Browser test with simulated network loss. | Backoff retries (5 s → 5 min, honours `Retry-After`), retry on `online`, sync-status indicator with manual retry, re-upload on `FILES_MISSING`. | Verified in the browser (offline → recover; server down with browser online → recover). |
| F-16 | **Low** | Upload de-duplication/quota queries scanned the whole files collection (no index). | Query review. | Indexes: `files(metadata.userId, metadata.sha256)`, `files(metadata.userId, uploadDate)`, `sessions(expiresAt)` TTL, `sessions(userId)`. | — (index creation in `server/db.js`) |
| F-17 | **Low** | Dependency advisory: `uuid` < 11.1.1 via `google-auth-library` → `gaxios` (only affects v3/v5/v6 with a caller-supplied buffer — not reachable here). | `npm audit`. | Upgraded `google-auth-library` 9 → 10: **0 advisories in production dependencies**. | Real verifier re-checked: forged tokens → `INVALID_CREDENTIAL`. |

**Tested, no vulnerability found (controls confirmed and now covered by tests):** open redirects via `next` (protocol-relative, absolute, `javascript:`, backslash, CRLF, NUL — all fall back to `/app`), OAuth `state` forgery/replay/cross-flow reuse, IDOR/BOLA on data and files (data routes take no user id; files are looked up by id **and** owner, "not yours" is indistinguishable from "missing"; references to other users' file ids are rejected), NoSQL operator injection (queries only use the session's user id and validated ObjectIds), HTTP method abuse, garbage on the wire, aborted uploads, secrets in logs, `eval`/`Function`/`innerHTML`/`dangerouslySetInnerHTML` (none in the codebase; ESLint now forbids eval-like calls in server code).

## 2. Security controls now in place

- **Authentication:** Google ID tokens verified server-side (audience-checked, verified email required); Discord OAuth 2.0 authorization-code flow with a random `state` in a 10-minute, path-scoped, HttpOnly cookie compared in constant time; client secret never leaves the server; callback URL validated at startup (must be `…/api/auth/discord/callback`, HTTPS in production).
- **Sessions:** HMAC-SHA256 signed cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production) + server-side session record (revocable, TTL-expired); `SESSION_SECRET` ≥ 32 characters required at startup.
- **Authorization:** every data/file query is scoped to the session user; no endpoint accepts a user id.
- **Validation:** zod schemas for all input; per-route body limits; JSON-only; simple query parser (no nested objects).
- **Abuse protection:** per-category rate limits (API 300/min/IP, auth 20/15 min/IP, OAuth callback 30/15 min/IP, uploads 60/h/user, sync 30/min/user — all configurable); per-user storage quota; request/header timeouts against slow clients.
- **Uploads:** type allow-list + magic bytes; size limit; quota; sanitized names; random storage ids; attachment + sandbox CSP on download; orphan cleanup.
- **Headers:** CSP, `frame-ancestors 'none'`/`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP, HSTS (production).
- **CORS/CSRF:** explicit origin allow-list (never `*`), preflight rejection for unknown origins, Origin/`Sec-Fetch-Site` check on unsafe methods.
- **Errors & logs:** structured safe errors with request ids; JSON logs with key-based redaction (cookies, tokens, OAuth codes/state, secrets, Mongo URIs); no query strings or bodies in access logs.
- **Reliability:** Express 5 async error handling, Mongo timeouts and 503 mapping, `/api/health` (liveness) and `/api/health/ready` (DB ping), graceful SIGTERM/SIGINT shutdown, non-root Docker user + health check.
- **Frontend:** attachment verification, defensive normalization of all untrusted data, multi-tab consistency, sync retries, route error boundaries, "clear this device's data" for shared computers.

## 3. Tested endpoints

| Endpoint | Tests |
|---|---|
| `GET /api/health`, `GET /api/health/ready` | liveness during DB outage, readiness 503, rate limit on readiness only |
| `GET /api/config` | exposes only public settings; CORS; rate limit |
| `POST /api/auth/google` | valid/invalid/unverified/provider-down, malformed JSON, wrong content type, oversized body, operator objects, extra keys, rate limit |
| `GET /api/auth/discord/start` | redirect, state cookie flags, open-redirect `next`, query smuggling, rate limit |
| `GET /api/auth/discord/callback` | success, forged/missing/replayed/cross-flow state, cancellation, provider errors/outage, error reflection, malformed cookies, rate limit |
| `GET /api/auth/me` | unauthenticated, forged/tampered/expired/revoked tokens, method abuse |
| `POST /api/auth/logout`, `POST /api/auth/logout-all` | revocation, stale cookies, CSRF origin check, cross-user isolation |
| `GET /api/data`, `PUT /api/data` | round trip, legacy data, IDOR, schema/length bounds, prototype pollution, operator injection, cross-user file refs, size limit, concurrency, DB outage, CSRF, rate limit |
| `POST /api/files`, `GET /api/files/:id` | types, magic bytes, base64, size, quota, names, dedup per user, IDOR, invalid ids, download headers, stream failure, aborted upload |
| Unknown routes / wrong methods | JSON 404/405 |
| `server.js` entry point | graceful shutdown with in-flight request, unreachable DB at startup (no credential leak), insecure config refused |

**Automated suites:** `npm test` — **81 tests** (API 8, robustness 11, auth 12, authorization 6, uploads 9, rate limits 7, headers/CORS/CSRF 7, failures 5, lifecycle 3, frontend attachments 6, frontend selectors 7). `npm run security:test` runs the security subset.

## 4. Load-test results

`npm run load:test` — local only, 8 s per scenario, one Node process, **in-memory database** (numbers measure the Node/Express layer — parsing, validation, sessions, rate limiting — not MongoDB Atlas latency).

| Scenario | Conns | Requests | Req/s | Avg ms | p95 ms | p99 ms | 429 % | Error % | Peak RSS MB | CPU % | Crashed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GET /api/health | 10 | 61776 | 7723 | 1.3 | 1.8 | 2.3 | 0 | 0 | 115 | 103 | no |
| GET /api/data (auth) | 10 | 39708 | 4964 | 2 | 2.7 | 3.9 | 0 | 0 | 118 | 101 | no |
| GET /api/health | 25 | 60340 | 7544 | 3.3 | 4.2 | 5.2 | 0 | 0 | 119 | 99 | no |
| GET /api/data (auth) | 25 | 39779 | 4974 | 5 | 6.6 | 9 | 0 | 0 | 124 | 99 | no |
| GET /api/health | 50 | 59255 | 7408 | 6.7 | 8.5 | 11.9 | 0 | 0 | 124 | 98 | no |
| GET /api/data (auth) | 50 | 39032 | 4879 | 10.2 | 13 | 18.3 | 0 | 0 | 127 | 99 | no |
| GET /api/health | 100 | 58765 | 7347 | 13.6 | 16.1 | 18.4 | 0 | 0 | 128 | 98 | no |
| GET /api/data (auth) | 100 | 37472 | 4684 | 21.3 | 24.6 | 27.7 | 0 | 0 | 158 | 100 | no |
| PUT /api/data 60 KB (auth) | 10 | 5849 | 731 | 13.7 | 17.5 | 21.3 | 0 | 0 | 252 | 107 | no |
| PUT /api/data 60 KB (auth) | 25 | 5657 | 707 | 35.3 | 43.4 | 48 | 0 | 0 | 254 | 103 | no |
| PUT /api/data 60 KB (auth) | 50 | 5739 | 717 | 69.5 | 79.5 | 84.2 | 0 | 0 | 253 | 116 | no |
| Mixed read/write (auth) | 50 | 16744 | 2093 | 23.9 | 53.6 | 72.7 | 0 | 0 | 274 | 116 | no |
| Flood `POST /api/auth/google` (production limits) | 25 | 47419 | 5928 | 4.2 | 5.6 | 7.3 | 100 | 0 | 116 | 104 | no |
| Flood `GET /api/config` (production limits) | 50 | 41973 | 5247 | 9.5 | 11.8 | 17.6 | 100 | 0 | 119 | 99 | no |

- **No errors, timeouts or crashes** in any scenario; the server answered health checks after the floods.
- **Floods:** with production limits, only the first 20 sign-in attempts / 300 API calls per window got through; everything else received a cheap `429` (p99 ≤ 18 ms) — abuse cannot starve the process.
- **Bottleneck:** one CPU core (~100 % CPU at saturation). Large syncs cost the most (JSON parse + schema validation of a 60 KB document ≈ 1.4 ms of CPU each → ~700 syncs/s per core). Per-user sync limits keep this far from reachable by one account. Scale-out: run several instances behind a load balancer (see remaining risks for shared rate-limit state).
- **Memory:** 90 MB RSS / 18 MB heap at start; 98 MB peak heap under load; **26 MB heap after load + full GC** (the difference is the test database now holding 100 users' documents). No leak. RSS stays higher because V8 keeps freed pages reserved.
- **Database:** no DB errors under load; DB-level latency and connection-pool behaviour must be measured against a real Atlas cluster.

## 5. Failure testing

| Scenario | Result |
|---|---|
| MongoDB unavailable at runtime | API → `503 DATABASE_UNAVAILABLE` (fast, no hang); liveness 200; readiness 503; automatic recovery without restart |
| MongoDB unreachable at startup | Exits 1 within the selection timeout with `Startup failed: …`; connection-string credentials never printed |
| Slow database (300 ms/op) | Unrelated requests (liveness) unaffected |
| Download stream fails mid-response | Response is terminated; server stays up |
| Client disconnects mid-upload | Server stays up |
| Malformed HTTP / oversized URL on the socket | Rejected by Node's HTTP parser; server stays up |
| Google / Discord outage | `502 PROVIDER_UNAVAILABLE` / `/auth/callback?error=provider_unavailable`; friendly message in the UI |
| Invalid / expired / revoked session | 401 → frontend returns to sign-in with a "session expired" notice |
| Malformed JSON / oversized request | 400 / 413 structured errors |
| Browser offline / server down during edits | Changes saved locally, sync retries with backoff and on reconnect, status shown in the top bar |
| SIGTERM with a request in flight | Request completes; DB closed; exit 0 (F-11) |
| Route chunk fails to load (e.g. offline after deploy) | Route error screen with reload, inside the app shell |

## 6. Remaining risks & recommendations

1. **Rate-limit state is in memory** (per process). With several instances each enforces its own limits; use a shared store (e.g. Redis via `rate-limit-redis`) when scaling out.
2. **Not tested against real services:** MongoDB Atlas (operator semantics, TTL/index creation, latency), real Google and Discord OAuth. Run a staging smoke test with real credentials before launch.
3. **`TRUST_PROXY` must match the deployment.** Behind one reverse proxy set `TRUST_PROXY=1`; otherwise every client shares the proxy's IP bucket.
4. **CSP keeps `style-src 'unsafe-inline'`** (required by Google's sign-in button). Scripts are strict (`'self'` + Google's client only).
5. **On-device data is unencrypted** (IndexedDB/localStorage), including PDFs — normal for web apps; mitigated by "clear this device's data" in Settings.
6. **Sessions** have a 14-day absolute lifetime and no idle timeout; there is "sign out everywhere" but no per-device session list.
7. **Uploads are not malware-scanned.** They are type-verified, never executed or rendered by our origin, and served as sandboxed attachments.
8. **Base64 JSON uploads** cost ~33 % extra bandwidth and memory per request; a streaming multipart endpoint would be leaner for very large files.
9. **One-time re-sign-in:** tokens issued before this release have no server-side session and are rejected; users sign in again once.
10. **Dev-only advisory:** `autocannon` (load-test tool) → `hyperid` → `uuid` (moderate, not installed in production images).

## 7. How to reproduce

```bash
npm install
npm test                 # all 81 tests (API, security, lifecycle, frontend units)
npm run security:test    # security subset
npm run load:test        # local load test (~2 minutes, localhost only)
npm run dev:mock-api     # API with in-memory DB + test sign-in, for manual testing (never with NODE_ENV=production)
```

Commits: `32d22bd` security hardening · `59d8337` test suites · `6b4f2e9` attachment XSS + multi-tab fixes · `b9c23d4` UI redesign · `0a8feb3` graceful-shutdown fix · `bc898c4` load testing · (this commit) audit report, dependency upgrade and documentation.
