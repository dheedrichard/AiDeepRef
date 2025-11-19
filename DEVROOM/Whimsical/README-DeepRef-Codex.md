# Deep Ref — Codex Pack (Project README for IDE Agent)

This document aggregates **everything known so far** about the _Deep Ref_ product so an IDE-based agent (e.g., Codex) can immediately scaffold the frontend and supporting interfaces. It includes product requirements, user journeys, data models, API contracts, UI frames, and open questions to resolve.

> **Scope focus:** Frontend-first MVP. The Reference Confidence Score (RCS) is **simplified**. OSINT checks happen **under the hood**. EU+US privacy constraints considered. Parser is **in-house**. **Selfie with ID** verification is **required for seekers**; referrers have lighter verification.

---

## 1) Product One-Liner

**Deep Ref** enables job seekers to **collect, manage, and share** verifiable references with an **aggregated confidence score (RCS)**. Referrers respond via **video, audio, or text**. Hiring teams consume a **shareable bundle** and can request **back-channel verification**. Privacy rules are explicit: the **seeker owns sharing**, and certain replies are temporarily private to hiring.

---

## 2) MVP Guardrails

- **Frontend-first** delivery; backend stubs accepted where needed.
- **RCS simplified**: identity & tenure verification, content consistency, and submission provenance.
- **Media limits:**
  - Video/Audio: **2:00** soft cap with single **+2:00** extension
  - Text: **500 characters** per answer
- **Retraction policy:** Referrer may retract; seeker notified → if **no response** auto-retract in **10 days**; if seeker responds, **30-day** grace to replace.
- **Privacy windows:** Employer-initiated verification replies are **private to hiring** and only visible to the seeker **after 5 days** (backend-enforced; no countdown UI in MVP).
- **OSINT:** Allowed, consented, and **not exposed in UI** for MVP. (Under the hood only.)
- **Regions:** US + EU. Provide Privacy/Terms links, consent for ID verification, and DSAR/Deletion stubs.

---

## 3) Primary Roles & Permissions

- **Seeker (job seeker)**

  - Create reference requests.
  - Manage references (pending/completed/declined/expired).
  - Build **bundles** and share links with hiring.
  - Toggle **back‑channel** permission per request or bundle.
  - View employer private replies **after 5 days**.

- **Referrer (past employer/lead)**

  - Receive invite, verify identity lightly, submit **video/audio/text** reference.
  - Edit within allowed window and **retract** later (policy above).
  - Optional lightweight account to manage their references.

- **Hiring (employer/recipient)**

  - Consume **bundle** via secure link.
  - See **aggregated RCS** and per-reference badges.
  - Request **back‑channel verification / reach-back** to referrer (seeker approval required to share contact).

- **Admin / Trust**
  - Review verification queues, disputes, and retractions.
  - Observe audit logs.

---

## 4) Core Journeys (Swimlanes)

### AUTH / GLOBAL

1. **AUTH-01** Welcome / Value Prop
2. **AUTH-02** Sign In (Email Magic Link)
3. **AUTH-03** Create Account (Seeker / Referrer)
4. **AUTH-04** Verify Email (Magic Link Sent)
5. **ID-SEEK-01** ID Capture (front/back)
6. **ID-SEEK-02** Selfie Liveness
7. **ID-SEEK-03** Verification Result
8. **ID-REF-LIGHT** Referrer Light Verification Options
9. **NOTIFS** Notifications Drawer

### SEEKER

- **SEEK-01** Profile Setup
- **SEEK-HOME** Dashboard
- **REQ-01 → REQ-06** New Reference Wizard (Choose Referrer → Delivery → Success)
- **REQ-DETAIL** Request Detail (timeline, resend/edit/revoke, RCS pending)
- **LIB-01** References Library
- **BUNDLE-01/02** Create Bundle → Settings
- **BUNDLE-READY** Link Ready (copy + analytics)
- **SEEK-PREVIEW** Bundle Viewer (seeker)
- **SET-SEEK** Settings (profile, ID verify, notifications)

