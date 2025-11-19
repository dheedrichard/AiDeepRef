# Deep Ref — Complete Front-End Frames Plan (with Navigation & 2FA) · v3

> Purpose: A Whimsical-ready, end‑to‑end list of frames (screens) with **exact titles**, **UI elements**, **nav per screen**, and **arrows**. Includes updated verification rules (Seeker KYC; Referrer Email+Phone 2FA; Employer Email verify).

---

## Global Shell

### Global Primary Nav (role-aware)
- **Seeker:** Dashboard · Requests · Library · Bundles · Settings · Help _(Sign out sticky bottom)_
- **Referrer (light acct):** Requests · Respond · Submissions · Profile · Help
- **Admin/Trust:** Verification · Disputes · Audit
- **Employer Viewer:** No left rail; header actions only

**Common pieces**
- Top bar: App name/logo, Notifications bell (drawer), User menu (Profile, Settings, Sign out)
- Footer (public + app): Privacy · Terms · Help

---

# AUTH / GLOBAL (Top Lane)

## AUTH-01 · Welcome / Value Prop
**Nav:** Public header (Sign in, Create account) + Footer  
**Elements:**
- Logo + product name
- 1‑liner: “Confidence‑ranked references, shareable in one link”
- Primary CTAs: **Sign in**, **Create account**
- Footer links: Privacy, Terms

## AUTH-02 · Sign In (Email Magic Link)
**Nav:** Public header + Footer  
**Elements:**
- Email input (validation, error states)
- **Send magic link** (disabled until valid email)
- **Resend** link (cooldown 30s)
- Inline info: security note
**States:** sent, error (rate-limit, unknown user)

## AUTH-03 · Create Account (Choose Role)
**Nav:** Public header + Footer  
**Elements:**
- First name, Last name, Email, Password (or “Use magic link only” toggle)
- Role toggle: **Seeker / Referrer / Hiring**
- Checkbox: **Keep me signed in**
- CTA: **Create account**
- Link: “Already have an account? Sign in”
**Validation:** email uniqueness; password strength when used

## AUTH-04 · Verify Email (Magic Link Sent)
**Nav:** Public header + Footer  
**Elements:**
- Illustration + copy: “Check your inbox to finish signing in”
- **Open mail app**, **Resend**
- Support link

## NOTIFS · Notifications Drawer (component)
**Appears:** for authenticated users in app shell  
**Elements:**
- Items with: title, timestamp, status chip
- Filters: Unread/All
- Quick actions: Approve/Decline (reach‑back), View detail
**States:** empty, error, batched pagination

---

# SEEKER Lane

> **Guard:** If Seeker not KYC‑verified and tries to send a request or generate a bundle → redirect to **ID-SEEK-01**.

## SEEK-01 · Seeker Profile Setup
**Primary nav:** Seeker left rail (Dashboard highlighted)  
**Elements:**
- Avatar upload, Headline
- **Import from LinkedIn** (placeholder)
- Resume upload (PDF/DOC)
- Contacts: Email (prefilled), Phone (optional)
- CTA: **Save & Continue**
**Validation:** file types/size; phone E.164; required fields

## ID-SEEK-01 · ID Capture (Front/Back)
**Nav:** Seeker left rail; breadcrumb: Settings › Verification  
**Elements:**
- Doc type (DL/Passport/ID)
- Capture **Front** (preview/retake)
- Capture **Back** (preview/retake)
- Consent checkbox
- CTA: **Continue**
**States:** camera blocked, upload fail

## ID-SEEK-02 · Selfie Liveness
**Nav:** Seeker left rail; breadcrumb: Settings › Verification  
**Elements:**
- Camera view; prompts: Blink / Turn head
- Timer/progress dots
- **Capture**, **Retake**
- CTA: **Submit for verification**

## ID-SEEK-03 · Verification Result
**Nav:** Seeker left rail; breadcrumb: Settings › Verification  
**Elements:**
- Status card: **Verified / In review / Needs review**
- Next CTA: **Go to Dashboard**
- Help link

## SEEK-HOME · Dashboard
**Nav:** Seeker left rail (Dashboard active)  
**Elements:**
- KYC status banner (Verify / In review / Verified)
- KPI tiles: **Pending / Completed / Declined / Needs Attention**
- Primary CTAs: **New Reference Request**, **Create Bundle**
- Recent activity table (Request, Status, Last activity, Actions)
- “Ready to bundle” strip (checkboxes + Add to Bundle)
**Empty:** first‑run illustration + CTA

## REQ-01 · New Reference · Choose Referrer
**Nav:** Seeker left rail (Requests active)  
**Elements:**
- Name*, Email*, Company, Role at time
- Relationship: Manager/Peer/Client/Other
- Button: **Import from contacts**
- CTA: **Next**
**Validation:** required fields, email format

## REQ-02 · New Reference · Context (Role & Dates)
**Nav:** Requests active  
**Elements:**
- Role title
- Start date, End date (Present toggle)
- Team/Project (optional)
- Checkbox: **I have proof docs** → upload zone (PDF/Image)
- CTA: **Next**

