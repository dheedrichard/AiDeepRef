# DeepRef — User Flow Diagrams

> Complete user journeys across all roles (Seeker, Referrer, Employer) with decision trees, conditional paths, and cross-role handoffs.

---

## Table of Contents

1. [Authentication Flows](#authentication-flows)
2. [Seeker Flows](#seeker-flows)
3. [Referrer Flows](#referrer-flows)
4. [Employer Flows](#employer-flows)
5. [Cross-Role Interactions](#cross-role-interactions)
6. [Edge Cases & Error Flows](#edge-cases--error-flows)

---

# AUTHENTICATION FLOWS

## Flow 1: New User Sign-Up (Seeker)

```
START: User lands on DeepRef
  ↓
AUTH-01: Welcome Page
  ├─ [Sign In] → Flow 2 (Existing User)
  └─ [Create Account] → AUTH-03
         ↓
      AUTH-03: Create Account
         • Enter: Name, Email
         • Select Role: [Seeker] ← default
         • Password or Magic Link option
         • Check: Terms acceptance
         ↓
      [Create Account] clicked
         ↓
      Backend: Create user account
         ↓
      AUTH-04: Verify Email
         • Email sent with verification link
         • User clicks link in email
         ↓
      Backend: Verify email token
         ↓
         ├─ Valid? YES →
         │     ↓
         │  SEEK-01: Profile Setup
         │     • Add photo, headline
         │     • Upload resume (optional)
         │     • Add contact info
         │     ↓
         │  [Save & Continue]
         │     ↓
         │  Check: KYC Status?
         │     ├─ Not verified →
         │     │     ↓
         │     │  SEEK-HOME: Dashboard
         │     │     • Banner: "Complete ID verification"
         │     │     • Limited features (can't send requests yet)
         │     │     • [Verify Identity Now] → Flow 3 (KYC)
         │     │
         │     └─ Already verified (unlikely for new user) →
         │           ↓
         │        SEEK-HOME: Dashboard (full access)
         │
         └─ Valid? NO → AUTH-04: Error
               • "Invalid or expired link"
               • [Resend verification email]
               • Loop back to AUTH-04
```

**Key Decision Points:**
- Role selection (Seeker/Referrer/Employer) → Different onboarding paths
- Password vs Magic Link → Different auth methods
- Email verification success/fail → Proceed or retry
- KYC status → Feature access control

**Alternate Paths:**
- Skip profile setup → Go to dashboard with incomplete profile banner
- LinkedIn import → Pre-fill profile data
- Resume upload → Parse and suggest referrers

---

## Flow 2: Existing User Sign-In

```
START: User on Auth-01 or direct login
  ↓
AUTH-02: Sign In
  • Enter: Email
  • [Send Magic Link] clicked
  ↓
Backend: Check email exists
  ├─ Email found? YES →
  │     ↓
  │  AUTH-04: Magic Link Sent
  │     • "Check your inbox"
  │     • Email with secure link sent
  │     ↓
  │  User clicks link in email
  │     ↓
  │  Backend: Verify token
  │     ├─ Valid & Not Expired? YES →
  │     │     ↓
  │     │  Determine user role
  │     │     ├─ Seeker → SEEK-HOME: Dashboard
  │     │     ├─ Referrer → REF-MANAGE: Dashboard
  │     │     ├─ Employer → EMP-VIEW or holding page
  │     │     └─ Admin → ADM-VERIFY: Dashboard
  │     │
  │     └─ Valid? NO or Expired? YES →
  │           ↓
  │        AUTH-02: Error
  │           • "Link expired or invalid"
  │           • [Resend magic link]
  │           • Loop back to AUTH-02
  │
  └─ Email found? NO →
        ↓
     AUTH-02: Error State
        • "No account found for this email"
        • "Would you like to [Create Account]?"
        • → AUTH-03 (with email pre-filled)
```

**Key Decision Points:**
- Email exists in system? → Proceed or suggest sign-up
- Token valid? → Authenticate or show error
- User role? → Route to appropriate dashboard

**Security:**
- Magic link expires in 15 minutes
- One-time use only
- IP address logged
- Rate limiting on send requests

---

## Flow 3: Seeker Identity Verification (KYC)

```
START: Seeker needs to verify identity
  ↓
Entry Points:
  • From dashboard banner: [Verify Identity Now]
  • From Settings › Verification
  • Blocked action: "Complete verification to send requests"
  ↓
ID-SEEK-01: ID Capture
  • Select document type: DL/Passport/ID
  • Capture front of ID
  │  ├─ [Capture] → Camera interface
  │  │     • Live preview
  │  │     • Guidelines overlay
  │  │     • [Capture Photo]
  │  │     ↓
  │  │  Preview image
  │  │     ├─ Quality good? YES → Save
  │  │     └─ Quality bad? YES → [Retake]
  │  │
  │  └─ [Upload] → File picker
  │        • Select image (JPG/PNG/PDF)
  │        • Validate file size < 10MB
  │        • Upload to server
  │
  • Capture back of ID (same process)
  • Check consent: "I consent to verification"
  ↓
[Continue] clicked (requires: both images + consent)
  ↓
ID-SEEK-02: Selfie Liveness
  • Camera initializes
  • Face detection overlay (oval guide)
  ↓
Liveness Sequence:
  1. "Look at camera" (2s)
  2. "Blink naturally" (detect blink)
     ├─ Blink detected? YES → Next
     └─ Not detected after 10s? → "Please blink" warning → Retry
  3. "Turn head slightly left" (detect rotation)
  4. "Turn head slightly right" (detect rotation)
  5. "Hold still" (capture final frame)
  ↓
Liveness checks:
  ├─ All prompts completed? YES →
  │     ↓
  │  Preview selfie
  │     ├─ User satisfied? YES → [Submit]
  │     └─ Want to retry? YES → [Retake] → Back to liveness sequence
  │
  └─ Failed liveness (3 attempts) →
        • "Liveness check failed"
        • Suggest: Better lighting, remove glasses
        • [Try Again] → Back to ID-SEEK-02
        • [Contact Support] → Support page
  ↓
[Submit for Verification] clicked
  ↓
Upload images + metadata to server
  • Encrypt and store securely
  • Trigger verification job
  ↓
ID-SEEK-03: Verification Result
  ↓
Backend Processing:
  1. Face matching (ID photo vs selfie)
  2. Document authenticity check (OCR, validation)
  3. Liveness analysis (multiple frames)
  4. Extract data (name, DOB, ID number)
  ↓
Verification Decision:
  ├─ Auto-Pass (high confidence)? YES →
  │     ↓
  │  ID-SEEK-03: Verified
  │     • ✓ "Identity verified!"
  │     • Update profile: kycStatus = "verified"
  │     • Add RCS points: +40
  │     • [Go to Dashboard]
  │     ↓
  │  SEEK-HOME: Dashboard (full access)
  │     • Banner removed
  │     • Can now send requests, create bundles
  │     • RCS score updated
  │
  ├─ Requires Manual Review? YES →
  │     ↓
  │  ID-SEEK-03: In Review
  │     • ⏱ "In review (10-30 min)"
  │     • Email notification when complete
  │     • [Continue to Dashboard] (limited access)
  │     ↓
  │  SEEK-HOME: Dashboard
  │     • Banner: "Verification in progress"
  │     • Check status periodically (polling)
  │     ↓
  │  Manual Review Completed
  │     ├─ Approved → Update status → Email notification → Full access
  │     └─ Rejected → Email notification → Retry option
  │
  └─ Auto-Fail (low confidence)? YES →
        ↓
     ID-SEEK-03: Failed
        • ✗ "Verification failed"
        • Reason: "ID doesn't match selfie" or "Document not accepted"
        • [Try Again] → Back to ID-SEEK-01
        • [Contact Support] → Support page
```

**Key Decision Points:**
- Camera permission? → Allowed or instructions to enable
- Image quality? → Accept or retake
- Liveness check passes? → Proceed or retry
- Verification result? → Verified, review, or failed
- Manual review outcome? → Approve or reject

**Edge Cases:**
- Camera not available → Fallback to upload + manual review
- Liveness fails 3 times → Manual review queue
- Verification pending > 24 hours → Escalate to support

**Security:**
- All images encrypted at rest
- PII redacted from logs
- Audit trail of access
- Rate limit: 3 verification attempts per 24 hours

---

# SEEKER FLOWS

## Flow 4: Create Reference Request (Happy Path)

```
START: Seeker wants to request a reference
  ↓
Entry Points:
  • SEEK-HOME: [+ New Reference Request]
  • LIB-01: [Request Reference]
  • Header shortcut: [+] menu
  ↓
Pre-Check: KYC Status?
  ├─ Not Verified →
  │     ↓
  │  Modal: "Complete verification first"
  │     • Explanation: "Verification unlocks this feature"
  │     • [Verify Now] → Flow 3 (KYC)
  │     • [Cancel] → Stay on current page
  │
  └─ Verified → Proceed
        ↓
     REQ-01: Choose Referrer
        ↓
     Option 1: Import from Resume/LinkedIn
        • [Resume] → Show parsed contacts
        • [LinkedIn] → OAuth flow → Show connections
        • User selects contact → Pre-fill form
        ↓
     Option 2: Manual Entry
        • Enter: Name, Email (required)
        • Enter: Company, Role (optional)
        • Select: Relationship (Manager/Peer/Client/Other)
        ↓
     Validation:
        • Email format check
        • Email deliverability check (MX record)
        • If email exists in DeepRef → Show "✓ Active user"
        ↓
     [Next: Add Context]
        ↓
     REQ-02: Context
        • Enter: Your role title (required)
        • Select: Start date, End date (or "Present")
        • Calculate duration automatically
        • Enter: Team/Project name (optional)
        • Enter: Brief description (optional, 250 char max)
        • [ ] I have proof documents
           └─ If checked → Upload area appears
              • Upload PDFs, images (max 5 files, 10MB each)
        ↓
     Cross-Verification:
        • If LinkedIn connected → Check dates match
        • If mismatch → Warning (allow to proceed)
        ↓
     [Next: Choose Questions]
        ↓
     REQ-03: Questions
        ↓
     Tab 1: General Questions
        • Pre-curated categories based on relationship type
        • Example for Manager:
           [ ] Leadership style
           [ ] Biggest achievement
           [ ] Technical competence
           [ ] Communication effectiveness
           [ ] Would hire again?
        • Social proof: "Used by 847 seekers"
        • [Show more] expands each category
        ↓
     Tab 2: Role-Specific Questions
        • Industry/role-based suggestions
        • Example for Software Engineer:
           [ ] Code quality approach
           [ ] Mentorship examples
           [ ] Architecture decisions
        ↓
     Tab 3: Custom Questions
        • [+ Add Custom Question]
        • Enter custom question (500 char max)
        • Multiple custom questions allowed
        ↓
     Selection Panel (sticky sidebar):
        • Shows selected questions (numbered)
        • Drag to reorder
        • [Edit] [Remove] actions
        • Estimated time: ~30-60s per question
        • Validation:
           ├─ < 3 questions → Error: "Add at least 3 questions"
           ├─ 3-7 questions → Optimal ✓
           ├─ 8-10 questions → Warning: "This may take 10+ minutes"
           └─ > 10 questions → Block: "Too many questions (max 10)"
        ↓
     [Next: Choose Format]
        ↓
     REQ-04: Format & Privacy
        ↓
     Format Selection:
        • Toggle 🎥 Video [ON/OFF]
        • Toggle 🎙 Audio [ON/OFF]
        • Toggle ✏️ Text [ON/OFF]
        • Must enable at least one
        ↓
     Deadline:
        • Quick select: [7 days] [14 days] [30 days]
        • Or: Date picker (custom)
        • Validation:
           ├─ < 3 days → Error: "Minimum 3 days"
           ├─ 3-6 days → Warning: "Short deadline may reduce response rate"
           ├─ 7-30 days → Optimal ✓
           └─ > 60 days → Warning: "Long deadline may cause delays"
        ↓
     Back-Channel Setting:
        • Toggle: [OFF/ON] Allow employer contact
        • Default: OFF
        • Info tooltip: Explains multi-step approval process
        ↓
     [Next: Review & Send]
        ↓
     REQ-05: Delivery
        ↓
     Delivery Methods:
        • ✉️ Email: Always ON (required)
           - Shows: jane.smith@techco.com
        • 📱 SMS: [Enable]
           - If enabled → Enter phone number
           - Validation: Valid mobile number (E.164)
        • 🔗 Link: Always generated after send
        ↓
     Custom Message:
        • Textarea with default template
        • Character limit: 500
        • Quick templates: [Formal] [Casual] [Follow-up]
        ↓
     Request Summary (review):
        • Shows all details from previous steps
        • [Edit] links → Jump to specific step
        ↓
     [👁 Preview Email] → Modal shows what referrer receives
        ↓
     Consent:
        • [✓] Required: "I confirm information is accurate"
        ↓
     [Send Request] clicked
        ↓
     Backend Processing:
        1. Validate all data
        2. Create reference request record (status: "pending")
        3. Generate unique invite token
        4. Send email via email service
        5. If SMS enabled → Send SMS
        6. Generate shareable link
        7. Create timeline entry: "Request sent"
        ↓
     REQ-06: Success
        • ✓ "Request sent!"
        • Confirmation details
        • Shareable link displayed
        • [Copy Link] [Send via...]
        • Next steps explained
        ↓
     Actions:
        ├─ [Go to Request Details] → REQ-DETAIL
        ├─ [Back to Dashboard] → SEEK-HOME
        └─ [Send Another Request] → REQ-01 (new)
        ↓
     Background:
        • Email delivery confirmation
        • SMS delivery status
        • Update request status if delivery fails
        ↓
     SEEK-HOME: Dashboard
        • New request appears in "Recent Activity"
        • KPI tiles updated (Pending +1)
        • Notification bell: Setup alerts for this request
```

**Key Decision Points:**
- KYC verified? → Allow or block
- Contact import or manual? → Different data sources
- How many questions? → Validate range
- Which formats? → At least one required
- Enable SMS? → Collect phone number
- Send successful? → Success or error handling

**Success Criteria:**
- Request created in database
- Email delivered to referrer
- Seeker can track status
- Referrer receives clear instructions

**Alternate Paths:**
- Save as draft at any step
- Edit request after send (if not started)
- Cancel request before completion

---

## Flow 5: Create & Share Bundle

```
START: Seeker wants to bundle references for employer
  ↓
Entry Points:
  • SEEK-HOME: [📦 Create Bundle]
  • SEEK-HOME: "Ready to bundle" strip → [Create Bundle from Selected]
  • LIB-01: Select refs → [Add to Bundle]
  • REQ-DETAIL: (submitted) → [Add to Bundle]
  ↓
Pre-Check: Have completed references?
  ├─ NO completed references →
  │     ↓
  │  Modal: "No completed references yet"
  │     • "You need at least one completed reference"
  │     • [Request References] → REQ-01
  │     • [Cancel] → Stay on current page
  │
  └─ YES → Proceed
        ↓
     BUNDLE-01: Select & Reorder
        ↓
     Left Panel: Available References
        • Grid/list of all completed references
        • Filters:
           - Company
           - Date range
           - Format (Video/Audio/Text)
           - RCS band (High/Medium/Low)
        • Each card shows:
           - Referrer name + company
           - Format icon + duration/length
           - RCS badge
           - Date submitted
           - [+ Add] button
        ↓
     Right Panel: Selected for Bundle
        • Shows selected references (initially empty or pre-selected)
        • Drag handles to reorder
        • [Remove] button on each
        • Running stats:
           - Count: "5 references"
           - Total duration: "~12 minutes"
           - Avg RCS: "87 (High)"
        ↓
     Selection:
        • Min: 1 reference (show error if 0)
        • Recommended: 3-7 references
        • Max: 15 references (soft limit, warning if > 10)
        ↓
     [Next: Bundle Settings]
        ↓
     BUNDLE-02: Settings
        ↓
     Bundle Information:
        • Title (required)
           - Default: "References for [Your Name]"
           - Editable, max 100 chars
        • Description (optional)
           - For employer context
           - Max 500 chars
           - Example: "References for Senior Engineer role at Google"
        ↓
     Privacy & Access:
        • Expiry Date (optional)
           - Date picker
           - Default: 30 days from now
           - Or: No expiry
        • Password Protection (optional)
           - [ ] Require password to view
           - If checked → Enter password (min 8 chars)
           - Password strength indicator
        • Watermark (optional)
           - [ ] Add "Confidential" watermark to videos
           - Helps prevent unauthorized sharing
        ↓
     Back-Channel Setting:
        • Toggle: Allow employer reach-back (bundle-level)
        • Default: Same as individual requests (if all same)
        • If mixed → Choose default for bundle
        ↓
     [Preview Bundle] → Opens preview modal
        • Shows how employer will see it
        • Aggregated RCS displayed
        • Reference cards with play buttons
        ↓
     [Generate Link]
        ↓
     Backend Processing:
        1. Validate all data
        2. Create bundle record
        3. Calculate aggregated RCS:
           - Weighted average of selected references
           - Consider recency, format, verification level
        4. Generate unique share link (UUID)
        5. Apply password encryption if enabled
        6. Set expiry date if specified
        ↓
     BUNDLE-READY: Link Ready
        • ✓ "Bundle created!"
        • Bundle title displayed
        • Share link: https://deepref.com/b/abc123def
        • [Copy Link] button
           - Click → Clipboard → "Copied!" feedback
        • Share via:
           - [Email] → Opens email modal
           - [Slack] → If integrated
           - [WhatsApp] → Mobile share sheet
        ↓
     Bundle Details:
        • References included: 5
        • Aggregated RCS: 87 (High)
        • Total duration: ~12 minutes
        • Created: Dec 8, 2024
        • Expires: Jan 7, 2025 (30 days)
        • Password: ●●●●●● (if set)
        ↓
     Analytics (initial):
        • Views: 0
        • Unique viewers: 0
        • Avg watch time: --
        • [View Full Analytics] → Analytics dashboard
        ↓
     Actions:
        • [Open Employer View] → SEEK-PREVIEW (preview as employer)
        • [Edit Bundle] → Back to BUNDLE-01
        • [Copy Link]
        • [Share via Email]
        • [Done] → SEEK-HOME or bundle list
        ↓
     Real-time Tracking:
        • When employer opens link → Analytics updated
        • Notification: "Your bundle was viewed by hiring@google.com"
        • View count increments
        • Watch time tracked per reference
        ↓
     SEEK-HOME: Dashboard
        • New bundle appears in "Sent Bundles" section
        • [Analytics] button → View engagement
```

**Key Decision Points:**
- Have completed references? → Proceed or request first
- How many to include? → Validate minimum
- Set password? → Collect and encrypt
- Set expiry? → Date validation
- Where to share? → Multiple channels

**Aggregated RCS Calculation:**
```
Score = Weighted Average of:
  • Individual reference RCS scores
  • Recency weight (newer = higher)
  • Format weight (video > audio > text)
  • Verification level weight (higher verification = higher)

Example:
  Ref 1: 92 (video, 2 days old, manager)    → Weight: 1.0
  Ref 2: 85 (audio, 1 week old, peer)       → Weight: 0.9
  Ref 3: 88 (text, 2 weeks old, client)     → Weight: 0.8
  Ref 4: 90 (video, 1 day old, manager)     → Weight: 1.0
  Ref 5: 78 (text, 1 month old, peer)       → Weight: 0.6

  Aggregated RCS = (92*1.0 + 85*0.9 + 88*0.8 + 90*1.0 + 78*0.6) / (1.0+0.9+0.8+1.0+0.6)
                 = 87 (HIGH)
```

**Success Criteria:**
- Bundle created successfully
- Link generated and shareable
- Analytics tracking initialized
- Employer can access without issues

**Alternate Paths:**
- Edit bundle after creation
- Add more references later
- Extend expiry date
- Change password
- Archive old bundles

---

## Flow 6: Monitor Request Status & Send Reminders

```
START: Seeker wants to check request status
  ↓
SEEK-HOME: Dashboard
  • Recent Activity table shows all requests
  • Status chips: Sent/Opened/Started/Submitted/Declined
  ↓
Click request row → REQ-DETAIL
  ↓
REQ-DETAIL: Request Detail
  ↓
Status Check:
  ├─ Status: SENT (not opened) → After 3 days
  │     ↓
  │  Suggestion Banner:
  │     "Jane hasn't opened your request yet (sent 3 days ago)"
  │     [Send Reminder] [Contact Personally]
  │     ↓
  │  [Send Reminder] clicked
  │     ↓
  │  Modal: Send Reminder
  │     • Template message (editable)
  │     • Send via: [✓ Email] [✓ SMS]
  │     • Rate limit check: Can send?
  │        ├─ < 3 reminders sent → Allow
  │        └─ ≥ 3 reminders sent → Block: "Max reminders reached"
  │     • [Cancel] [Send Reminder]
  │     ↓
  │  Backend:
  │     • Send email/SMS reminder
  │     • Log reminder in timeline
  │     • Update reminder count
  │     ↓
  │  Success:
  │     • Toast: "Reminder sent to Jane"
  │     • Timeline updated: "Reminder sent"
  │     • Next reminder allowed: 2 days from now
  │
  ├─ Status: OPENED (not started) → After 5 days
  │     ↓
  │  Needs Attention Banner:
  │     "⚠️ Jane opened 5 days ago but hasn't started"
  │     "She may need help or a gentle nudge"
  │     [Send Encouragement] [Extend Deadline] [Contact]
  │     ↓
  │  Options:
  │     • [Send Encouragement] → Similar to reminder modal
  │     • [Extend Deadline] → Date picker modal
  │     • [Contact] → Copy invite link or personal contact
  │
  ├─ Status: STARTED → In progress
  │     ↓
  │  Progress Indicator:
  │     "Jane is responding (Question 3 of 6)"
  │     "Estimated time remaining: ~5 minutes"
  │     • Don't interrupt with reminders
  │     • Show encouraging message: "Almost there!"
  │
  ├─ Status: SUBMITTED → Complete
  │     ↓
  │  Success State:
  │     ✓ "Reference submitted!"
  │     • RCS badge: [92] HIGH
  │     • Format: Video, 2:14
  │     • Submitted: Dec 8, 2024 at 4:23 PM
  │     ↓
  │  Actions:
  │     • [View Reference] → Reference viewer
  │     • [Add to Bundle] → BUNDLE-01
  │     • [Download] → Save file
  │     • [Request Changes] → Contact referrer
  │     ↓
  │  Notification sent:
  │     • Email: "Jane submitted your reference"
  │     • In-app: Bell notification
  │     • SMS: (if enabled) "New reference from Jane"
  │
  ├─ Status: DECLINED → Referrer declined
  │     ↓
  │  Declined State:
  │     ✗ "Jane declined this request"
  │     • Reason (if provided): "Too busy this month"
  │     • Declined: Dec 5, 2024
  │     ↓
  │  Actions:
  │     • [Request from Someone Else] → REQ-01
  │     • [Contact Jane] → Email/phone options
  │     • [Archive] → Move to archived requests
  │     ↓
  │  Notification sent:
  │     • Email: "Jane declined your reference request"
  │     • In-app: Bell notification
  │
  └─ Status: EXPIRED → Deadline passed
        ↓
     Expired State:
        ⏱ "Request expired on Dec 25, 2024"
        "Jane didn't respond before the deadline"
        ↓
     Actions:
        • [Extend & Resend] → Update deadline + resend
        • [Request from Someone Else] → REQ-01
        • [Archive] → Move to archived
        ↓
     [Extend & Resend] clicked
        ↓
     Modal: Extend Deadline
        • Current deadline: Dec 25, 2024 (expired)
        • New deadline: [Date picker]
        • Quick select: [+7 days] [+14 days] [+30 days]
        • New message (optional): Add note about extension
        • [Cancel] [Extend & Resend]
        ↓
     Backend:
        • Update request deadline
        • Resend invitation email/SMS
        • Log extension in timeline
        ↓
     Success:
        • Status changes to: SENT (reopened)
        • Toast: "Request extended and resent to Jane"
        • Timeline updated
```

**Reminder Logic & Rules:**
- Auto-reminders (if enabled in settings):
  - After 3 days: First reminder (if not opened)
  - After 7 days: Second reminder (if not started)
  - 2 days before deadline: Final reminder
- Manual reminders:
  - User can send up to 3 manual reminders
  - Minimum 2 days between reminders
  - Rate limited per request
- Cooldown periods prevent spam

**Notification Triggers:**
- Referrer opens request → "Jane opened your request"
- Referrer starts → "Jane started responding"
- Referrer submits → "Jane submitted your reference"
- Referrer declines → "Jane declined your request"
- Request expires → "Your request to Jane expired"
- Back-channel request → "Employer wants to contact Jane"

**Key Decision Points:**
- How long since sent? → Suggest reminder
- Status changed? → Send notification
- Deadline approaching? → Urgency notification
- Expired? → Offer to extend

---

# REFERRER FLOWS

## Flow 7: Receive & Accept Request

```
START: Referrer receives reference request
  ↓
Delivery Channels:
  ├─ Email: Notification email with CTA
  ├─ SMS: Text with link
  └─ Direct Link: Shareable URL
  ↓
Click link in email/SMS or visit direct URL
  ↓
INV-LAND: Invitation Landing
  ↓
Display Context:
  • From: John Seek (john@example.com)
  • For: Senior Software Engineer @ TechCo
  • Period: Jan 2021 - Dec 2023 (2 years 11 months)
  • Relationship: Manager
  • Questions: 6
  • Estimated time: 4-6 minutes
  • Due: Dec 25, 2024 (12 days remaining)
  ↓
Consent Information:
  • "Your reference will help John in his job search"
  • "You can choose video, audio, or text format"
  • "Your response will be private until John shares it"
  • "You can retract your reference later if needed"
  ↓
Decision Point:
  ├─ [Accept & Start] → Proceed with verification
  └─ [Decline] → Decline flow (see Flow 7b)
  ↓
INV-VERIFY-EMAIL: Email Verification (Step 1 of 2FA)
  ↓
Email Input:
  • Pre-filled: jane.smith@techco.com (from invitation)
  • Editable (if wrong)
  • [Send OTP] button
  ↓
[Send OTP] clicked
  ↓
Backend:
  • Generate 6-digit OTP
  • Send via email
  • Set expiration: 10 minutes
  ↓
OTP Input:
  • 6-digit code input (auto-advance digits)
  • Countdown: "Code expires in 09:32"
  • [Resend] button (cooldown: 30s)
  ↓
User enters code: 1 2 3 4 5 6
  ↓
Backend: Verify OTP
  ├─ Valid? YES →
  │     ↓
  │  Success indicator: ✓ "Email verified"
  │     ↓
  │  LinkedIn Connect (Optional, for RCS boost):
  │     • "Connect LinkedIn for higher confidence score?"
  │     • [Connect LinkedIn] → OAuth flow
  │     • [Skip] → Continue without
  │     ↓
  │  [Continue to Phone Verification]
  │
  └─ Valid? NO or Expired →
        ↓
     Error: "Invalid or expired code"
        • [Resend Code] → New OTP sent
        • Try again → Loop back to OTP input
  ↓
INV-VERIFY-PHONE: Phone Verification (Step 2 of 2FA)
  ↓
Phone Input:
  • Country code dropdown (default: US +1)
  • Phone number field (E.164 format)
  • [Send Code (SMS)] button
  • Optional: [Voice Call] (for accessibility)
  ↓
[Send Code] clicked
  ↓
Backend:
  • Generate 6-digit OTP
  • Send via SMS to provided number
  • Set expiration: 10 minutes
  ↓
OTP Input:
  • 6-digit code input (auto-advance)
  • Countdown: "Code expires in 09:45"
  • [Didn't receive? Resend] (cooldown: 30s)
  • [Call Instead] → Voice call with code
  ↓
User enters code: 5 6 7 8 9 0
  ↓
Backend: Verify OTP
  ├─ Valid? YES →
  │     ↓
  │  Success indicator: ✓ "Phone verified"
  │     ↓
  │  [Continue to Response] → RESP-MODE
  │
  └─ Valid? NO or Expired →
        ↓
     Error: "Invalid or expired code"
        • [Resend Code] → New OTP sent
        • [Call Instead] → Voice call option
        • Try again → Loop back to OTP input
  ↓
Verification Complete:
  • Email: ✓ Verified
  • Phone: ✓ Verified
  • LinkedIn: ✓ Connected (if opted in)
  • RCS impact: +30 points for full verification
  ↓
Proceed to: RESP-MODE (Choose Response Format)
```

**Flow 7b: Decline Request**

```
[Decline] clicked on INV-LAND
  ↓
Modal: Confirm Decline
  • "Decline reference request from John Seek?"
  • Optional: Reason dropdown
     - Too busy
     - Don't remember working together
     - Prefer not to provide reference
     - Other (free text)
  • Optional: Message to John (textarea, 250 chars)
  • [Cancel] [Confirm Decline]
  ↓
[Confirm Decline] clicked
  ↓
Backend:
  • Update request status: "declined"
  • Log decline in timeline
  • Send notification to John (email + in-app)
  • If reason provided → Include in notification
  ↓
Decline Confirmation Page:
  • "Request declined"
  • "John has been notified"
  • Optional: "Thank you for your response"
  • [Close] → End session
```

**Key Decision Points:**
- Accept or decline? → Different flows
- Email OTP valid? → Proceed or retry
- Phone OTP valid? → Proceed or retry
- LinkedIn connect? → Optional RCS boost

**Security & Verification:**
- 2FA required for all referrers (email + phone)
- OTP expiration: 10 minutes
- Max OTP attempts: 5 (then block for 1 hour)
- Rate limiting on OTP sends

**Why 2FA is Required:**
- Increases RCS score (verified identity = +30 points)
- Prevents impersonation
- Ensures authentic referrers
- Builds trust with employers

---

## Flow 8: Provide Reference (Video/Audio/Text)

```
START: Referrer verified, ready to respond
  ↓
RESP-MODE: Choose Response Mode
  ↓
Format Options:
  • 🎥 Video
     - "Most impactful"
     - "2:00 per question (extendable +2:00)"
     - Requires: Camera permission
  • 🎙 Audio
     - "Easy & quick"
     - "2:00 per question (extendable +2:00)"
     - Requires: Microphone permission
  • ✏️ Text
     - "Fastest option"
     - "500 characters per question"
     - No special requirements
  ↓
Referrer selects format:
  ├─ [Record Video] → Flow 8a (Video)
  ├─ [Record Audio] → Flow 8b (Audio)
  └─ [Write Text] → Flow 8c (Text)
```

**Flow 8a: Video Response**

```
RESP-VID: Record Video
  ↓
Camera Permission:
  • Request camera access
  ├─ Granted → Show camera preview
  └─ Denied → Error state
     • Instructions to enable camera
     • [Try Again] → Request again
     • [Switch to Audio/Text] → Change format
  ↓
RESP-Q: Guided Questions (Video Mode)
  ↓
Question Navigation:
  • Progress indicator: Question 1 of 6 [●○○○○○]
  • Display: "Question 1: Describe John's leadership style..."
  • Teleprompter mode: Large, easy-to-read text
  • [Tips] toggle: Show/hide guidance
     - "Look at camera, be specific"
     - "Use concrete examples"
     - "2-minute limit per question"
  ↓
Recording Interface:
  • Live camera preview (centered)
  • Timer: 0:00 (starts on record)
  • Limit: 2:00 (countdown turns red at 1:50)
  • [Start Recording] button (large, red)
  ↓
[Start Recording] clicked
  ↓
Recording in progress:
  • Timer running: 0:05, 0:06, 0:07...
  • Record indicator: 🔴 REC
  • [Pause] [Stop] buttons
  ↓
User records answer (~1:30)
  ↓
Options during recording:
  ├─ [Pause] → Timer pauses
  │     • Recording paused indicator
  │     • [Resume] [Stop] [Restart]
  │
  ├─ [Stop] → End recording
  │     ↓
  │  Playback Preview:
  │     • Video player with recorded answer
  │     • Duration: 1:32
  │     • [Play] [Retake] [Next Question]
  │     ↓
  │  Satisfied with answer?
  │     ├─ YES → [Next Question]
  │     └─ NO → [Retake] → Back to recording
  │
  └─ Timer reaches 2:00 → Auto-stop
        ↓
     Extension Offer:
        • "Time limit reached (2:00)"
        • "You can extend by 2 minutes if needed"
        • [Finish Answer] [Extend +2:00] [Retake]
        ↓
     [Extend +2:00] clicked
        • Timer resets to 2:00 (additional time)
        • [Continue Recording] → Resume from where stopped
        • Max total: 4:00 per question
  ↓
[Next Question] clicked
  ↓
Upload in background:
  • Save video chunk
  • Encrypt and upload to server
  • Progress indicator: "Saving..."
  ↓
Next question loads: Question 2 of 6 [●●○○○○]
  • Same recording interface
  • Repeat process
  ↓
All 6 questions completed
  ↓
Proceed to: RESP-ATTACH (Optional Attachments)
```

**Flow 8b: Audio Response**

```
RESP-AUD: Record Audio
  ↓
Microphone Permission:
  • Request mic access
  ├─ Granted → Show audio interface
  └─ Denied → Error state
     • Instructions to enable mic
     • [Try Again] [Switch to Video/Text]
  ↓
RESP-Q: Guided Questions (Audio Mode)
  ↓
Recording Interface:
  • Waveform visualizer (audio level meter)
  • Timer: 0:00
  • Limit: 2:00 (extendable +2:00)
  • Question displayed: Large text
  • [Start Recording] button
  ↓
[Start Recording] clicked
  ↓
Recording:
  • Timer running
  • Waveform animating with voice levels
  • [Pause] [Stop] buttons
  • Visual feedback: Audio levels (green bars)
  ↓
User records answer
  ↓
[Stop] clicked or 2:00 limit reached
  ↓
Playback Preview:
  • Audio player with controls
  • Waveform visualization
  • Duration: 1:45
  • [Play] [Retake] [Next Question]
  ↓
Same flow as video:
  • Extension option if needed
  • Upload in background
  • Next question
  • Repeat for all questions
  ↓
All questions completed → RESP-ATTACH
```

**Flow 8c: Text Response**

```
RESP-TXT: Write Text
  ↓
RESP-Q: Guided Questions (Text Mode)
  ↓
Question 1 of 6 [●○○○○○]
  • Display: "Question 1: Describe John's leadership style..."
  • [Show Tips] toggle: Writing guidance
     - "Be specific and use examples"
     - "Aim for 250-500 characters"
     - "You can always edit before submitting"
  ↓
Text Input Interface:
  • Large textarea (auto-expanding)
  • Character counter: "0 / 500"
     - Green: 0-250 (more detail recommended)
     - Blue: 250-450 (good length)
     - Orange: 450-490 (approaching limit)
     - Red: 490-500 (near limit)
  • Placeholder: "Type your answer here..."
  • Auto-save: Every 10 seconds
  ↓
User types answer: "John was an exceptional leader..."
  ↓
Character counter updates in real-time: "287 / 500"
  ↓
Validation:
  • Minimum: 50 characters (too short = warning)
  • Maximum: 500 characters (hard stop)
  • If reaching 500 → Red border + "Character limit reached"
  ↓
[Next Question] clicked
  ↓
Validation check:
  ├─ < 50 chars → Warning: "Your answer is very short. Add more detail?"
  │     • [Add More] [Continue Anyway]
  │
  └─ ≥ 50 chars → Save and proceed
        ↓
     Auto-save to server
        • Background save: "Saving..."
        • Success: ✓ "Saved"
        ↓
     Load next question: Question 2 of 6 [●●○○○○]
        • Repeat process
  ↓
All 6 questions completed
  ↓
Proceed to: RESP-ATTACH
```

**Flow 8 Common: Attachments & Review**

```
RESP-ATTACH: Optional Attachments
  ↓
Display:
  • "Want to add supporting documents? (Optional)"
  • Examples: "Offer letter, project documentation, certificates"
  ↓
Upload Area:
  • Drag & drop zone
  • [Browse Files] button
  • Accepted: PDF, JPG, PNG
  • Max size: 10MB per file
  • Max files: 5
  ↓
Upload Process (if user adds files):
  ├─ User drops files or clicks browse
  │     ↓
  │  Validate files:
  │     • Type check (PDF/JPG/PNG only)
  │     • Size check (< 10MB each)
  │     • Virus scan
  │     ↓
  │  Upload to server:
  │     • Progress bar per file
  │     • Encrypt at rest
  │     ↓
  │  File chips displayed:
  │     • filename.pdf (2.3 MB) [×]
  │     • certificate.jpg (1.1 MB) [×]
  │     • [×] = Remove button
  │
  └─ User skips → No attachments
  ↓
[Continue to Review] or [Skip]
  ↓
RESP-REVIEW: Review & Consent
  ↓
Review All Answers:
  • Accordion/list showing all questions + answers
  • Format-specific display:
     - Video: Thumbnail + play button + duration
     - Audio: Waveform + play button + duration
     - Text: Full text displayed
  ↓
For Video/Audio: Transcript Section
  • Auto-generated transcript (speech-to-text)
  • Editable chunks with timestamps:
     ```
     [0:03] "John was an exceptional leader..."
     [0:15] "He managed our team through..."
     [0:32] "His biggest achievement was..."
     ```
  • [Edit] button per chunk → Inline editor
  • Why editable? Correct transcription errors, clarify meaning
  ↓
Playback Controls:
  • Play all answers sequentially
  • Or: Play individual questions
  • Total duration displayed: "12:34 total"
  ↓
Edit Options:
  • [Edit Question 3] → Back to RESP-VID/AUD/TXT for that question
  • [Re-record All] → Start over (confirmation dialog)
  ↓
Consent Section (required):
  • Checkbox 1: [✓] "I confirm that I worked with John Seek at TechCo from Jan 2021 to Dec 2023"
  • Checkbox 2: [✓] "I consent to sharing this reference as requested by John"
  • Checkbox 3: [✓] "I understand that John controls who sees this reference"
  • Optional: [ ] "I agree to be contacted by employers for back-channel verification (if John approves)"
  • Link: [Privacy Policy] [Terms of Service]
  ↓
All required checkboxes must be checked
  ↓
[Submit Reference] button (enabled when all consents checked)
  ↓
[Submit Reference] clicked
  ↓
Confirmation Dialog:
  • "Submit your reference?"
  • "You can edit or retract it within 24 hours"
  • "After 24 hours, you can still request retraction"
  • [Cancel] [Yes, Submit]
  ↓
[Yes, Submit] clicked
  ↓
Backend Processing:
  1. Final validation (all questions answered)
  2. Upload any remaining media
  3. Finalize transcripts
  4. Create reference record (status: "submitted")
  5. Calculate RCS for this reference:
     - Identity verification: +40 (email + phone verified)
     - Content quality: Analyze consistency
     - Provenance: Media integrity check
  6. Update request status: "submitted"
  7. Send notification to John (email + in-app)
  8. Log submission in timeline
  ↓
RESP-DONE: Submission Success
  ↓
Success Screen:
  • ✓ "Reference submitted!"
  • "Thank you for helping John Seek"
  • Summary:
     - Format: Video
     - Duration: 12:34
     - Questions answered: 6
     - Submitted: Dec 8, 2024 at 4:23 PM
  ↓
Post-Submission Actions:
  • "Want to help more people?"
  • [Create DeepRef Account] (optional)
     - Save your verification (reuse for future references)
     - Manage your references
     - Track how your references help people
  • [Done] → Close tab/window
  ↓
If [Create Account] clicked:
  • Pre-fill: Name, Email, Phone (already verified)
  • Set password or use magic link
  • Create referrer account
  • → REF-MANAGE: Dashboard
  ↓
Background:
  • John receives notifications:
     - Email: "Jane submitted your reference (Video, 12:34, RCS: 92)"
     - In-app: Bell notification
     - SMS: (if enabled) "New reference from Jane - RCS: 92"
  • Reference added to John's library
  • RCS calculation completes
  • Reference available to add to bundles
```

**Key Decision Points:**
- Which format to use? → Different interfaces
- Satisfied with recording? → Next or retake
- Need extension? → +2:00 additional time
- Add attachments? → Upload or skip
- Consents checked? → Can submit or not

**Recording Best Practices (Tips Shown to Referrer):**
- Video:
  - Look at camera (not screen)
  - Good lighting, quiet background
  - Frame yourself from chest up
  - Be authentic and specific
- Audio:
  - Quiet environment
  - Speak clearly, normal pace
  - Use examples and stories
- Text:
  - Be specific with examples
  - Avoid generic praise
  - Aim for 250-400 characters

**Technical Implementation:**
- Video/Audio: WebRTC for recording
- Chunked uploads: Stream during recording (don't wait until end)
- Transcription: Speech-to-text API (Google/AWS)
- Auto-save: Every 10 seconds for text, after each question for video/audio

---

*[Continuing with Employer flows and cross-role interactions in next section...]*

## Flow 9: Employer Views Bundle

```
START: Employer receives bundle link from seeker
  ↓
Delivery Method:
  • Email: "John Seek shared references with you"
  • Slack/Chat: Direct link paste
  • ATS: Link in application notes
  ↓
Click link: https://deepref.com/b/abc123def
  ↓
EMP-VIEW: Employer Viewer (Initial Load)
  ↓
Password Check (if bundle is password-protected):
  ├─ Password required? YES →
  │     ↓
  │  Password Modal:
  │     • "This bundle is password-protected"
  │     • "Contact John Seek for the password"
  │     • Password input field
  │     • [Submit]
  │     ↓
  │  User enters password
  │     ↓
  │  Backend: Verify password
  │     ├─ Correct → Decrypt bundle, proceed
  │     └─ Incorrect → Error: "Incorrect password" (3 attempts max)
  │
  └─ No password → Load bundle
  ↓
Expiry Check:
  ├─ Bundle expired? YES →
  │     ↓
  │  Error Page:
  │     • "This bundle has expired"
  │     • "Contact John Seek to request a new link"
  │     • Expired on: Jan 7, 2025
  │
  └─ Not expired → Continue
  ↓
EMP-VIEW: Bundle Loaded
  ↓
Candidate Header:
  • Name: John Seek
  • Headline: Senior Software Engineer
  • Photo/Avatar
  • Verification Badge: ✓ Identity Verified
  • Contact: (hidden until back-channel approved)
  ↓
Aggregated RCS (Prominent Display):
  ```
  ┌────────────────────────────────┐
  │   REFERENCE CONFIDENCE SCORE   │
  │                                │
  │         [87]  HIGH             │
  │         ●●●○                   │
  │                                │
  │   Based on 5 verified refs     │
  │   [Why this score? ℹ️]          │
  └────────────────────────────────┘
  ```
  • Click [Why this score?] → Modal with breakdown:
     - Identity & Tenure: 90% (✓ ID verified, dates match)
     - Content Consistency: 92% (✓ No contradictions)
     - Provenance: 79% (✓ Media integrity)
  ↓
Email Verification Gate (for certain actions):
  • Banner: "Verify your email to contact referrers"
  • [Verify Email] → EMP-VERIFY-EMAIL
  ↓
References List (Main Content):
  • 5 reference cards displayed
  • Sorted by: RCS (highest first), or Date (most recent)
  ↓
Reference Card Example:
  ```
  ┌────────────────────────────────────────┐
  │ 🎥 Jane Smith                    [92] │
  │ Engineering Manager @ TechCo     HIGH │
  │ Manager • 2021-2023                   │
  │ ✓ Email verified ✓ Phone verified    │
  │                                        │
  │ ▶ Video Reference (2:14)               │
  │ ┌────────────────────────────────┐    │
  │ │  [Video thumbnail/player]      │    │
  │ │  [Play button overlay]         │    │
  │ └────────────────────────────────┘    │
  │                                        │
  │ [📄 View Transcript] [⋮ More]          │
  └────────────────────────────────────────┘
  ```
  ↓
Employer Interaction:
  ├─ [▶ Play Video] → Video player opens
  │     • In-page player or modal
  │     • Controls: Play/pause, seek, volume
  │     • Playback tracked for analytics
  │     • Transcript synced with playback (optional)
  │     ↓
  │  Analytics Event:
  │     • Log: Employer started video
  │     • Track: Watch duration, completion %
  │     • Send to seeker: "Google HR watched Jane's video (85% watched)"
  │
  ├─ [View Transcript] → Expands transcript section
  │     • Shows all questions + answers
  │     • Timestamped chunks (for video/audio)
  │     • Searchable/Ctrl+F friendly
  │     • Example:
  │        Q1: Describe John's leadership style
  │        A: "John was an exceptional leader..." (full text)
  │
  └─ [⋮ More] → Dropdown menu
        • Download video/audio file (if allowed by seeker)
        • Flag inappropriate content
        • Request back-channel verification
  ↓
After viewing references:
  • Analytics: "Employer viewed 4 of 5 references"
  • "Avg watch time: 3:45 per reference"
  ↓
Back-Channel Verification (if enabled by seeker):
  ↓
[Request Verification] button (bottom of page or per reference)
  ↓
Check: Employer email verified?
  ├─ NO → Redirect to EMP-VERIFY-EMAIL
  │     ↓
  │  EMP-VERIFY-EMAIL: Verify Employer Email
  │     • "Verify your email to contact referrers"
  │     • Email input (work email recommended)
  │     • [Send Verification Code]
  │     ↓
  │  OTP sent via email
  │     • 6-digit code
  │     • Expiry: 10 minutes
  │     ↓
  │  User enters code
  │     ↓
  │  Verification success:
  │     • ✓ "Email verified"
  │     • Store verified email
  │     • Enable back-channel actions
  │     • Return to EMP-VIEW
  │
  └─ YES → Proceed to back-channel request
        ↓
     EMP-RB-ASK: Request Back-Channel
        ↓
     Modal/Form:
        • "Request to contact Jane Smith directly"
        • Fields:
           - Your name (pre-filled if available)
           - Your email (pre-filled, verified)
           - Company
           - Purpose/Message (textarea, 500 char max)
              Example: "We'd like to verify details about John's
                       role in the database migration project"
        • Banner: "⚠️ John will be notified and must approve"
        • Privacy note: "Jane's contact info shared only if both approve"
        • [Cancel] [Send Request]
        ↓
     [Send Request] clicked
        ↓
     Backend Processing:
        1. Create back-channel request record
        2. Send notification to John (seeker):
           - Email: "Google HR requested to contact Jane Smith"
           - In-app: Notification with approval buttons
        3. Log request in John's REQ-DETAIL timeline
        ↓
     EMP-RB-SENT: Request Sent
        • Success message: "Request sent"
        • Status chip: "Verification requested"
        • "John will be notified. We'll email you if approved."
        ↓
     Return to EMP-VIEW:
        • Status chip on Jane's card: "Verification requested"
        • Waiting for approval
  ↓
Approval Flow (Seeker Side - Parallel):
  ↓
John receives notification:
  • NOTIFS: Drawer shows: "Google HR wants to contact Jane Smith"
  • [Approve] [Decline] [View Details]
  ↓
John's Decision:
  ├─ [Decline] → Notify employer: "Request declined"
  │
  └─ [Approve] → Send notification to Jane (referrer)
        ↓
     Jane receives request:
        • Email: "Employer wants to contact you about John Seek"
        • Details: Company, purpose, message
        • [Accept Contact] [Decline]
        ↓
     Jane's Decision:
        ├─ [Decline] → Notify employer: "Referrer declined"
        │
        └─ [Accept] → Share contact info
              ↓
           Backend:
              • Send Jane's email/phone to employer
              • Email to employer: "Jane Smith agreed to be contacted"
              • Provide contact details
              ↓
           Employer receives:
              • Email: "Jane Smith (jane@techco.com, +1-555-123-4567)"
              • Instructions: "Please be respectful of Jane's time"
              ↓
           Analytics Event:
              • Log: Back-channel approved
              • Track: Response times, approval rates
```

**Analytics Tracked (Sent to Seeker):**
- Bundle opened: Date, time, viewer email (if verified)
- Views per reference: Which ones watched, how long
- Completion rate: % of references viewed
- Back-channel requests: Who, when, status
- Time spent: Total time on bundle

**Employer Experience Goals:**
- **Fast**: Load bundle in < 2 seconds
- **Clear**: RCS score explanation easy to understand
- **Trustworthy**: Verification badges visible
- **Actionable**: Easy to contact for more info

**Privacy Controls:**
- Referrer contact info never shown unless back-channel approved
- Employer email verification required for sensitive actions
- All views logged and visible to seeker
- Password protection optional
- Expiry dates enforced

**Key Decision Points:**
- Password correct? → Access or error
- Bundle expired? → Error or proceed
- Want back-channel? → Verify email first
- Seeker approves? → Ask referrer
- Referrer approves? → Share contact info

---

# CROSS-ROLE INTERACTIONS

## Flow 10: Reference Retraction

```
START: Referrer wants to retract a reference
  ↓
Entry Point:
  • REF-MANAGE: Dashboard → Reference list → [Retract]
  • Email link: "Retract your reference for John Seek"
  ↓
REF-MANAGE: Reference Detail
  • Shows reference details
  • Current status: Submitted, in bundle, viewed by 3 employers
  • [Retract Reference] button
  ↓
[Retract Reference] clicked
  ↓
Confirmation Dialog:
  • "⚠️ Retract your reference for John Seek?"
  • Impact explained:
     - "John will be notified"
     - "If in active bundles, will be removed"
     - "Employers who viewed it will be notified"
  • Reason (required dropdown):
     - Relationship changed
     - Inaccurate information
     - No longer comfortable providing reference
     - Other (free text)
  • Optional message to John (textarea, 250 chars)
  • [Cancel] [Confirm Retraction]
  ↓
[Confirm Retraction] clicked
  ↓
Backend Processing:
  1. Check reference status:
     ├─ Not yet submitted → Easy: Just delete
     ├─ Submitted but not in bundle → Mark as retracted
     └─ In active bundle(s) → Complex retraction process
  ↓
If in active bundle:
  ↓
Retraction Process (per DeepRef policy):
  1. Send notification to John (seeker):
     - Subject: "Jane Smith wants to retract their reference"
     - Reason: [Selected reason]
     - Message: [Optional message from Jane]
     - Action required: "Respond within 10 days"
     ↓
  2. Create retraction request record (status: "pending")
     ↓
  3. John's response window: 10 days
     ↓
  John receives notification (NOTIFS):
     • "⚠️ Jane wants to retract their reference"
     • [View Details] → REQ-DETAIL
     ↓
  REQ-DETAIL: Shows retraction banner
     • "Jane Smith requested to retract this reference"
     • Reason: [Selected reason]
     • Message: [Optional message]
     • Your options:
        ├─ [Accept Retraction] → Immediately retract
        │
        ├─ [Discuss with Jane] → Opens contact modal
        │     • Pre-filled email template
        │     • "Hi Jane, I received your retraction request..."
        │     • Sends email to Jane
        │     • Pauses 10-day countdown
        │
        └─ [No Response] → Auto-retract after 10 days
     ↓
  Outcomes:
     ├─ John accepts immediately →
     │     ↓
     │  Immediate Retraction:
     │     • Remove from all bundles
     │     • Update status: "retracted"
     │     • Notify employers who viewed it
     │     • RCS recalculation (lower score)
     │     • Timeline: "Reference retracted"
     │
     ├─ John responds within 10 days (after discussion) →
     │     ↓
     │  Negotiated Outcome:
     │     • If resolved → Jane cancels retraction
     │     • If not → Proceed with retraction
     │     • Grace period: 30 days to replace reference
     │
     └─ No response after 10 days →
           ↓
        Auto-Retraction:
           • Automatic removal from bundles
           • Same process as immediate retraction
           • Email to John: "Reference auto-retracted"
  ↓
Retraction Effects:
  • Reference status: "retracted"
  • Removed from all bundles
  • RCS recalculated (without this reference)
  • Employers notified:
     - "One reference in John Seek's bundle was retracted"
     - Aggregated RCS updated
  • Analytics impacted:
     - Bundle views still counted
     - But reference no longer available
  ↓
John's Actions After Retraction:
  • Replace reference: Request from someone else
  • Update bundles: Re-generate without retracted ref
  • Notify employers: Explain situation (optional)
  ↓
Grace Period (if John responded):
  • 30 days to find replacement reference
  • Original reference hidden but not deleted
  • If replacement found → Swap in bundle
  • If 30 days pass → Permanent retraction
```

**Retraction Policy Summary:**
- Immediate: If not in bundle or John accepts
- 10-day window: If in bundle and John doesn't respond → auto-retract
- 30-day grace: If John responds, grace period to replace
- Employers notified: Transparency about retracted references

**Edge Cases:**
- Retraction during employer review → Notify employer immediately
- Multiple bundles → Retract from all
- Reference critical to job offer → John can appeal to support

---

## Flow 11: End-to-End (Seeker → Referrer → Employer)

```
COMPLETE JOURNEY

Day 1: John (Seeker) requests reference
  ↓
SEEK-HOME → REQ-01 through REQ-05 → REQ-06
  • John creates request for Jane Smith
  • Email + SMS sent to Jane
  • Request status: "sent"
  ↓
Day 2: Jane (Referrer) receives and opens
  ↓
INV-LAND → INV-VERIFY-EMAIL → INV-VERIFY-PHONE
  • Jane clicks email link
  • Verifies email + phone (2FA)
  • Views request details
  • [Accept & Start]
  ↓
Day 2 (continued): Jane records reference
  ↓
RESP-MODE → RESP-VID → RESP-Q → RESP-ATTACH → RESP-REVIEW
  • Jane chooses video format
  • Records 6 video answers (~12 minutes)
  • Reviews transcript, edits minor errors
  • Submits reference
  ↓
Backend: Processing
  • Calculate RCS: 92 (HIGH)
     - Identity: +40 (email + phone verified)
     - Content: +30 (consistent with John's profile)
     - Provenance: +22 (clean media, normal retake count)
  • Notify John: "Jane submitted reference (Video, 12:34, RCS: 92)"
  ↓
Day 2 (evening): John receives notification
  ↓
SEEK-HOME: Dashboard updated
  • "Recent Activity": Jane Smith → Submitted ✓ [92] HIGH
  • [View Reference] → Opens reference viewer
  • John watches Jane's video → "This is great!"
  ↓
Day 3: John creates bundle
  ↓
LIB-01 → BUNDLE-01 → BUNDLE-02 → BUNDLE-READY
  • John has 5 completed references (including Jane's)
  • Selects all 5 for bundle
  • Title: "Senior Engineer - Google Application"
  • Sets expiry: 30 days
  • No password (Google's preference)
  • Back-channel: Enabled
  • Generates link: https://deepref.com/b/abc123def
  • Aggregated RCS: 87 (HIGH)
  ↓
Day 3: John shares with Google
  • Copies link
  • Pastes in Google's ATS (Hire)
  • Sends email to recruiter: "Here are my references"
  ↓
Day 4: Google recruiter opens link
  ↓
EMP-VIEW: Bundle loads
  • Sees John's profile + [87] HIGH score
  • Views "Why this score?" breakdown
  • Watches Jane's video (most impressive)
  • Watches 3 other videos (skips one text reference)
  ↓
Analytics sent to John:
  • "Google HR viewed your bundle"
  • "Watched 4 of 5 references"
  • "Avg watch time: 3:45"
  • "Jane's reference: 95% watched"
  ↓
Day 5: Google requests back-channel
  ↓
EMP-VERIFY-EMAIL → Recruiter verifies work email
  ↓
EMP-RB-ASK: Request to contact Jane
  • Recruiter: "Want to verify project details"
  • Message: "Can we discuss John's role in database migration?"
  • [Send Request]
  ↓
Notification to John (NOTIFS):
  • "Google HR wants to contact Jane Smith"
  • [Approve] [Decline] [View Details]
  ↓
Day 5 (afternoon): John approves
  • Clicks [Approve]
  • Notification sent to Jane
  ↓
Jane receives email:
  • "Employer wants to contact you about John Seek"
  • From: Google (recruiter@google.com)
  • Purpose: "Verify project details"
  • [Accept Contact] [Decline]
  ↓
Day 6: Jane accepts
  • Clicks [Accept Contact]
  • Her email/phone shared with Google recruiter
  ↓
Google recruiter receives:
  • Email: "Jane Smith agreed to be contacted"
  • Contact: jane.smith@techco.com, +1-555-123-4567
  • Note: "Please be respectful of Jane's time"
  ↓
Day 7: Google calls Jane
  • 15-minute phone call
  • Verifies details about John's work
  • Positive conversation
  ↓
Day 10: John gets offer from Google
  • References were a key factor
  • Jane's video reference highlighted in feedback
  ↓
John celebrates:
  • Notifies Jane: "I got the job! Thank you!"
  • Jane receives notification (if she has account):
     - "🎉 John Seek got a job! Your reference helped."
  ↓
Future: Jane provides more references
  • Creates DeepRef account
  • Verification already complete (email + phone)
  • Next request takes only 5 minutes (verification reused)
  • Builds reputation as top referrer
```

**Success Metrics:**
- Time to completion: 9 days (request → offer)
- Response rate: 100% (Jane responded)
- RCS score: 87 (HIGH) helped John stand out
- Employer engagement: 80% references viewed
- Back-channel: Successful verification
- Outcome: Job offer

---

# EDGE CASES & ERROR FLOWS

## Edge Case 1: Referrer Can't Complete (Technical Issues)

```
Jane starts responding but encounters issues
  ↓
Scenarios:
  ├─ Camera/mic permission denied
  │     ↓
  │  Error: "Camera access required"
  │     • Show browser-specific instructions
  │     • [Enable Camera] [Switch to Text]
  │     • [Help] → Support article
  │
  ├─ Recording fails (network issue)
  │     ↓
  │  Auto-save: Previous answers preserved
  │     • Toast: "Connection lost. Reconnecting..."
  │     • Retry upload in background
  │     • If persistent → "Save as draft"
  │     • Jane can return later (draft saved)
  │
  ├─ Browser crashes mid-recording
  │     ↓
  │  On return:
  │     • "Welcome back! You have an incomplete reference"
  │     • Shows progress: "3 of 6 questions completed"
  │     • [Continue] → Resume from question 4
  │
  └─ Device limitations (old phone, slow internet)
        ↓
     Adaptive quality:
        • Detect connection speed
        • Suggest: "Switch to audio (smaller file size)"
        • Or: "Switch to text (no recording needed)"
        • Graceful degradation
```

## Edge Case 2: Duplicate Requests

```
John accidentally sends two requests to Jane
  ↓
Backend Detection:
  • Check: Same seeker + same referrer email + active request exists
  ↓
Modal: "You already requested from Jane"
  • "You sent a request to Jane on Dec 1, 2024"
  • Status: Opened (not started)
  • Options:
     ├─ [View Existing Request] → REQ-DETAIL
     ├─ [Send Reminder] → Send nudge
     └─ [Create Anyway] → Allow duplicate (rare cases)
```

## Edge Case 3: Expired Bundle Accessed

```
Employer clicks bundle link after expiry
  ↓
EMP-VIEW: Expiry Check
  • Expiry date: Jan 7, 2025
  • Today's date: Jan 15, 2025
  • Expired: YES
  ↓
Error Page:
  • "This bundle has expired"
  • "This link expired on Jan 7, 2025"
  • "Contact John Seek to request a new link"
  • Suggested action: "Ask John to extend or regenerate"
  ↓
John's Side (if employer contacts):
  • BUNDLE-READY: Extend expiry
  • [Edit] → Update expiry date → Save
  • New expiry: Feb 7, 2025
  • Link remains the same (no new URL needed)
  • Notify employer: "Link reactivated"
```

## Edge Case 4: Seeker Deletes Account Mid-Process

```
John deletes account while Jane is responding
  ↓
Backend:
  • Mark all active requests as "canceled"
  • Notify all pending referrers
  ↓
Jane tries to submit:
  • Error: "This request has been canceled"
  • "John Seek is no longer using DeepRef"
  • "Your reference was not submitted"
  • [Close]
  ↓
Data Handling:
  • Jane's recorded reference deleted (privacy compliance)
  • No reference record created
  • Timeline ends at "canceled"
```

## Edge Case 5: RCS Score Dispute

```
John disagrees with his RCS score
  ↓
SEEK-HOME: [View RCS Breakdown]
  ↓
Modal: "Why is my score 67 (Medium)?"
  • Identity & Tenure: 85% ✓
     - ID verified
     - But: 1 referrer's dates don't match LinkedIn
  • Content Consistency: 60% ⚠
     - Warning: Job title mismatch (resume vs references)
     - Warning: Skills mentioned inconsistently
  • Provenance: 55% ⚠
     - Warning: 2 references had many retakes
     - Warning: 1 reference submitted from suspicious IP
  ↓
Actions:
  • [Fix Date Mismatch] → Contact referrer to correct
  • [Update Resume] → Fix inconsistencies
  • [Contact Support] → Dispute score
  ↓
Support Review:
  • Human review of RCS calculation
  • Investigate flagged items
  • Adjust score if errors found
  • Respond within 24 hours
```

---

**End of Flow Document**

This covers all major flows, decision points, and cross-role interactions. Next step: Map these flows to the frame specifications document for complete alignment.