### REFERRER

- **INV-LAND** Invite Landing (accept/decline)
- **INV-VERIFY** Verify (magic/OTP/LinkedIn)
- **RESP-MODE** Choose Mode
- **RESP-VID/AUD/TXT** Record/Write
- **RESP-Q** Guided Questions
- **RESP-ATTACH** Attachments
- **RESP-REVIEW** Review & Consent (transcript editable)
- **RESP-DONE** Submission Success
- **REF-MANAGE** Manage (retract/edit)

### HIRING / EMPLOYER

- **EMP-VIEW** Employer Viewer (Aggregated RCS + References)
- **EMP-RB-ASK** Reach‑back Request Modal
- **EMP-RB-SENT** Reach‑back Sent (status)

### ADMIN / TRUST

- **ADM-VERIFY** Verification Queue
- **ADM-DISPUTES** Disputes & Retracts

**Cross-lane handoffs:**

- `REQ-05 → INV-LAND` (send invite)
- `RESP-DONE → REQ-DETAIL` (submission)
- `REF-MANAGE (Retract) → REQ-DETAIL`
- `BUNDLE-READY → EMP-VIEW` (open link)
- `EMP-RB-ASK (Send) → NOTIFS` (+ log on `REQ-DETAIL`)

---

## 5) UI Frames with Fields (Implementation Checklist)

> Use these checklists to build wireframes/components. Prefixes: **F:** field, **C:** control, **S:** section, **M:** message.

### AUTH-01 — Welcome

- S: Hero with 1-liner
- C: **Sign in**, **Create account**
- S: Footer with Privacy/Terms

### AUTH-02 — Sign In

- F: Email
- C: **Send magic link**
- M: Link sent toast, resend

### AUTH-03 — Create Account

- F: First name, Last name, Email, Password | or “Magic link only”
- C: Role toggle **Seeker/Referrer** (default Seeker), **Keep me signed in**
- C: **Create account**

### AUTH-04 — Verify Email

- M: “Check your inbox”
- C: **Resend**, **Open mail app**

### ID-SEEK-01/02/03 — ID + Selfie

- F: Doc type, captures (front/back), consent checkbox
- C: **Continue**, **Submit for verification**
- M: Verification **Verified/Needs review**

### ID-REF-LIGHT — Referrer Verification

- C: Use invite token OR Email OTP OR LinkedIn connect
- M: “Higher verification boosts RCS”

---

### SEEK-HOME — Dashboard

- S: Header (avatar, name, mini aggregated RCS)
- S: Status tiles: **Pending / Completed / Declined / Needs Attention**
- C: **New Reference Request**
- S: Recent activity table

### REQ-01 — Choose Referrer

- F: Name*, Email*, Company, Role at time, Relationship type (Manager/Peer/Client/Other)
- C: Import from contacts (optional), **Next**

### REQ-02 — Context

- F: Role title, Start/End dates (Present toggle), Team/Project
- C: **I have proof docs** → upload zone
- C: **Next**

### REQ-03 — Questions

- Tabs: **General**, **Generated from URL/Scope**, **Custom**
- F: URL or Scope text → **Generate**
- C: Reorder, edit, restore defaults
- M: Limits: Text **≤500 chars**, Video/Audio **2:00 (+2:00)**
- C: **Next**

### REQ-04 — Format & Privacy

- C: Allowed formats **Video/Audio/Text** (toggles)
- F: Due date
- M: “~3–5 minutes”
- C: **Allow back‑channel requests** (default OFF)
- M: “Private until added to bundle”
- C: **Next**

### REQ-05 — Delivery

- C: Send via **Email** (required), **SMS** (optional), **Shareable link**
- F: Custom message
- C: **Send** (→ REQ-06)

### REQ-06 — Success

- M: Checkmark & success
- C: **Go to Request Detail** | **Back to Dashboard**

### REQ-DETAIL — Timeline & Actions