## REQ-03 · New Reference · Questions
**Nav:** Requests active  
**Elements:**
- Tabs: **General**, **Generated from URL/Scope**, **Custom**
- URL/Scope input + **Generate**
- Editable list with drag handles
- Limits helper: “Text 500 chars; Video/Audio 2:00 (+2:00)”
- CTA: **Next**

## REQ-04 · New Reference · Format & Privacy
**Nav:** Requests active  
**Elements:**
- Toggles: **Video**, **Audio**, **Text**
- Due date picker
- Helper: “~3–5 minutes to complete”
- Toggle (default OFF): **Allow employer reach‑back**
- Note: “Private until added to a bundle”
- CTA: **Next**

## REQ-05 · New Reference · Delivery
**Nav:** Requests active  
**Elements:**
- Send via: **Email** (required), **SMS** (optional), **Share link**
- Custom message textarea
- Preview card (referrer view)
- CTA: **Send**
**Arrow:** → `INV-LAND`

## REQ-06 · Request Sent (Success)
**Nav:** Requests active  
**Elements:** Success checkmark; **Go to Request Detail** | **Back to Dashboard**

## REQ-DETAIL · Request Detail (Timeline & Actions)
**Nav:** Requests active  
**Elements:**
- Referrer card (name, company, role‑at‑time), Status chip
- Timeline: **Sent → Opened → Started → Submitted** (timestamps)
- Actions: **Resend**, **Edit** (if not started), **Revoke**
- Mini **RCS** status: **Pending** (tooltip stub)

## LIB-01 · References Library
**Nav:** Library active  
**Elements:**
- Search bar; Filters: Company, Date range, Format, RCS band
- Cards: thumbnail (video/audio/text), title/date, **RCS badge**, tags
- Bulk select → **Add to Bundle**
**Empty:** “No references yet—send a request from Dashboard”

## BUNDLE-01 · Create Bundle (Select & Reorder)
**Nav:** Bundles active  
**Elements:**
- Left: selected references (drag reorder, remove)
- Right: summary panel
- CTA: **Next: Bundle Settings**

## BUNDLE-02 · Bundle Settings
**Nav:** Bundles active  
**Elements:**
- Title, Description
- Expiry date
- Password (optional), Watermark toggle
- CTA: **Generate Link**

## BUNDLE-READY · Bundle Link Ready
**Nav:** Bundles active  
**Elements:**
- Share link box + **Copy**
- View counter
- Toggle: **Allow employer reach‑back** (bundle‑level)
- Mini analytics: views, avg watch time
- Buttons: **Open Employer View**, **Done**

## SEEK-PREVIEW · Bundle Viewer (Seeker)
**Nav:** Bundles active  
**Elements:**
- Candidate header (verified badge)
- References list with players/transcripts
- Per‑item **RCS badge**
- Button: **Open Employer View** (read‑only)

## SET-SEEK · Seeker Settings
**Nav:** Settings section active; **secondary menu** in content panel:  
Profile · **Verification** · Notifications · Billing · Data & Privacy  
**Elements:** section content + **Save**

---

# REFERRER Lane (Includes 2FA)

## INV-LAND · Referrer Invite Landing
**Nav:** None (public, focused)  
**Elements:**
- Context: seeker, company, dates, relationship
- Estimate: “~3–5 minutes”
- Buttons: **Accept & Start**, **Decline**
- Consent summary (small print)
**Arrow:** Accept → `INV-VERIFY-EMAIL`

## INV-VERIFY-EMAIL · Email Verification (OTP/Magic)
**Nav:** Inline stepper (Email → Phone → Respond)  
**Elements:**
- Email (prefilled from invite if present)
- **Send OTP** button; 6‑digit code input (auto‑advance)
- Resend (30s), error states
- Success: “Email verified ✓”
- **Connect LinkedIn** (optional RCS boost)
- CTA: **Continue**
**Arrow:** → `INV-VERIFY-PHONE`

## INV-VERIFY-PHONE · Phone Verification (2FA OTP)
**Nav:** Inline stepper (Email → **Phone** → Respond)  
**Elements:**
- Country code + phone (E.164 mask)
- **Send code (SMS)**; (optional) **Voice call**
- 6‑digit code input (auto‑advance)
- Resend, error states
- Success: “Phone verified ✓”
- CTA: **Continue to response**
**Arrow:** → `RESP-MODE`

## RESP-MODE · Choose Response Mode
**Nav:** none (wizard header)  
**Elements:** big options **Record Video / Record Audio / Write Text**; helper with limits
**Arrows:** → `RESP-VID` or `RESP-AUD` or `RESP-TXT`

## RESP-VID · Record Video
**Elements:** camera preview; **Start/Pause/Retake/Extend +2:00**; timer; upload progress; error state; **Next**

## RESP-AUD · Record Audio
**Elements:** level meter; **Start/Pause/Retake/Extend +2:00**; timer; upload progress; **Next**

## RESP-TXT · Write Text
**Elements:** question prompt; textarea with **500‑char** counter; autosave; **Next**

