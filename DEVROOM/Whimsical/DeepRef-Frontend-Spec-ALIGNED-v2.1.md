# Deep Ref — Frontend Spec (ALIGNED) · v2.1

> Canonical, reconciled spec that **aligns** the two documents:
> - *Deep Ref — Frontend Sitemap & Wireframe Spec (MVP) · Swimlanes v2 Update*
> - *Deep Ref — Frontend Swimlanes (v2) with Updated Verification Rules*

It merges frame names, page contents, navigation, and arrows into a **single source of truth**. Verification rules are consistent: **Seeker = ID + Selfie; Referrer = Email OTP + Phone OTP (2FA); Hiring = Email verify for reach‑back**.

---

## 0) Naming Conventions (canonical)

- **Lane names:** AUTH/GLOBAL · SEEKER · REFERRER · HIRING/EMPLOYER · ADMIN/TRUST
- **Frame IDs:** `PREFIX-NN · Title` (e.g., `REQ-01 · New Reference · Choose Referrer`)
- **Components:** `CMP-...` (e.g., `CMP-RCS-BADGE`)
- **Status chips:** Pending, Completed, Declined, Needs Attention

---

## 1) AUTH / GLOBAL (top lane)

1. **AUTH-01 · Welcome / Value Prop** — Logo; 1‑liner; **Sign in**; **Create account**; Privacy/Terms.  
2. **AUTH-02 · Sign In (Email Magic Link)** — Email input; **Send magic link**; **Resend**; error/sent states.  
3. **AUTH-03 · Create Account (Seeker / Referrer / Hiring)** — First/Last; Email; Password or Magic; **Keep me signed in**; Role toggle.  
4. **AUTH-04 · Verify Email (Magic Link Sent)** — “Check inbox”; **Open mail app**; **Resend**.  
5. **ID-SEEK-01 · Seeker ID Capture (Front/Back)** *(Seeker only)* — Doc type; capture front/back; consent; **Continue**.  
6. **ID-SEEK-02 · Seeker Selfie Liveness** *(Seeker only)* — Camera; prompts; **Submit for verification**.  
7. **ID-SEEK-03 · Seeker Verification Result** *(Seeker only)* — Verified / Needs review; **Go to Dashboard**.  
8. **NOTIFS · Notifications Drawer** — Requests; reach‑back approvals; retract timers.

**Global arrows:** `AUTH-04 → SEEK-01` (Seeker) · `AUTH-04 → INV-LAND` (Referrer via invite) · `AUTH-04 → EMP-VIEW` (Employer opening bundle).

---

## 2) SEEKER lane (home & core flow)

1. **SEEK-01 · Seeker Profile Setup** — Avatar; Headline; LinkedIn import (stub); Resume; Contacts; **Save & Continue**.  
2. **SEEK-HOME · Dashboard** — Header; mini **Aggregated RCS**; tiles (**Pending/Completed/Declined/Needs**); **New Reference Request**; recent activity; “Ready to bundle” strip.  
3. **REQ-01 · New Reference · Choose Referrer** — Name*; Email*; Company; Role‑at‑time; Relationship; **Import contacts**; **Next**.  
4. **REQ-02 · New Reference · Context (Role & Dates)** — Role title; Start/End (Present toggle); Team/Project; **Proof docs** upload (opt); **Next**.  
5. **REQ-03 · New Reference · Questions** — Tabs: **General / Generated from URL/Scope / Custom**; edit/reorder; limits note; **Next**.  
6. **REQ-04 · New Reference · Format & Privacy** — Toggles: **Video/Audio/Text**; Due date; “~3–5 min”; **Allow employer reach‑back** (OFF); “Private until bundled”; **Next**.  
7. **REQ-05 · New Reference · Delivery** — Email (req), SMS (opt), Share link; Custom message; Preview; **Send**.  
8. **REQ-06 · Request Sent (Success)** — Checkmark; **Go to Request Detail** | **Back to Dashboard**.  
9. **REQ-DETAIL · Request Detail (Timeline & Actions)** — Timeline (Sent → Opened → Started → Submitted); **Resend/Edit/Revoke**; mini **RCS (Pending)**.  
10. **LIB-01 · References Library** — Filters (Company/Date/Format/RCS band); cards w/ **RCS**; bulk select → **Add to Bundle**.  
11. **BUNDLE-01 · Create Bundle (Select & Reorder)** — Selected refs; drag reorder; **Next: Bundle Settings**.  
12. **BUNDLE-02 · Bundle Settings (Expiry / Password / Watermark)** — Title; Description; Expiry; Password (opt); Watermark; **Generate Link**.  
13. **BUNDLE-READY · Bundle Link Ready (Copy + Analytics)** — Link + **Copy**; views; **Allow employer reach‑back** (bundle‑level); analytics snippet; **Open Employer View**; **Done**.  
14. **SEEK-PREVIEW · Bundle Viewer (Seeker Preview)** — Candidate header; refs w/ players & transcripts; per‑item **RCS**; **Open Employer View**.  
15. **SET-SEEK · Seeker Settings** — Profile; **Launch ID verification**; Notifications; Data export/delete (stub).

**Guard:** If not KYC‑verified, attempts to send request or bundle route to `ID-SEEK-01` → `ID-SEEK-02` → `ID-SEEK-03` → back.

**Arrows:** `REQ-05 → INV-LAND` · `BUNDLE-READY → EMP-VIEW` · `RESP-DONE → REQ-DETAIL` · retraction notifications flow back to `REQ-DETAIL`.

---

## 3) REFERRER lane (invite → 2FA → submit)