- S: Header (referrer card + status)
- S: Timeline **Sent → Opened → Started → Submitted**
- C: **Resend**, **Edit** (if not started), **Revoke**
- S: Mini **RCS: Pending** (updates after processing)

### LIB-01 — Library

- F: Search/Filters (Company, Date range, Format, RCS band)
- S: Cards with thumbnail + **RCS badge**
- C: Bulk select → **Add to Bundle**

### BUNDLE-01 / -02 / READY / SEEK-PREVIEW

- **BUNDLE-01**: Selected list (reorder/remove)
- **BUNDLE-02**: Title, Description, Expiry, Password (opt), Watermark toggle → **Generate Link**
- **READY**: Link + **Copy**, View counter, Back‑channel toggle (optional), Analytics snippet, **Open Employer View**
- **SEEK-PREVIEW**: Candidate header, list with players & transcripts, **RCS badge** per item

### SET-SEEK — Settings

- Profile edits, **Launch ID verify**, Notifications, Data export/delete placeholders

---

### REFERRER Flow

**INV-LAND**

- Context summary (seeker, company, dates, relationship), time estimate
- **Accept & Start** / **Decline**

**INV-VERIFY**

- If token valid: “Verified as [email]”
- Else: Email + **Send OTP**, OTP input, LinkedIn connect → **Continue**

**RESP-MODE**

- Choose: **Record Video / Record Audio / Write Text**
- Note: “Video/Audio 2:00 (+2:00), Text 500 chars”

**RESP-VID / RESP-AUD / RESP-TXT**

- Recorders with **Start/Pause/Retake/Extend +2:00**
- Text area with 500‑char counter

**RESP-Q**

- One question per step, progress bar, teleprompter tips, Next/Prev

**RESP-ATTACH**

- Upload (PDF/Image), file list

**RESP-REVIEW**

- Playback, **Transcript editor** (timestamped), Consent checkboxes:
  - “I worked with [seeker]…”
  - “I consent to share per request”
- **Submit**

**RESP-DONE**

- Thank you, **Create lightweight account** (optional)

**REF-MANAGE**

- List of references with **Retract/Edit** actions & statuses

---

### HIRING / EMPLOYER Flow

**EMP-VIEW**

- Candidate header + verified badges
- **Aggregated RCS** pill (Low/Med/High + score)
- References list with players/transcripts + per-item **RCS badge**
- **Request verification / reach‑back** button

**EMP-RB-ASK**

- Fields: Employer name, email, purpose/message
- Banner: “Seeker will be notified; reply is private to hiring for now.”
- **Send**

**EMP-RB-SENT**

- Status chip: **Verification requested**

---

## 6) RCS (Simplified) — MVP Logic (Front-End Mock)

> Final scoring runs server-side; UI may simulate for demos.

- **Bands:** Low (0–49), Medium (50–79), High (80–100)
- **Heuristics:**
  - +40 if **Identity & Tenure** verified (seeker KYC ok, referrer verification ok, dates align)
  - +30 if **Content Consistency** (no contradictions vs seeker profile/resume/LinkedIn)
  - +30 if **Provenance** (media integrity check passed; transcript aligns with audio; normal retake count)
- **Aggregated RCS (Employer Viewer):** weighted average of included references; show pill + “Why” tooltip with top 2 reasons.

---

## 7) Data Model (Proto)

> Use this as a starting point for types/interfaces.