## RESP-Q · Guided Questions
**Elements:** one question per step; progress bar; teleprompter/guidance toggle; **Prev/Next**

## RESP-ATTACH · Attachments (Optional)
**Elements:** upload zone (PDF/Image); file chips; **Next**

## RESP-REVIEW · Review & Consent
**Elements:**
- Playback (video/audio) or text summary
- **Transcript editor** (timestamp chunks)
- Checkboxes: “I worked with [seeker] …” · “I consent to share per request”
- Buttons: **Submit**, **Back**

## RESP-DONE · Submission Success
**Elements:** Thank‑you; button: **Create lightweight account** (optional)  
**Arrows:** → close OR → `REF-MANAGE` (if created account)

## REF-MANAGE · Referrer Manage (light account)
**Nav:** Referrer left rail (Submissions active)  
**Elements:**
- List: title, date, status
- Row actions: **Retract**, **Edit** (if window open)
- Verification status summary (Email ✓, Phone ✓, LinkedIn ✓/–)

---

# HIRING / EMPLOYER Lane

## EMP-VIEW · Employer Viewer (Aggregated RCS + References)
**Nav:** No left rail; sticky header actions  
**Header Elements:**
- Candidate name, headline, verified badge
- **Aggregated RCS** pill + “Why” tooltip (top 1–2 reasons)
- Button: **Request verification / reach‑back**
**Body Elements:**
- References list with players, transcript toggle
- Per‑item **RCS badge**
- If not verified: inline prompt “Verify your email to contact referrer”

## EMP-VERIFY-EMAIL · Verify Employer Email (OTP)
**Nav:** Modal/route overlay from EMP‑VIEW  
**Elements:**
- Email input (work email hint)
- **Send OTP**; 6‑digit code input; success
- Close → returns to EMP‑VIEW with button enabled

## EMP-RB-ASK · Reach‑back Request
**Nav:** Modal/route overlay  
**Elements:**
- Employer name; Email (prefilled if verified); Purpose/message
- Banner: “Seeker will be notified; referrer’s reply is private to hiring for 5 days”
- Buttons: **Send**, **Cancel**
**Arrow:** → `EMP-RB-SENT`

## EMP-RB-SENT · Reach‑back Sent (Status)
**Nav:** EMP‑VIEW status chip  
**Elements:** Chip: **Verification requested**; link to thread (future)

---

# ADMIN / TRUST Lane (MVP-thin)

## ADM-VERIFY · Verification Queue
**Nav:** Admin left rail (Verification active)  
**Elements:**
- Table: Reference · Seeker · Referrer · Signals (KYC, Email, Phone, Dates match) · Suggested RCS · Submitted at
- Row actions: **Approve**, **Request more info**
- Filters: Status, Date range

## ADM-DISPUTES · Disputes & Retracts
**Nav:** Admin left rail (Disputes active)  
**Elements:**
- Table: Reference · Type (Retract/Dispute) · Deadline (timer) · Actions
- Banners: “Auto‑retract in 10 days unless seeker responds” / “30‑day grace”

---

## Arrows (Handoffs & Guards)
- **Seeker flow:** `SEEK-HOME → REQ-01 → REQ-02 → REQ-03 → REQ-04 → REQ-05 → REQ-06 → REQ-DETAIL`
- **Invite handoff:** `REQ-05 → INV-LAND`
- **Referrer flow (with 2FA):** `INV-LAND → INV-VERIFY-EMAIL → INV-VERIFY-PHONE → RESP-MODE → (RESP-VID/AUD/TXT) → RESP-Q → RESP-ATTACH → RESP-REVIEW → RESP-DONE → REF-MANAGE`
- **Bundle share:** `LIB-01 → BUNDLE-01 → BUNDLE-02 → BUNDLE-READY → SEEK-PREVIEW → EMP-VIEW`
- **Employer reach-back:** `EMP-VIEW → EMP-VERIFY-EMAIL → EMP-RB-ASK → EMP-RB-SENT`
- **KYC guard:** Any attempt to send request or bundle when unverified → `ID-SEEK-01 → ID-SEEK-02 → ID-SEEK-03 → return`

---

## Validation & Error States (quick list to sketch)
- Email/OTP invalid, resend cooldowns (30s) for all OTPs
- Camera/mic blocked; permission banners and retry
- File type/size validation for uploads
- Network retries with toast banners
- Authorization guard banners (KYC not complete; Employer not verified)

---

## RCS UI Hooks (where to place)
- **REQ-DETAIL** mini badge (Pending → Scored)
- **Library & Employer Viewer:** per-item badge + tooltip
- **Employer Viewer header:** Aggregated RCS pill + “Why” tooltip

---

## Accessibility & Mobile Notes
- Left rail collapses <1024px; use tabs for Settings sub-pages
- Focus management for modals, OTP auto-advance with clear labels
- Captions/transcripts available; high-contrast badge colors

---

This plan is exhaustive for MVP and matches the swimlanes + verification rules. Copy the titles exactly as frame names in Whimsical, and wire the arrows as listed.