1. **INV-LAND · Referrer Invite Landing (Accept/Decline)** — Context; consent; **Accept & Start / Decline**.  
2. **INV-VERIFY-EMAIL · Email Verification (OTP/Magic)** — Prefilled email; **Send OTP**; 6‑digit; resend; success; **Connect LinkedIn** (optional).  
3. **INV-VERIFY-PHONE · Phone Verification (OTP)** — Country + phone; **Send code (SMS/Voice)**; 6‑digit; success.  
4. **RESP-MODE · Choose Response Mode** — **Record Video / Record Audio / Write Text**; “2:00 (+2:00) / 500 chars”.  
5. **RESP-VID / RESP-AUD / RESP-TXT** — Recorders (Start/Pause/Retake/**Extend +2:00**), timers; Text area w/ 500‑char counter.  
6. **RESP-Q · Guided Questions** — One at a time; progress; teleprompter tips.  
7. **RESP-ATTACH · Attachments (Optional)** — Upload letter/certificate.  
8. **RESP-REVIEW · Review & Consent** — Playback/transcript edit; Check: “I worked with [seeker]” + “I consent to share”; **Submit**.  
9. **RESP-DONE · Submission Success** — Thank you; (optional) **Create lightweight account**.  
10. **REF-MANAGE · Referrer Manage** — List; **Retract**; **Edit** if window open.

**Arrows:** `INV-LAND → INV-VERIFY-EMAIL → INV-VERIFY-PHONE → RESP-MODE` · `RESP-REVIEW → RESP-DONE` · `RESP-DONE → REF-MANAGE`.

---

## 4) HIRING / EMPLOYER lane (bundle viewer → reach‑back)

1. **EMP-VIEW · Employer Viewer (Aggregated RCS + References)** — Candidate header; **Aggregated RCS** pill + “Why”; list w/ per‑item **RCS**; **Request verification / reach‑back**.  
2. **EMP-VERIFY-EMAIL · Employer Email Verify (OTP)** — Email → **Send OTP** → 6‑digit → Verified (unlocks reach‑back).  
3. **EMP-RB-ASK · Reach‑back Request Modal** — Name; Email (prefilled when verified); Purpose/message; banner on 5‑day privacy; **Send**.  
4. **EMP-RB-SENT · Reach‑back Sent (Status)** — Chip: “Verification requested”.

**Arrows:** `EMP-VIEW → EMP-VERIFY-EMAIL → EMP-RB-ASK → EMP-RB-SENT`.

---

## 5) ADMIN / TRUST (stubs)

1. **ADM-VERIFY · Verification Queue** — Signals table (KYC, Email, Phone, Dates match); Suggested RCS; **Approve / Request info**.  
2. **ADM-DISPUTES · Disputes & Retracts** — Items with deadlines (10‑day auto; 30‑day grace); **Mark resolved**.

---

## 6) Components (canonical)

- **CMP-RCS-BADGE** — Pill: score + band; tooltip with top 2 reasons.  
- **CMP-VIDREC / CMP-AUDREC** — Recorders: retake, timer, **Extend +2:00**, upload states.  
- **CMP-TEXT** — 500‑char counter; clarity tips.  
- **CMP-TRANS** — Transcript editor (timestamps).  
- **CMP-SHARE** — Share link modal (link/copy, password, expiry, analytics).  
- **NOTIFS** — Drawer with quick actions.

---

## 7) Arrows (cross‑lane handoffs)

- **Seeker → Referrer:** `REQ-05 → INV-LAND`  
- **Referrer → Seeker:** `RESP-DONE → REQ-DETAIL` (and **REF-MANAGE → REQ-DETAIL** on retract)  
- **Seeker → Hiring:** `BUNDLE-READY → EMP-VIEW`  
- **Hiring → Seeker:** `EMP-VERIFY-EMAIL (success) → EMP-RB-ASK → NOTIFS`

---

## 8) Alignment Notes (what changed to reconcile)

- **Frame names & order:** Unified to the **Sitemap v2** nomenclature while keeping all **Swimlanes v2** steps; no duplicates remain.  
- **Verification rules:** Explicit across all lanes; **2FA phone** for referrer is kept **required** (consistent with both docs).  
- **Employer privacy rule:** 5‑day private replies called out on `EMP-RB-ASK` (text matches both docs).  
- **RCS placement:** Mini badge on `REQ-DETAIL`; per‑item on Library & Employer Viewer; Aggregated pill on Employer header.  
- **Back‑channel toggles:** Present on `REQ-04` and `BUNDLE-READY` (OFF by default).

---

## 9) Build Order (unchanged, confirmed)

1) Seeker: **Dashboard → REQ‑01…05 → REQ‑DETAIL**  
2) Referrer: **INV‑LAND → INV‑VERIFY‑EMAIL → INV‑VERIFY‑PHONE → RESP‑MODE → RESP‑… → RESP‑REVIEW → RESP‑DONE**  
3) Seeker: **LIB‑01 → BUNDLE‑01/02 → BUNDLE‑READY → SEEK‑PREVIEW**  
4) Employer: **EMP‑VIEW + EMP‑VERIFY‑EMAIL + EMP‑RB‑ASK/SENT**  
5) Identity: **ID‑SEEK‑01/02/03**  
6) Components: **RCS, recorders, transcript editor, share modal**

---

## 10) Route & Nav (summary)

- **Seeker:** `/app/seeker` · `/app/seeker/requests/...` · `/app/seeker/library` · `/app/seeker/bundles/...` · `/app/seeker/settings/...`  
- **Referrer:** `/r/invite/:token` · `/r/verify/email` · `/r/verify/phone` · `/r/respond/:requestId/...` · `/r/app/submissions`  
- **Employer:** `/b/:bundleId` (verify + reach‑back overlays)  
- **Admin:** `/admin/verification` · `/admin/disputes`

---

Everything above is now the **canonical** source. Use these exact frame titles and arrows in Whimsical.
