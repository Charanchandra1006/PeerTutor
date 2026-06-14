# PeerTutor Project — Completeness Analysis

A detailed audit of the PeerTutor project against the [PRD](file:///d:/PeerTutor/PTM_PRD.txt) and [FSD](file:///d:/PeerTutor/PTM_FSD.txt) requirements.

---

## Overall Status: **~75–80% Complete** (Core functional, several gaps remain)

---

## ✅ What's DONE and Working

### Backend (Node.js / Express / MongoDB)

| Module | Files | Status |
|--------|-------|--------|
| **Auth** | [auth.service.js](file:///d:/PeerTutor/backend/src/modules/auth/auth.service.js), model, controller, routes, validation | ✅ Register, login, JWT, forgot/reset password, OTP, lockout |
| **Tutors** | [tutor.service.js](file:///d:/PeerTutor/backend/src/modules/tutors/tutor.service.js), model, controller, routes, validation | ✅ Profile CRUD, subjects, search, verification badge |
| **Bookings** | [booking.service.js](file:///d:/PeerTutor/backend/src/modules/bookings/booking.service.js), model, controller, routes | ✅ Create, cancel (with late fee), complete, slot conflict check, Jitsi video link |
| **Wallet** | [wallet.service.js](file:///d:/PeerTutor/backend/src/modules/wallet/wallet.service.js), model, controller, routes | ✅ Welcome credits, reserve/release/refund (escrow), platform fee, admin top-up, atomic MongoDB transactions |
| **Reviews** | [review.service.js](file:///d:/PeerTutor/backend/src/modules/reviews/review.service.js), model, controller, routes | ✅ Post-session rating, reviews |
| **Notifications** | [notification.service.js](file:///d:/PeerTutor/backend/src/modules/notifications/notification.service.js), model, controller, routes | ✅ Create, list, mark read, broadcast |
| **Admin** | [admin.service.js](file:///d:/PeerTutor/backend/src/modules/admin/admin.service.js), controller, routes | ✅ Stats, user management, suspend/activate, credit top-up, transaction audit, subject management |
| **Group Sessions** | [group-session.service.js](file:///d:/PeerTutor/backend/src/modules/group-sessions/group-session.service.js), controller, routes | ✅ Create, discover, join, leave, complete, attendance, material upload |
| **Escape Room** | [escapeRoom.service.js](file:///d:/PeerTutor/backend/src/modules/escape-room/escapeRoom.service.js), model, controller, routes | ✅ Gamification feature (puzzle rooms) |
| **Gamification** | [gamification.service.js](file:///d:/PeerTutor/backend/src/modules/users/gamification.service.js) | ✅ XP points, badges, badge evaluation |
| **Background Jobs** | [worker.js](file:///d:/PeerTutor/backend/src/jobs/worker.js) | ✅ BullMQ queues (email, notification, AI, analytics) |
| **Middleware** | auth, errorHandler, rateLimiter, rbac, validator | ✅ JWT, RBAC, rate limiting, input validation |

### AI Engine (Python / FastAPI)
| Feature | File | Status |
|---------|------|--------|
| Tutor Matching | [match.py](file:///d:/PeerTutor/ai-engine/app/routes/match.py) | ✅ AI match with Redis cache |
| Learning Path | [learning_path.py](file:///d:/PeerTutor/ai-engine/app/routes/learning_path.py) | ✅ LLM-powered weekly study plan |
| Escape Room Hints | [escape_room.py](file:///d:/PeerTutor/ai-engine/app/routes/escape_room.py) | ✅ Dynamic hints via LLM |
| Health Check | [health.py](file:///d:/PeerTutor/ai-engine/app/routes/health.py) | ✅ |

### Frontend (React / Vite)
| Page | File | Status |
|------|------|--------|
| Landing Page | [LandingPage.jsx](file:///d:/PeerTutor/frontend/src/pages/LandingPage.jsx) | ✅ |
| Login | [LoginPage.jsx](file:///d:/PeerTutor/frontend/src/pages/LoginPage.jsx) | ✅ |
| Register | [RegisterPage.jsx](file:///d:/PeerTutor/frontend/src/pages/RegisterPage.jsx) | ✅ |
| Dashboard | [DashboardPage.jsx](file:///d:/PeerTutor/frontend/src/pages/DashboardPage.jsx) | ✅ Stats, upcoming sessions, quick actions |
| Discover Tutors | [DiscoveryPage.jsx](file:///d:/PeerTutor/frontend/src/pages/DiscoveryPage.jsx) | ✅ |
| Tutor Profile | [TutorProfilePage.jsx](file:///d:/PeerTutor/frontend/src/pages/TutorProfilePage.jsx) | ✅ |
| Bookings | [BookingsPage.jsx](file:///d:/PeerTutor/frontend/src/pages/BookingsPage.jsx) | ✅ |
| Session Room | [SessionRoomPage.jsx](file:///d:/PeerTutor/frontend/src/pages/SessionRoomPage.jsx) | ✅ Jitsi video |
| Wallet | [WalletPage.jsx](file:///d:/PeerTutor/frontend/src/pages/WalletPage.jsx) | ✅ |
| Profile | [ProfilePage.jsx](file:///d:/PeerTutor/frontend/src/pages/ProfilePage.jsx) | ✅ |
| Tutor Setup | [TutorSetupPage.jsx](file:///d:/PeerTutor/frontend/src/pages/TutorSetupPage.jsx) | ✅ |
| Admin Dashboard | [AdminDashboard.jsx](file:///d:/PeerTutor/frontend/src/pages/AdminDashboard.jsx) | ✅ |
| Group Sessions | [GroupSessionsPage.jsx](file:///d:/PeerTutor/frontend/src/pages/GroupSessionsPage.jsx), [detail](file:///d:/PeerTutor/frontend/src/pages/GroupSessionDetailPage.jsx), [create](file:///d:/PeerTutor/frontend/src/pages/CreateGroupSessionPage.jsx) | ✅ |
| Escape Room | [EscapeRoomLobbyPage.jsx](file:///d:/PeerTutor/frontend/src/pages/EscapeRoomLobbyPage.jsx), [game](file:///d:/PeerTutor/frontend/src/pages/EscapeRoomGamePage.jsx) | ✅ |

### Infrastructure
- ✅ Docker Compose (dev & prod)
- ✅ `.env` configuration
- ✅ GitHub workflows (`.github`)
- ✅ Seed data ([seed.js](file:///d:/PeerTutor/backend/src/seed.js))
- ✅ Husky git hooks

---

## ⚠️ INCOMPLETE / MISSING Items

### 🔴 Critical Gaps

| # | PRD Requirement | Gap | Severity |
|---|----------------|-----|----------|
| 1 | **Sessions module backend is EMPTY** | The [sessions](file:///d:/PeerTutor/backend/src/modules/sessions) directory is completely empty. The booking module handles session logic, but there's no dedicated session model/service for in-session features (notes editor, real-time chat, file sharing during session). | 🔴 High |
| 2 | **Refresh tokens are hardcoded** | In [auth.service.js](file:///d:/PeerTutor/backend/src/modules/auth/auth.service.js#L52-L53) — `refreshToken: 'temporary-refresh-token'` — both `register()` and `login()` return a static placeholder instead of calling `_generateRefreshToken()`. Token refresh/rotation is implemented but never actually used on login. | 🔴 High |
| 3 | **Account lockout is commented out** | In [auth.service.js](file:///d:/PeerTutor/backend/src/modules/auth/auth.service.js#L76-L99) — `_checkAccountLockout()` and `_clearFailedLogins()` calls are commented out in `login()`. Brute-force protection is disabled. | 🔴 High |
| 4 | **No OTP email delivery** | OTPs are generated and stored in MongoDB but never actually sent. [Line 353](file:///d:/PeerTutor/backend/src/modules/auth/auth.service.js#L353): `// In production: send via SendGrid (TODO)`. | 🟡 Medium |
| 5 | **Group-session model is missing** | [group-session.service.js](file:///d:/PeerTutor/backend/src/modules/group-sessions/group-session.service.js) has no model file — it reuses `Session` from `booking.model.js`. The group session fields (`credits_per_student`, `attendance`, `post_session_materials`) must be on the Session schema, but there's no dedicated group-session model. | 🟡 Medium |

### 🟡 Missing PRD Features

| # | Feature (PRD Ref) | Status |
|---|-------------------|--------|
| 6 | **FR-AUTH-04: OAuth2/Google SSO** | ❌ Not implemented |
| 7 | **FR-AUTH-06: Profile completion wizard** (3-step onboarding) | ❌ No multi-step wizard on frontend |
| 8 | **FR-PROF-03: Profile completeness score** | ❌ Not found |
| 9 | **FR-PROF-04: Portfolio section** (uploaded notes, certificates) | ❌ No file upload for tutor portfolios |
| 10 | **FR-PROF-05: Calendly API integration** | ❌ Not implemented — only native slot picker |
| 11 | **FR-SRCH-03: 'Top Picks For You'** AI section on discovery | ⚠️ AI match endpoint exists but frontend doesn't call it on the discovery page |
| 12 | **FR-SRCH-04: Recently viewed tutors** | ❌ Not implemented |
| 13 | **FR-SRCH-05: Saved/favourited tutors** | ❌ Not implemented |
| 14 | **FR-SESS-02: In-session real-time chat** | ❌ No WebSocket/chat implementation |
| 15 | **FR-SESS-03: Session notes editor** (rich text, auto-save) | ⚠️ Backend `saveNotes()` exists, no frontend rich-text editor |
| 16 | **FR-SESS-06: Session recording** | ❌ Not implemented |
| 17 | **FR-RATE-02: Tutor rates the student** (bidirectional) | ❌ Only student→tutor reviews found |
| 18 | **FR-RATE-04: Review moderation** (24h window) | ❌ Admin moderation queue UI not connected |
| 19 | **FR-CRED-06: Credit expiry** (6 months) | ❌ No expiry logic |
| 20 | **FR-CRED-07: Dispute resolution flow** | ❌ Not implemented |
| 21 | **FR-ADMN-05: Export CSV/PDF** | ❌ Not implemented |
| 22 | **FR-ADMN-06: System health monitor** | ❌ Not implemented |
| 23 | **FR-ADMN-07: Announcement broadcast** | ⚠️ Backend `broadcast()` exists, no frontend UI for admin broadcasts |
| 24 | **FR-NOTIF-02: Notification bell** with real-time unread count | ⚠️ Hook exists (`useNotifications`) but no bell component in layout |
| 25 | **FR-NOTIF-03: PWA push notifications** | ❌ No service worker / PWA setup |
| 26 | **FR-NOTIF-04: Notification preferences** | ❌ Not implemented |

### 🟡 Missing Enhanced Features (Section 6 of PRD)

| # | Enhanced Feature | Status |
|---|-----------------|--------|
| 27 | **6.1: AI Learning Path Advisor** — progress tracking dashboard | ⚠️ API exists, no frontend page |
| 28 | **6.2: Collaborative whiteboard** (Excalidraw) in group sessions | ❌ Not implemented |
| 29 | **6.3: Gamification leaderboard** — weekly department leaderboard | ⚠️ Backend badges/XP exist, no leaderboard page |
| 30 | **6.5: Tutor Analytics Dashboard** — individual earnings, rating trends | ❌ Not implemented (only basic stats in dashboard) |
| 31 | **6.6: Smart Scheduling** — conflict detection with class timetable | ❌ Not implemented |
| 32 | **6.7: Resource Library** — shared notes marketplace | ❌ Not implemented |

### 🟡 Testing Gaps

| Area | Status |
|------|--------|
| Unit tests | Only 1 file: [group-session.service.test.js](file:///d:/PeerTutor/backend/src/tests/unit/group-session.service.test.js) |
| Integration tests | ❌ Empty directory |
| Frontend tests | ❌ None found |
| E2E tests | ❌ None found |

---

## 📊 Summary by PRD Phase

| Phase | Description | Completion |
|-------|-------------|------------|
| **Phase 0** — Setup | Repo, CI/CD, DB schema, auth skeleton | ✅ ~95% |
| **Phase 1** — Core | Auth, profiles, search, booking, video | ✅ ~80% (missing chat, rich notes, Calendly) |
| **Phase 2** — Payments | Wallet, credits, transaction ledger | ✅ ~90% (missing expiry, dispute) |
| **Phase 3** — AI | Match engine, learning path advisor | ✅ ~70% (backend done, frontend pages missing) |
| **Phase 4** — Social | Ratings, reviews, gamification, notifications | ⚠️ ~60% (missing bidirectional reviews, leaderboard, notification bell, PWA) |
| **Phase 5** — Admin | Dashboard, moderation, analytics | ⚠️ ~55% (missing moderation queue, exports, system health) |
| **Phase 6** — Scale | Redis cache, queue, load testing, security | ⚠️ ~50% (Redis/BullMQ done, but lockout disabled, no load tests, refresh tokens broken) |

---

## 🎯 Priority Fix List (Recommended Order)

> [!CAUTION]
> Items 1–3 are **security issues** that should be fixed before any deployment.

1. **Fix refresh token generation** — Replace `'temporary-refresh-token'` with actual `_generateRefreshToken()` call
2. **Enable account lockout** — Uncomment `_checkAccountLockout` and `_clearFailedLogins` in login flow
3. **Implement OTP email delivery** — Wire up SendGrid for password reset OTPs
4. **Add notification bell to layout** — Hook already exists, just needs UI
5. **Wire AI recommendations** on DiscoveryPage — endpoint ready, frontend needs integration
6. **Add more tests** — Only 1 test file currently exists
7. **Build missing frontend pages** — Learning path viewer, leaderboard, tutor analytics