```ts
// Core entities (frontend types)
type UUID = string;
type Timestamp = string; // ISO

interface User {
  id: UUID;
  role: "seeker" | "referrer" | "admin";
  name: string;
  email: string;
  phone?: string;
  headline?: string;
  kycStatus?: "unverified" | "pending" | "verified" | "failed";
  createdAt: Timestamp;
}

interface Relationship {
  id: UUID;
  seekerId: UUID;
  referrerEmail: string;
  referrerName?: string;
  company?: string;
  roleAtTime?: string;
  relationshipType?: "manager" | "peer" | "client" | "other";
  startDate?: string;
  endDate?: string; // or "Present"
  proofDocs?: Array<{ name: string; url: string }>;
}

interface ReferenceRequest {
  id: UUID;
  seekerId: UUID;
  relationshipId: UUID;
  status:
    | "pending"
    | "opened"
    | "started"
    | "submitted"
    | "declined"
    | "revoked"
    | "expired";
  allowedFormats: { video: boolean; audio: boolean; text: boolean };
  dueDate?: string;
  backchannelAllowed: boolean;
  questions: Array<{
    id: string;
    text: string;
    type: "text" | "video" | "audio";
  }>;
  delivery: { email: string; sms?: string; shareLink?: string };
  timeline: Array<{ event: string; at: Timestamp }>;
}

interface ReferenceResponse {
  id: UUID;
  requestId: UUID;
  referrerEmail: string;
  mode: "video" | "audio" | "text";
  mediaUrl?: string;
  transcript?: string;
  textAnswer?: string;
  attachments?: Array<{ name: string; url: string }>;
  submittedAt: Timestamp;
  retractState?: "active" | "requested" | "retracted";
}

interface Bundle {
  id: UUID;
  seekerId: UUID;
  title: string;
  description?: string;
  expiry?: string;
  passwordProtected?: boolean;
  watermark?: boolean;
  referenceIds: UUID[];
  analytics?: { views: number; avgWatchSec?: number };
  backchannelAllowed?: boolean;
}

interface ConfidenceSignals {
  identityTenure: "pass" | "warn" | "fail";
  contentConsistency: "pass" | "warn" | "fail";
  provenance: "pass" | "warn" | "fail";
}

interface ConfidenceScore {
  referenceId?: UUID;
  bundleId?: UUID;
  score: number; // 0-100
  band: "low" | "medium" | "high";
  reasons: string[]; // top 2-3 bullets
  computedAt: Timestamp;
}
```

---

## 8) API Sketch (Frontend Contracts)

> Replace with real endpoints later; these unblock UI integration.

```
POST /auth/magic-link { email }
POST /auth/verify-link { token }

POST /kyc/seeker/start { docType }
POST /kyc/seeker/submit { images[], selfie }
GET  /kyc/seeker/status

POST /relationships { seekerId, referrerEmail, ... }
POST /reference-requests { relationshipId, allowedFormats, questions[], dueDate, backchannelAllowed, delivery }
GET  /reference-requests/:id
POST /reference-requests/:id/resend
POST /reference-requests/:id/revoke

POST /reference-responses/:requestId/start
POST /reference-responses/:requestId/submit { mode, media, transcript|text, attachments[] }
POST /reference-responses/:id/retract

GET  /library { filters }
POST /bundles { title, settings, referenceIds[] }
GET  /bundles/:id
POST /bundles/:id/link (generate)
GET  /bundles/:id/analytics

POST /employer/:bundleId/reach-back { name, email, message }
GET  /employer/:bundleId (public view)

GET  /rcs/:bundleId (aggregated)
GET  /rcs/:referenceId (per item)
```

---

## 9) Component Inventory (Frontend)

- **Buttons & Inputs:** primary/secondary/ghost, text fields, date pickers, tabs, toggles
- **Recorders:** video (camera, timer, retake, extend), audio (meter, timer)
- **RCS badge + tooltip** (reasons)
- **Reference card** (thumbnail, mode, date, RCS)
- **Timeline** (request detail)
- **Transcript editor** (timestamped)
- **Share link modal** (link, copy, password, expiry)
- **Notifications drawer**
- **Status chips** (verification requested, pending, declined)

---

## 10) Analytics (MVP)

- Invite → Start, Start → Submit, time to submit
- Mode mix: % video/audio/text
- Bundle: views, avg watch time
- Verification queue pass rate, retraction rates

---

## 11) Security, Privacy, Compliance

- **PII:** store in vault; encrypt at rest; redact in logs.
- **Media:** signed URLs; short-lived tokens.
- **Audit:** every view/download/event.
- **EU/US:** consent for KYC; right to delete/export; configurable retention.
- **Back-channel privacy window:** enforce 5 days server-side; surface “status only” in UI for MVP.

---

## 12) Integrations

- **LinkedIn** (OAuth read-only): positions/dates for cross-check.
- **Email/SMS**: invitations & notifications.
- **Greenhouse (later):** recruiters paste bundle link; future partner API to attach RCS note.
- **Resume Parser:** **in-house** (spaCy + rules); extracts roles, companies, dates, skills.

---

## 13) Non-Goals (MVP)

- Full ATS integrations, SSO for employers, complex admin dashboards
- Public OSINT controls in UI
- Advanced deepfake detection beyond liveness + basic heuristics
- Full analytics suite (we do minimal KPIs)

---

## 14) Accessibility & i18n

- Captions/subtitles on by default.
- Keyboard and screen-reader friendly forms; focus states.
- Error messaging with ARIA-live regions.
- English-only MVP with string externalization for future i18n.

---

## 15) Test Plan (High-Level)

- **Unit:** UI components (recorders stubbed), form validation, RCS badge rendering
- **Integration:** New Reference flow E2E (fake backend), Referrer submission, Bundle view
- **Security:** Verify public bundle view respects password/expiry
- **Privacy:** 5-day hiring-only replies are hidden from seeker during window
- **Mobile:** recorders and uploads on iOS/Android browsers

---

## 16) Open Questions for the Owner (for IDE Agent to ask)

1. **Branding & Tone:** Do we have style guidelines (colors, type scale) or should MVP use a neutral design system?
2. **Question Templates:** Provide the default “General (character/collab)” question set (exact wording and count).
3. **Recording Constraints:** Do we allow **multiple takes** and choose best, or force single final submission?
4. **Transcript Editing:** Should referrers be able to edit transcripts before submit (yes assumed) and after submit (no?)—confirm.
5. **Back‑Channel Approval UX:** Should seeker approval for reach‑back be per-request, per‑bundle, or global default? (Current: per-request + bundle toggle.)
6. **Employer Identity:** Do we require employer email domain verification before showing private replies? (Currently unspecified.)
7. **Retraction Window UI:** Should we surface countdown banners to seekers (currently planned for later)?
8. **Aggregated RCS Calculation:** For bundles, simple average vs weighted by recency/source format? (Current: simple average.)
9. **Resume Parser Fields:** Exact fields to extract (skills taxonomy, seniority, tools). Provide examples to calibrate.
10. **Legal Copy:** Provide consent language for KYC and sharing; any jurisdiction-specific clauses?
11. **Storage & Limits:** Max upload size/bitrate for media; CDN strategy (HLS vs progressive).
12. **Notifications:** Which events trigger email vs SMS by default?
13. **Employer Export:** Should employer viewer export to PDF/JSON be in MVP?
14. **Referrer Account:** After submission, can referrer edit content without seeker approval? (Assumed: edit window or admin-only changes.)
15. **Identity Failures:** What happens if seeker KYC fails? Soft-block reference creation?
16. **OSINT Consent Text:** Where to capture consent (profile-level checkbox vs per-request).
17. **Greenhouse Timeline:** Is the lightweight copy-paste integration enough for v1?

---

## 17) Getting Started (for the IDE Agent)

- Create a monorepo with **apps/web** (Next.js/React), **packages/ui** (component lib), **packages/types** (shared TS types).
- Scaffold pages from the **UI Frames** above. Use feature flags for: `backchannel`, `transcriptEditing`, `kyc`.
- Mock APIs using `msw` or Next.js API routes with in-memory store.
- Build **RCS badge** component and **recorders** with fallbacks (upload files when getUserMedia fails).
- Implement **public bundle viewer** route: `/b/:bundleId`.

---

_End of Codex Pack. Save this file as `README-DeepRef-Codex.md` in the project root so the agent can index it._
