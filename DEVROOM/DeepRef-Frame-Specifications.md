# DeepRef — Frame Specifications (Complete)

> Comprehensive specification for all frames/screens in the DeepRef MVP application.
> Each frame includes: Purpose, Elements, Validation, States, Navigation, and Notes.

---

## Table of Contents

1. [AUTH / GLOBAL Frames](#auth--global-frames)
2. [SEEKER Frames](#seeker-frames)
3. [REFERRER Frames](#referrer-frames)
4. [EMPLOYER Frames](#employer-frames)
5. [ADMIN Frames](#admin-frames)
6. [Shared Components](#shared-components)

---

# AUTH / GLOBAL FRAMES

## AUTH-01 · Welcome / Value Prop

**Purpose:** Landing page for unauthenticated users. Explain DeepRef value proposition and drive sign-up/sign-in.

**Elements:**
- **Header**
  - Logo + "DeepRef" wordmark (top left)
  - Navigation: [Sign In] [Create Account] buttons (top right)

- **Hero Section**
  - Main headline: "Verified References with Confidence Scoring"
  - Subheadline: "Collect video, audio, and text references. Share them with employers in one secure link with an aggregated confidence score."
  - Illustration/hero image (right side)

- **Value Propositions** (3 columns)
  - Column 1: 🎥 "Rich Media References" - "Video and audio bring your experience to life"
  - Column 2: 📊 "Confidence Scored" - "AI-verified authenticity gives employers trust"
  - Column 3: 🔒 "You Control Sharing" - "Create bundles and share only what you want"

- **CTA Section**
  - Primary button: [Get Started - It's Free]
  - Secondary link: "Already have an account? Sign in"

- **Footer**
  - Links: Privacy Policy · Terms of Service · Help · Contact
  - Copyright notice

**States:**
- Default state (unauthenticated)
- If user has valid session → auto-redirect to dashboard

**Navigation:**
- [Sign In] → AUTH-02
- [Create Account] / [Get Started] → AUTH-03
- Footer links → respective policy pages

**Notes:**
- Mobile: Stack columns vertically
- Consider adding customer testimonials or logos
- A/B test different value prop messaging

---

## AUTH-02 · Sign In (Email Magic Link)

**Purpose:** Authenticate existing users via email magic link.

**Elements:**
- **Header**
  - Logo + "DeepRef" (top left)
  - Back link: "← Back to home"

- **Form Section**
  - Title: "Sign in to DeepRef"
  - Subtitle: "We'll send you a secure link to sign in"

  - **Email input field**
    - Label: "Email"
    - Placeholder: "you@company.com"
    - Type: email
    - Required: Yes
    - Validation: Valid email format

  - **Checkbox** (optional)
    - [ ] Keep me signed in
    - Helper text: "Stay signed in for 30 days"

  - **Primary button**
    - [Send Magic Link]
    - Disabled state: Until valid email entered
    - Loading state: "Sending..."

  - **Resend link** (shown after initial send)
    - "Didn't receive it? [Resend]"
    - Cooldown: 30 seconds between resends
    - Shows countdown: "Resend in 28s..."

  - **Alternative action**
    - "Don't have an account? [Create one]"

**Validation:**
- Email format validation (real-time)
- Error message: "Please enter a valid email address"
- Check if email exists in system
- If not found: "No account found. Would you like to create one?"

**States:**
1. **Default:** Form ready for input
2. **Validating:** After email entered, checking format
3. **Sending:** After button click, API call in progress
4. **Sent:** Success message displayed
5. **Error:** Rate limit hit, server error, etc.

**Success State (After Send):**
- Hide form
- Show success message:
  ```
  ✓ Magic link sent!

  We sent a secure sign-in link to:
  john@example.com

  [Open Mail App] [Resend Link]

  Check your spam folder if you don't see it.
  ```

**Navigation:**
- Magic link → Opens AUTH-04 verification page
- After successful verification → Redirect to role-specific dashboard
- [Create one] → AUTH-03

**Notes:**
- Magic link expires in 15 minutes
- Track click events for analytics
- Support deep links for mobile apps

---

## AUTH-03 · Create Account (Choose Role)

**Purpose:** Register new users and select their primary role (Seeker, Referrer, or Hiring).

**Elements:**
- **Header**
  - Logo + "DeepRef"
  - Back link: "← Back"

- **Form Section**
  - Title: "Create your account"
  - Subtitle: "Join thousands of professionals using DeepRef"

  - **Role Selection** (required, appears first)
    - Label: "I am a..."
    - Radio buttons / Pill toggles:
      - ( ) Job Seeker - "Looking for a job and need references"
      - ( ) Referrer - "Providing references for others"
      - ( ) Employer - "Hiring and evaluating candidates"
    - Default: Job Seeker selected

  - **Name Fields** (side by side on desktop)
    - First name: Required, max 50 chars
    - Last name: Required, max 50 chars

  - **Email Field**
    - Label: "Email"
    - Type: email
    - Required: Yes
    - Validation:
      - Valid format
      - Check uniqueness (on blur)
      - Show error: "This email is already registered. [Sign in instead]"

  - **Password Field** (optional, based on toggle)
    - Label: "Password"
    - Type: password
    - Toggle: [👁 Show/Hide]
    - Requirements (shown on focus):
      - Minimum 8 characters
      - At least one number
      - At least one special character
    - Strength indicator: Weak / Medium / Strong

  - **Authentication Method Toggle**
    - [ ] Use passwordless sign-in (magic link only)
    - Helper: "We'll email you a link to sign in each time"
    - If checked: Hide password field

  - **Checkbox**
    - [✓] Keep me signed in (default checked)

  - **Terms Acceptance** (required)
    - [ ] I agree to the [Terms of Service] and [Privacy Policy]
    - Must be checked to proceed

  - **Primary Button**
    - [Create Account]
    - Disabled until: Valid email, name, (password OR magic link), terms accepted
    - Loading state: "Creating account..."

  - **Alternative Action**
    - "Already have an account? [Sign in]"

**Validation:**
- Real-time validation on all fields
- Email uniqueness check (debounced, 500ms)
- Password strength validation
- Terms checkbox required

**States:**
1. **Default:** Empty form, Seeker role selected
2. **Filling:** User entering data, real-time validation
3. **Checking email:** Spinner on email field
4. **Creating:** API call in progress
5. **Success:** Account created, show success message
6. **Error:** Display error message (email taken, server error, etc.)

**Success Flow:**
1. Account created
2. Show: "Account created! Check your email to verify."
3. Auto-navigate to AUTH-04 (Email verification)
4. Send verification email in background

**Error Handling:**
- Email already exists → "This email is already registered. [Sign in] or [Reset password]"
- Server error → "Something went wrong. Please try again."
- Rate limit → "Too many attempts. Please try again in 5 minutes."

**Navigation:**
- Success → AUTH-04 (Email Verification)
- [Sign in] → AUTH-02
- After email verified → Role-specific onboarding:
  - Seeker → SEEK-01 (Profile Setup)
  - Referrer → REF-MANAGE (Dashboard)
  - Employer → EMP-VIEW (if they have a bundle link) or holding page

**Notes:**
- Consider social auth (LinkedIn, Google) for faster sign-up
- Track which role users select for analytics
- Pre-fill email if coming from referrer invitation link
- Mobile: Stack name fields vertically

---

## AUTH-04 · Verify Email (Magic Link Sent)

**Purpose:** Inform user that email verification is required and provide options to resend or open email.

**Elements:**
- **Header**
  - Logo + "DeepRef"
  - No navigation (can't proceed without verification)

- **Content Section**
  - Icon: Large @ symbol or envelope icon
  - Title: "Check your inbox"
  - Message: "We sent a verification link to:"
  - Email display: "john.doe@example.com" (bold, larger text)

  - **Instructions**
    - "Click the link in the email to verify your account."
    - "The link expires in 15 minutes."

  - **Action Buttons**
    - Primary: [Open Mail App] (opens default mail client)
    - Secondary: [Resend Verification Email]
    - Cooldown on resend: 30 seconds

  - **Help Text**
    - "Didn't receive it?"
    - "Check your spam folder or [resend the email]"

  - **Support Link**
    - "Still having trouble? [Contact support]"

**States:**
1. **Waiting:** Initial state, waiting for user to verify
2. **Resending:** After resend button clicked
3. **Resent:** Success message "Email resent!"
4. **Verified:** (Auto-detected via polling or WebSocket)
   - Show: "✓ Email verified! Redirecting..."
   - Auto-redirect to next step

**Verification Detection:**
- Poll every 5 seconds to check if email verified
- Or use WebSocket for real-time update
- On verification detected:
  - Show success animation
  - Redirect after 2 seconds

**Navigation:**
- After verification → Role-specific next step:
  - Seeker → SEEK-01 (Profile Setup)
  - Referrer → REF-MANAGE (Dashboard)
  - Employer → EMP-VIEW or holding page
- [Contact support] → Opens support modal/page

**Notes:**
- Track email open rates and click rates
- Consider SMS verification as backup
- Show different message if user came from magic link sign-in vs new account

---

## ID-SEEK-01 · Seeker ID Capture (Front/Back)

**Purpose:** Capture government-issued ID for seeker identity verification (KYC).

**Elements:**
- **Header**
  - Logo + "DeepRef"
  - User menu (top right)

- **Left Sidebar Navigation**
  - Dashboard
  - Requests
  - Library
  - Bundles
  - **Settings** (active)
    - Profile Update
    - **Verification** (active)
    - Billing
  - Sign Out

- **Breadcrumb**
  - Settings › Verification › ID Upload

- **Main Content**
  - **Progress Indicator**
    - Step 1 of 3: ID Upload
    - Steps: [●]──[○]──[○]
    - Labels: ID Upload → Selfie → Review

  - **Title:** "Verify your identity"
  - **Subtitle:** "Upload a government-issued ID to unlock full platform features"

  - **Why This Matters** (collapsible info box)
    - "Identity verification increases your Reference Confidence Score (RCS)"
    - "Verified seekers get 40% higher RCS on average"
    - "Your documents are encrypted and never shared"

  - **Document Type Selector**
    - Label: "Select document type"
    - Dropdown:
      - Driver's License (default)
      - Passport
      - National ID Card
      - State ID

  - **Front of ID Section**
    - Label: "Front of ID"
    - Upload area (large, dashed border):
      ```
      ┌─────────────────────────┐
      │    📷  Front of ID      │
      │                         │
      │  [Capture] [Upload]     │
      └─────────────────────────┘
      ```
    - After capture: Shows preview thumbnail
    - Actions: [Retake] [Remove]

  - **Back of ID Section**
    - Label: "Back of ID"
    - Same upload interface as front
    - Note: "Skip if using passport"

  - **Consent Checkbox** (required)
    - [ ] I consent to identity verification and understand my data will be:
      - Encrypted and stored securely
      - Used only for verification purposes
      - Processed according to [Privacy Policy]

  - **Action Buttons**
    - Secondary: [Cancel] (returns to settings)
    - Primary: [Continue]
    - Disabled until: Document type selected, front captured, consent checked

**Capture/Upload Options:**
- **Capture:** Opens camera interface
  - Live preview
  - Center guidelines overlay (card outline)
  - Tips: "Ensure all text is clear and readable"
  - [Capture Photo] button
  - [Cancel]

- **Upload:** Opens file picker
  - Accepted formats: JPG, PNG, PDF
  - Max size: 10MB
  - Auto-crop and enhance if possible

**Validation:**
- Image quality check (not too blurry)
- File size limits
- Format validation
- Check if ID edges are visible (basic OCR)

**States:**
1. **Default:** Empty upload areas
2. **Capturing:** Camera active
3. **Previewing:** Shows captured image
4. **Uploading:** Progress bar
5. **Uploaded:** Preview shown with actions
6. **Error:** "Image quality too low" or "File too large"

**Error Handling:**
- Camera permission denied → Show instructions to enable
- Image too blurry → "Please retake with better lighting"
- File too large → "Please upload a file under 10MB"
- Network error → "Upload failed. Please try again."

**Navigation:**
- [Continue] → ID-SEEK-02 (Selfie Liveness)
- [Cancel] → SET-SEEK (Settings)
- Back button → Confirm: "Are you sure? Your progress will be lost."

**Security Notes:**
- All uploads encrypted in transit (TLS)
- Stored encrypted at rest
- PII redacted from logs
- Audit trail of all access

**Accessibility:**
- High contrast mode support
- Screen reader descriptions for upload areas
- Keyboard navigation support

---

## ID-SEEK-02 · Seeker Selfie Liveness

**Purpose:** Capture live selfie with liveness detection to verify the person matches the ID.

**Elements:**
- **Progress Indicator**
  - Step 2 of 3: Selfie
  - [●]──[●]──[○]

- **Title:** "Take a selfie"
- **Subtitle:** "We'll compare this to your ID to verify your identity"

- **Instructions Panel** (left side or top)
  - "Position your face in the oval"
  - "Follow the prompts:"
    - ✓ Look at camera
    - ✓ Blink naturally
    - ✓ Turn head slightly left
    - ✓ Turn head slightly right
  - "Ensure good lighting"
  - "Remove glasses if possible"

- **Camera View** (center, large)
  ```
  ┌────────────────────────────┐
  │                            │
  │        ┌─────┐            │
  │       │  👤  │  Timer: 0:05│
  │        └─────┘            │
  │     Oval guide overlay     │
  │                            │
  │  Prompt: "Blink naturally" │
  └────────────────────────────┘
  ```
  - Oval face guide (centered)
  - Real-time feedback:
    - Face detected: Green outline
    - Face not centered: Yellow outline + "Move closer"
    - Face too close/far: "Move back" / "Move closer"
  - Current prompt: Large text showing what to do
  - Timer: Shows elapsed time (auto-capture after sequence)

- **Liveness Prompts Sequence:**
  1. "Look at the camera" (2 seconds)
  2. "Blink naturally" (detect blink)
  3. "Turn your head slightly left" (detect turn)
  4. "Turn your head slightly right" (detect turn)
  5. "Hold still" (final capture)

- **Progress Dots**
  - ●○○○○ (shows current step in sequence)

- **Action Buttons**
  - During capture: [Cancel]
  - After capture: [Retake] [Submit for Verification]
  - [← Back] (returns to ID upload)

**States:**
1. **Initializing:** Camera loading
2. **Waiting for face:** "Position your face in the oval"
3. **Detecting:** Running through liveness prompts
4. **Captured:** Preview of selfie
5. **Submitting:** Uploading for verification
6. **Error:** Various error states (see below)

**Liveness Detection:**
- Face detection (eyes, nose, mouth visible)
- Blink detection (eyes close then open)
- Head turn detection (face orientation change)
- Depth detection (prevent photo of photo)
- Multiple frames captured and analyzed

**Error Handling:**
- **Camera blocked:** "Please allow camera access in your browser settings"
  - Show browser-specific instructions (Chrome, Safari, Firefox)

- **No face detected:** "We can't see your face. Move closer."
- **Multiple faces:** "Please ensure only one person is in frame"
- **Too dark:** "Please move to a brighter area"
- **Too bright:** "Reduce glare or move away from direct light"
- **Blink not detected:** "Please blink naturally and try again"
- **Liveness check failed:** "We couldn't verify. Please try again in good lighting."

**Success Flow:**
1. All prompts completed
2. Show preview: "Great! Here's your selfie"
3. [Retake] [Submit for Verification]
4. On submit → Shows loading
5. Navigate to ID-SEEK-03 (Result)

**Navigation:**
- [Submit for Verification] → ID-SEEK-03 (Verification Result)
- [Back] → ID-SEEK-01 (keep uploaded ID)
- [Cancel] → Confirm dialog, then back to settings

**Technical Notes:**
- Use WebRTC for camera access
- Client-side face detection (reduce latency)
- Capture multiple frames for backend analysis
- Store encrypted, delete raw frames after processing
- Fallback: If liveness fails 3 times, allow manual review

**Accessibility:**
- Audio prompts (optional, toggle)
- High contrast mode
- Alternative: Upload existing photo + manual review (for users who can't use camera)

---

## ID-SEEK-03 · Seeker Verification Result

**Purpose:** Show result of identity verification and next steps.

**Elements:**
- **Progress Indicator**
  - Step 3 of 3: Review
  - [●]──[●]──[●]

- **Status Card** (large, centered)
  - **If Verified (Success):**
    ```
    ┌────────────────────────────┐
    │      ✓ Verified!          │
    │                            │
    │  Your identity has been    │
    │  successfully verified.    │
    │                            │
    │  Benefits unlocked:         │
    │  • Higher RCS score        │
    │  • Send reference requests │
    │  • Create bundles          │
    │  • Employer trust badge    │
    │                            │
    │  [Go to Dashboard]         │
    └────────────────────────────┘
    ```
    - Large checkmark icon (green)
    - Success message
    - Benefits list
    - Primary CTA

  - **If In Review (Pending):**
    ```
    ┌────────────────────────────┐
    │      ⏱ In Review          │
    │                            │
    │  We're verifying your      │
    │  identity. This usually    │
    │  takes 10-30 minutes.      │
    │                            │
    │  We'll email you when it's │
    │  complete.                 │
    │                            │
    │  Expected time: ~15 min    │
    │                            │
    │  [Continue to Dashboard]   │
    └────────────────────────────┘
    ```
    - Clock icon (blue/yellow)
    - Pending message
    - Time estimate
    - Secondary CTA (dashboard still accessible)

  - **If Needs Review (Manual Review Required):**
    ```
    ┌────────────────────────────┐
    │   ⚠ Needs Review           │
    │                            │
    │  We need to manually verify│
    │  your documents.           │
    │                            │
    │  Common reasons:            │
    │  • Image quality issues    │
    │  • Document details unclear│
    │                            │
    │  Our team will review within│
    │  24 hours. We'll email you.│
    │                            │
    │  [Continue to Dashboard]   │
    │  [Upload Better Photos]    │
    └────────────────────────────┘
    ```
    - Warning icon (orange)
    - Explanation
    - Timeline
    - Options to retry or continue

  - **If Failed (Rejected):**
    ```
    ┌────────────────────────────┐
    │      ✗ Verification Failed │
    │                            │
    │  We couldn't verify your   │
    │  identity. This may be due:│
    │                            │
    │  • ID doesn't match selfie │
    │  • Document not accepted   │
    │  • Images unclear          │
    │                            │
    │  [Try Again]               │
    │  [Contact Support]         │
    └────────────────────────────┘
    ```
    - Error icon (red)
    - Reason for failure
    - Retry option
    - Support option

**Additional Elements:**
- **Help Section**
  - "Questions about verification?"
  - [View FAQ] [Contact Support]

- **What Happens Next** (if pending/in review)
  - Timeline visualization:
    - ✓ Documents submitted
    - → Under review (you are here)
    - → Verification complete
    - → Email notification sent

**States:**
- **Verified:** Green, success state
- **Pending:** Blue/yellow, waiting state
- **Needs Review:** Orange, warning state
- **Failed:** Red, error state

**Navigation:**
- [Go to Dashboard] → SEEK-HOME
- [Continue to Dashboard] → SEEK-HOME (with pending banner)
- [Try Again] → ID-SEEK-01 (restart flow)
- [Upload Better Photos] → ID-SEEK-01 (keep previous attempt visible)
- [Contact Support] → Support modal/page

**Backend Processing:**
- Automated checks:
  - Face match (ID photo vs selfie)
  - Document authenticity (OCR, validation)
  - Liveness detection pass/fail
  - Data extraction (name, DOB, ID number)

- If auto-verification passes → Instant "Verified"
- If flagged → Queue for manual review
- If fails checks → "Failed" with reason

**Post-Verification:**
- Update user profile: `kycStatus: "verified"`
- Unlock features: Send requests, create bundles
- Add verification badge to profile
- Update RCS calculation (add +40 points for identity)
- Send confirmation email

**Security:**
- Delete raw images after processing (keep encrypted hashes only)
- Audit log of verification attempts
- Rate limit: Max 3 attempts per 24 hours

**Notes:**
- Show verification status badge throughout app after this
- Persist status in user profile
- Consider showing verification date/expiry
- Plan for re-verification cadence (e.g., annually)

---

## NOTIFS · Notifications Drawer

**Purpose:** Display notifications for all users (requests, responses, reach-backs, retractions, etc.).

**Elements:**
- **Trigger:** Bell icon (top right header, always visible when logged in)
  - Badge: Red dot or number showing unread count
  - Example: 🔔³ (3 unread)

- **Drawer Panel** (slides in from right, overlays content)
  - Width: 400px (desktop), full width (mobile)
  - Height: Full viewport

  - **Header**
    - Title: "Notifications"
    - Filter tabs: [Unread] [All]
    - Close button: [×]

  - **Notification List** (scrollable)
    - Each notification item:
      ```
      ┌────────────────────────────────────┐
      │ 🔵 [Icon] [Title]          [Time] │
      │    [Description]                   │
      │    [Action Button(s)]              │
      └────────────────────────────────────┘
      ```
    - Components:
      - Status dot: 🔵 Unread (blue), ○ Read (gray)
      - Icon: Type-specific (🎥 reference, ⚠ attention, ✅ complete)
      - Title: Bold, main message
      - Description: Gray, supporting details
      - Timestamp: "2 hours ago", "Yesterday", "Dec 5"
      - Actions: Quick action buttons (Approve, View, Dismiss)

  - **Empty State**
    - Icon: 🔔 (large, gray)
    - Message: "No notifications yet"
    - Subtext: "We'll notify you about reference requests, responses, and updates"

  - **Footer** (if many notifications)
    - [Mark All as Read]
    - [View All] → Opens dedicated notifications page

**Notification Types & Templates:**

### Seeker Notifications:

1. **Reference Request Opened**
   ```
   🔵 📨 Jane Smith opened your request
      Opened 2 hours ago at TechCo
      [View Details]
   ```

2. **Reference Submitted**
   ```
   🔵 ✅ Jane Smith submitted a reference
      Video reference submitted with RCS: 92 (High)
      [View Reference] [Add to Bundle]
   ```

3. **Reference Declined**
   ```
   🔵 ⚠ Mac Developer declined your request
      Declined 1 day ago
      [View Details] [Send to Someone Else]
   ```

4. **Reference Request Expiring**
   ```
   🔵 ⏱ Request expiring in 2 days
      Jane Smith hasn't started yet
      [Send Reminder] [Extend Deadline]
   ```

5. **Retraction Request**
   ```
   🔵 ⚠ Sarah Chen wants to retract her reference
      You have 10 days to respond or it will auto-retract
      [View Details] [Discuss] [Accept Retraction]
   ```

6. **Bundle Viewed**
   ```
   🔵 👁 Your bundle was viewed
      "Senior Dev Bundle" viewed by Google HR
      [View Analytics]
   ```

7. **Back-Channel Request**
   ```
   🔵 📞 Employer requested back-channel contact
      Google wants to contact Jane Smith directly
      [Approve] [Decline] [View Details]
   ```

### Referrer Notifications:

1. **New Reference Request**
   ```
   🔵 📨 New reference request from John Seek
      For role at TechCo (2021-2023)
      [Accept] [Decline] [View Details]
   ```

2. **Reference Request Reminder**
   ```
   🔵 ⏱ Reference request due in 2 days
      John Seek is waiting for your response
      [Continue Response]
   ```

3. **Your Reference Helped!**
   ```
   🔵 🎉 John Seek got an interview!
      Your reference for John helped him get an interview at Google
      [View Details]
   ```

4. **Back-Channel Contact Request**
   ```
   🔵 📞 Employer wants to contact you
      Google HR wants to verify John Seek's reference
      You'll receive an email if John approves
      [View Details]
   ```

### Employer Notifications:

1. **Bundle Access Granted**
   ```
   🔵 🔓 You have access to John Seek's references
      Bundle: "Senior Dev Position" (RCS: 87 High)
      [View Bundle]
   ```

2. **Back-Channel Approved**
   ```
   🔵 ✅ John Seek approved your request
      You can now contact Jane Smith at jane@techco.com
      [View Contact Info]
   ```

**Interaction Behaviors:**
- Click notification → Navigate to relevant page
- Click status dot → Mark as read
- Swipe left (mobile) → Delete/dismiss
- Hover (desktop) → Show full timestamp + more actions
- Auto-refresh: Poll every 30 seconds or WebSocket real-time

**States:**
1. **Empty:** No notifications
2. **Loading:** Fetching notifications
3. **Populated:** Showing list
4. **Filtering:** Only unread shown
5. **Error:** "Failed to load notifications. [Retry]"

**Settings Integration:**
- Link to notification preferences: [⚙ Notification Settings]
- User can configure:
  - Email notifications (on/off per type)
  - Push notifications
  - SMS notifications
  - Frequency (immediate, daily digest, weekly)

**Technical:**
- Real-time via WebSocket (preferred) or polling
- Store notification state (read/unread) per user
- Pagination: Load 20 at a time, infinite scroll
- Mark as read: On click or after 3 seconds of viewing
- Retention: Keep 90 days, then archive

**Accessibility:**
- Screen reader announces new notifications
- Keyboard shortcut: N to open drawer
- Focus trap when drawer open
- High contrast support

**Analytics:**
- Track notification open rate
- Track action click rate
- Identify which notifications drive engagement

---

# SEEKER FRAMES

## SEEK-01 · Seeker Profile Setup

**Purpose:** Initial profile setup for new seekers to add basic information.

**Elements:**
- **Header:** Standard app header with logo
- **Left Sidebar:** Seeker navigation (Dashboard highlighted as active)

- **Main Content**
  - **Progress Indicator** (optional)
    - "Complete your profile: 2 of 5 steps"
    - Progress bar: 40%

  - **Title:** "Set up your profile"
  - **Subtitle:** "Help referrers remember you and make verification easier"

  - **Avatar Upload Section**
    - Label: "Profile Photo"
    - Current state: Gray circle with user icon placeholder
    - [Upload Photo] button
    - Accepted formats: JPG, PNG
    - Max size: 5MB
    - Auto-crop to circle

  - **Headline Field**
    - Label: "Professional Headline"
    - Placeholder: "e.g., Senior Software Engineer | React & Node.js"
    - Type: Text
    - Max length: 120 characters
    - Character counter: "78 / 120"
    - Helper text: "This appears on your shared bundles"

  - **LinkedIn Import** (optional, phase 2)
    - Button: [Import from LinkedIn]
    - Icon: LinkedIn logo
    - Helper: "Auto-fill from your LinkedIn profile"
    - On click → OAuth flow

  - **Resume Upload Section**
    - Label: "Resume / CV"
    - Upload area (drag & drop or click):
      ```
      ┌────────────────────────────┐
      │   📄 Drop resume here      │
      │   or click to browse       │
      │                            │
      │   PDF or DOCX (max 5MB)    │
      └────────────────────────────┘
      ```
    - After upload: Show file name, size, [Remove] button
    - "Why we ask: We extract work history to suggest referrers"

  - **Contact Information**
    - **Primary Email**
      - Pre-filled from account creation
      - Disabled (can't change here)
      - Note: "To change email, go to Settings"

    - **Alternative Email** (optional)
      - Placeholder: "personal@email.com"
      - Use case: "For employer communications"

    - **Phone Number** (optional but recommended)
      - Country code dropdown + number input
      - Format: E.164 format
      - Validation: Valid phone number
      - Checkbox: [ ] Verify phone now (adds to RCS)
      - If checked → After save, prompt for SMS OTP

  - **Social Media** (optional)
    - Label: "LinkedIn Profile URL"
    - Placeholder: "linkedin.com/in/yourname"
    - Validation: Valid LinkedIn URL format
    - Note: "Used for cross-verification (boosts RCS)"

  - **Action Buttons**
    - Secondary: [Skip for Now]
    - Primary: [Save & Continue]
    - Disabled until: Headline filled (minimum requirement)

**Validation:**
- Avatar: File type and size
- Headline: Required, max length
- Resume: File type (PDF, DOCX), max size 5MB
- Email: Valid format
- Phone: Valid E.164 format
- LinkedIn: Valid URL format

**States:**
1. **Empty:** First load, placeholders visible
2. **Filling:** User entering data
3. **Uploading:** File upload in progress
4. **Validating:** Checking data
5. **Saving:** API call to save profile
6. **Saved:** Success message, redirect
7. **Error:** Field-level or form-level errors

**Resume Processing:**
- Upload to secure storage
- Background job: Parse resume (extract companies, dates, roles)
- Store parsed data in user profile
- Use for suggesting referrers later

**LinkedIn Import Flow:**
1. Click [Import from LinkedIn]
2. OAuth popup → LinkedIn login
3. Request permissions: basic profile, work history
4. On success: Pre-fill headline, work history
5. User can edit before saving

**Phone Verification Flow (if checkbox selected):**
1. Save profile
2. Modal: "Verify your phone number"
3. Display phone number
4. [Send Code] → SMS sent
5. Enter 6-digit code
6. On success: ✓ Phone verified badge

**Navigation:**
- [Save & Continue] → SEEK-HOME (Dashboard)
- [Skip for Now] → SEEK-HOME (show incomplete profile banner)
- Sidebar navigation → Save draft automatically, allow navigation

**Post-Save:**
- Store profile data
- If resume uploaded → Trigger parsing job
- If phone verified → Update profile, add RCS points
- Redirect to dashboard
- Show toast: "Profile saved successfully!"

**Incomplete Profile:**
- If skipped, show banner on dashboard:
  - "Complete your profile to unlock features like creating reference requests"
  - [Complete Profile] button

**Notes:**
- Auto-save draft every 30 seconds
- Track completion rate
- Consider onboarding checklist widget
- Mobile: Stack all sections vertically, larger touch targets

---

## SEEK-HOME · Dashboard

**Purpose:** Main dashboard for seekers showing overview, stats, and quick actions.

**Elements:**
- **Header:** Standard app header with logo, notifications bell, user menu
- **Left Sidebar:** Seeker navigation (Dashboard active)

- **Main Content Area**

  ### Top Section: Header & RCS

  - **User Profile Card** (left)
    ```
    ┌─────────────────────────────┐
    │  👤 [Avatar]                │
    │  John Seek                  │
    │  Senior Software Engineer   │
    │  ✓ Identity Verified        │
    └─────────────────────────────┘
    ```
    - Avatar (clickable → profile)
    - Name
    - Headline
    - Verification badge (if KYC complete)

  - **RCS Score Card** (right, prominent)
    ```
    ┌─────────────────────────────┐
    │   Your Reference Score      │
    │                             │
    │        ┌──────┐             │
    │        │  87  │   HIGH      │
    │        └──────┘   ●●●○      │
    │                             │
    │   Based on 12 references    │
    │   [View Breakdown] [Share]  │
    └─────────────────────────────┘
    ```
    - Large score display
    - Band indicator (Low/Medium/High) with color coding
    - Reference count
    - Actions: View detailed breakdown, Share profile
    - Tooltip: "What is RCS?" → Explanation modal

  - **KYC Status Banner** (if not verified, full width)
    ```
    ⚠ Complete identity verification to unlock full features
    Your RCS could increase by up to 40 points
    [Verify Identity Now →]  [Remind Me Later]
    ```

  ### Stats Section: Quick Overview

  - **KPI Tiles** (4-5 cards, grid layout)
    ```
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │     11      │  │     97      │  │      7      │  │      3      │
    │   Pending   │  │  Completed  │  │  Declined   │  │   Needs     │
    │  Requests   │  │ References  │  │             │  │  Attention  │
    └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
    ```
    - Click each tile → Filters requests table below
    - Color coding:
      - Pending: Blue
      - Completed: Green
      - Declined: Red
      - Needs Attention: Orange

  - **Secondary Stats** (below KPIs)
    ```
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │     43      │  │     42      │  │     51      │
    │   Bundles   │  │   Bundle    │  │   Employer  │
    │   Created   │  │   Views     │  │  Reach-backs│
    └─────────────┘  └─────────────┘  └─────────────┘
    ```

  ### Primary Actions Section

  - **Quick Action Buttons** (prominent, centered)
    - [+ New Reference Request] (primary, large)
    - [📦 Create Bundle] (secondary)
    - Both disabled if KYC not complete (with tooltip explanation)

  ### Recent Activity Section

  - **Section Title:** "Recent Activity"
  - **Tabs:**
    - [Requests] (active)
    - [References]

  - **Requests Tab - Table View**
    - Columns:
      - **Referrer:** Name + email + company
      - **Status:** Chip (Sent/Opened/Started/Submitted/Declined)
      - **Last Activity:** Relative time ("2 hours ago")
      - **RCS:** Badge (if submitted) or "Pending"
      - **Actions:** Dropdown menu [⋮]

    - Example rows:
      ```
      Referrer           Status      Last Activity  RCS    Actions
      ────────────────────────────────────────────────────────────
      Jane Smith        Submitted   2 days ago     [92]   [⋮]
      jane@techco.com
      TechCo

      Mac Developer     Started     4 hours ago    --     [⋮]
      mac@corp.com
      CorporateMail

      Sarah Chen        Opened      3 days ago     --     [⋮]
      sarah@startup.ai  (❗Needs attention)
      StartupAI
      ```

    - Actions menu [⋮]:
      - View Details
      - Send Reminder (if not completed)
      - Add to Bundle (if completed)
      - Edit Request (if not started)
      - Revoke Request

    - Needs Attention indicator (❗):
      - Opened but not started after 5+ days
      - Expiring soon (< 2 days)
      - Requires action from seeker

    - Empty state:
      "No requests yet. Send your first reference request!"
      [+ New Reference Request]

    - Footer: [See All Requests →] (links to full requests page)

  - **References Tab - Grid/Card View**
    ```
    ┌──────────────────────────┐  ┌──────────────────────────┐
    │ 🎥 Jane Smith           │  │ 🎙 Mac Developer         │
    │ TechCo • Manager        │  │ Corp • Peer              │
    │ Video • 2:14            │  │ Audio • 3:45             │
    │ [92] HIGH               │  │ [85] HIGH                │
    │ 2 days ago              │  │ 1 week ago               │
    │ [View] [Add to Bundle]  │  │ [View] [Add to Bundle]   │
    └──────────────────────────┘  └──────────────────────────┘
    ```
    - Shows completed references only
    - Filterable by format, company, RCS band
    - Bulk select checkbox → [Add Selected to Bundle]

  ### Ready to Bundle Section

  - **Smart Suggestion Strip** (collapsible)
    ```
    💡 You have 5 new references ready to bundle
    ┌──────────────────────────────────────────────────┐
    │ [✓] Jane Smith (92)  [✓] Mac Dev (85)  [ ] Sarah Chen (88)
    └──────────────────────────────────────────────────┘
    [Create Bundle from Selected (2)]  [Dismiss]
    ```
    - Shows completed references not yet in a bundle
    - Checkbox selection
    - Quick action to bundle
    - Dismissable

  ### Sent Bundles Section (if any exist)

  - **Section Title:** "Sent Bundles"
  - **Table View:**
    ```
    Bundle Name          Shared To      Sent      Status   Views  Actions
    ────────────────────────────────────────────────────────────────────
    Senior Dev Bundle    Google         1d ago    Seen     3      [⋮]
    E-Commerce Role      E-tech         5d ago    Waiting  0      [⋮]
    FinderAI Position    FinderAI       1w ago    Done     7      [⋮]
    ```
    - Columns: Name, Recipient, Date sent, Status, View count, Actions
    - Status: Seen (viewed), Waiting (not viewed yet), Done (closed/hired)
    - Actions: View Bundle, Copy Link, View Analytics, Edit, Archive

    - Footer: [See All Bundles →]

**Notifications Integration:**
- Bell icon (top right) shows unread count
- Click → Opens NOTIFS drawer

**States:**
1. **First-time user (empty):**
   - Show welcome message
   - Highlight [+ New Reference Request] button
   - Optional: Onboarding tour

2. **Unverified KYC:**
   - Show verification banner
   - Disable request/bundle actions with tooltips

3. **Active user:**
   - All data populated
   - Recent activity visible
   - Stats accurate

4. **Loading:**
   - Skeleton screens for each section

5. **Error:**
   - "Failed to load dashboard data. [Retry]"

**Responsive Design:**
- Mobile: Stack all sections vertically
- Tablet: 2-column grid for KPIs
- Desktop: Full layout as described

**Performance:**
- Lazy load recent activity (fetch on scroll)
- Cache RCS score (update every 5 minutes)
- Real-time status updates via WebSocket

**Analytics Tracking:**
- Track button clicks (New Request, Create Bundle)
- Track section engagement (time spent, scrolls)
- Track filter usage on tables

**Navigation:**
- [+ New Reference Request] → REQ-01
- [Create Bundle] → BUNDLE-01
- [See All Requests] → Full requests page with filters
- [See All Bundles] → Full bundles page
- Sidebar navigation → Respective pages

**Notes:**
- Dashboard should feel alive, not static
- Use skeleton loaders, not spinners
- Consider adding achievements/badges section
- Plan for dashboard customization (user can rearrange widgets)

---

## REQ-01 · New Reference · Choose Referrer

**Purpose:** First step in creating a reference request - identify who will provide the reference.

**Elements:**
- **Header:** Standard app header
- **Left Sidebar:** Seeker navigation (Requests active)

- **Main Content**

  - **Wizard Header**
    - Title: "Request a Reference"
    - Progress: Step 1 of 5
    - Progress bar: ████░░░░░░░ (20%)
    - Step labels: Choose Referrer → Context → Questions → Format → Send

  - **Section Title:** "Who should provide this reference?"
  - **Subtitle:** "This could be a manager, colleague, client, or anyone who can speak to your work"

  - **Quick Import Options** (prominent, at top)
    ```
    ┌─────────────────────────────────────────────────┐
    │  Import contacts from:                          │
    │  [📄 Resume] [💼 LinkedIn] [✉ Gmail] [Manual]  │
    └─────────────────────────────────────────────────┘
    ```
    - Each button triggers respective import flow
    - Resume: If uploaded, show parsed contacts
    - LinkedIn: OAuth flow
    - Gmail: OAuth flow to read contacts
    - Manual: Default form below

  - **Suggested Referrers** (if available from resume/LinkedIn)
    ```
    💡 We found these people in your resume:

    ┌────────────────────────────────────┐
    │ Jane Smith                         │
    │ Engineering Manager @ TechCo       │
    │ 2021-2023 (from resume)            │
    │ ✓ LinkedIn verified                │
    │        [Use This Person →]         │
    └────────────────────────────────────┘

    ┌────────────────────────────────────┐
    │ Mac Developer                      │
    │ Senior Engineer @ CorporateMail    │
    │ 2020-2023 (from resume)            │
    │ ⚠ Email not found                  │
    │        [Use This Person →]         │
    └────────────────────────────────────┘
    ```
    - Shows people extracted from resume/LinkedIn
    - Verification status indicator
    - Click [Use This Person] → Pre-fills form below

  - **Manual Entry Form**

    - **Referrer Information**

      - **Name** (required)
        - Label: "Full Name"
        - Placeholder: "Jane Smith"
        - Type: Text
        - Validation: Required, min 2 characters

      - **Email** (required)
        - Label: "Email Address"
        - Placeholder: "jane.smith@company.com"
        - Type: Email
        - Validation: Required, valid email format
        - Real-time check: If email exists in system, show:
          "✓ This person is on DeepRef" (better deliverability)

      - **Company** (optional but recommended)
        - Label: "Company / Organization"
        - Placeholder: "TechCo Inc."
        - Type: Text with autocomplete (from database of companies)
        - Helper: "Helps with verification"

      - **Role at Time** (optional but recommended)
        - Label: "Their Role When You Worked Together"
        - Placeholder: "Engineering Manager"
        - Type: Text
        - Helper: "Their title at the company"

    - **Relationship Information**

      - **Relationship Type** (required)
        - Label: "Relationship"
        - Radio buttons or dropdown:
          - ( ) Manager / Supervisor
          - ( ) Peer / Colleague
          - ( ) Client / Customer
          - ( ) Direct Report (they reported to me)
          - ( ) Other
        - If "Other" selected → Text field appears: "Specify relationship"
        - Helper: "Helps us suggest relevant questions"

      - **Working Together** (optional, informational)
        - Checkbox: [ ] We still work together
        - Helper: "This affects question phrasing"

  - **Contact Book** (if user has saved contacts)
    - Toggle: [📖 Choose from Contacts]
    - Opens modal/panel with saved contacts
    - Search + filter
    - Click contact → Pre-fills form
    - [+ Add New Contact] → Contact management page

  - **Action Buttons**
    - Secondary: [Cancel] → Confirm dialog, back to dashboard
    - Primary: [Next: Add Context →]
    - Disabled until: Name and email filled

**Validation:**
- Name: Required, minimum 2 characters
- Email: Required, valid format, check deliverability
- Relationship: Required selection
- Real-time validation with error messages

**States:**
1. **Empty form:** Default state
2. **Suggested contacts:** If resume/LinkedIn data available
3. **Importing:** Loading contacts from source
4. **Filling:** User entering data
5. **Validating:** Checking email, etc.
6. **Valid:** Ready to proceed
7. **Error:** Invalid data, show field-level errors

**Import Flows:**

### Resume Import:
1. Click [Resume]
2. If resume previously uploaded → Show parsed contacts
3. If not → Prompt: "Upload resume in profile first"
4. User selects contact → Pre-fills form

### LinkedIn Import:
1. Click [LinkedIn]
2. OAuth popup
3. Request permissions: connections, work history
4. Show list of connections with overlapping employment dates
5. User selects → Pre-fills form

### Gmail Import:
1. Click [Gmail]
2. OAuth popup
3. Read contacts API
4. Show list with search/filter
5. User selects → Pre-fills form

**Email Verification:**
- On blur of email field → Check:
  - Valid format
  - Deliverability (MX record check)
  - If exists in DeepRef system
- Show indicators:
  - ✓ Valid email
  - ✓ Active DeepRef user (faster response)
  - ⚠ Email format valid but can't verify deliverability
  - ✗ Invalid email format

**Contact Book Integration:**
- Users can save contacts for reuse
- Link: "Save to contacts for later"
- Checkbox: [ ] Save this person to my contacts
- Pre-filled on next request

**Navigation:**
- [Next: Add Context] → REQ-02 (pass referrer data)
- [Cancel] → Confirm: "Discard this request?" [Stay] [Leave]
- Sidebar nav → Auto-save draft

**Auto-save:**
- Save draft to localStorage every 30 seconds
- On return, prompt: "Continue your draft request?"

**Accessibility:**
- Form labels associated with inputs
- Error messages announced
- Keyboard navigation through form
- Autocomplete attributes for browser autofill

**Notes:**
- Consider showing example referrer to guide users
- Track which import methods are most used
- Plan for bulk request creation (request from 5 people at once)
- Mobile: Larger touch targets, simpler layout

---

## REQ-02 · New Reference · Context (Role & Dates)

**Purpose:** Provide context about the working relationship to help the referrer recall and structure their response.

**Elements:**
- **Wizard Header**
  - Progress: Step 2 of 5
  - Progress bar: ████████░░ (40%)
  - Breadcrumb: Choose Referrer → **Context** → Questions → Format → Send

- **Section Title:** "Tell us about your role"
- **Subtitle:** "This helps [Referrer Name] prepare their reference"
- **Context Card** (shows selected referrer from previous step)
  ```
  ┌────────────────────────────────────┐
  │ Reference request for:             │
  │ Jane Smith (jane@techco.com)       │
  │ Engineering Manager @ TechCo       │
  └────────────────────────────────────┘
  ```

- **Form Fields**

  - **Your Role Title** (required)
    - Label: "Your Title / Position"
    - Placeholder: "e.g., Senior Software Engineer"
    - Type: Text with autocomplete (common job titles)
    - Validation: Required, min 2 characters
    - Helper: "What was your role at the time?"

  - **Employment Dates**
    - Label: "When did you work together?"
    - **Start Date** (required)
      - Month + Year picker
      - Format: "Jan 2021"
      - Validation: Required, can't be future date
    - **End Date** (conditional)
      - Month + Year picker
      - Format: "Dec 2023"
      - Validation: Must be after start date
      - Checkbox: [ ] I still work here / Present
      - If checked → End date field disabled, shows "Present"
    - Date range display: "Jan 2021 - Dec 2023 (2 years 11 months)"

  - **Team / Project** (optional but recommended)
    - Label: "Team or Project Name"
    - Placeholder: "e.g., Platform Team, Project Phoenix"
    - Type: Text
    - Helper: "Specific team or project you worked on together"
    - Character limit: 100

  - **Brief Description** (optional)
    - Label: "Brief Description of Your Work"
    - Placeholder: "e.g., Led development of authentication service, managed team of 5 engineers"
    - Type: Textarea
    - Rows: 3
    - Character limit: 250
    - Character counter: "0 / 250"
    - Helper: "Help them remember key achievements (optional but helpful)"

  - **Supporting Documents** (optional)
    - Label: "Do you have proof of this employment?"
    - Checkbox: [ ] I have offer letters, contracts, or other proof documents
    - If checked → Upload area appears:
      ```
      ┌────────────────────────────────┐
      │   📄 Upload Documents          │
      │   Drag files here or click     │
      │                                │
      │   Accepted: PDF, JPG, PNG      │
      │   Max 10MB per file            │
      └────────────────────────────────┘
      ```
    - After upload: File chips with [×] remove button
    - Multiple files allowed (up to 5)
    - Helper: "These increase your RCS but are never shared without permission"

  - **Why This Matters** (info box, collapsible)
    ```
    💡 How this increases your RCS:
    • Dates are cross-checked with LinkedIn
    • Documents verify employment authenticity
    • Specific details improve content consistency scoring
    ```

- **Action Buttons**
  - Secondary: [← Back] → REQ-01 (preserve data)
  - Primary: [Next: Choose Questions →]
  - Disabled until: Role title, start date filled

**Validation:**
- Role title: Required
- Start date: Required, valid date, not in future
- End date: If present, must be after start date
- Date logic: If still employed, end date = "Present"
- Files: Type and size validation
- Brief description: Max 250 characters

**States:**
1. **Empty:** Form ready for input
2. **Filling:** User entering data
3. **Uploading:** File upload in progress
4. **Validating:** Checking dates, etc.
5. **Valid:** Ready to proceed
6. **Error:** Invalid dates or file uploads

**Date Validation:**
- Start date can't be in future
- End date can't be before start date
- If dates seem unusual (e.g., 20 years ago, or 1 month duration):
  - Warning: "Unusual date range. Please verify."
  - Allow to proceed but flag for review

**Document Upload:**
- Accepted formats: PDF, JPG, PNG
- Max size: 10MB per file
- Max files: 5
- Security: Scan for malware, encrypt at rest
- Processing: OCR to extract company name, dates
- Storage: Separate from other user data, encrypted

**Cross-Verification:**
- If LinkedIn connected:
  - Check if company and dates match LinkedIn profile
  - If mismatch → Warning: "Dates don't match LinkedIn. Update?"
  - Allow to proceed but note discrepancy for RCS
- If resume uploaded:
  - Check against resume data
  - Highlight discrepancies

**Duration Calculation:**
- Auto-calculate and display duration
- Examples:
  - "Jan 2021 - Dec 2023 (2 years 11 months)"
  - "Jan 2023 - Present (1 year 3 months)"
- Use for RCS calculation (longer tenure = more credible)

**Navigation:**
- [Back] → REQ-01 (preserve all data)
- [Next] → REQ-03 (pass context data)
- Auto-save draft every 30 seconds

**Pre-fill Intelligence:**
- If dates/company entered in REQ-01 → Pre-fill here
- If resume/LinkedIn data available → Suggest values
- Allow user to override all suggestions

**Accessibility:**
- Date pickers keyboard accessible
- File upload works with keyboard (Enter to open picker)
- Error messages associated with fields
- Screen reader friendly duration calculation

**Notes:**
- Consider showing timeline visualization of work history
- Track how many users upload proof documents
- Plan for bulk import of work history
- Mobile: Date picker native UI, simplified upload

---

## REQ-03 · New Reference · Questions

**Purpose:** Select questions that the referrer will answer. Balance between templated and custom questions.

**Elements:**
- **Wizard Header**
  - Progress: Step 3 of 5
  - Progress bar: ████████████░ (60%)
  - Breadcrumb: Choose Referrer → Context → **Questions** → Format → Send

- **Section Title:** "What should [Referrer Name] be asked?"
- **Subtitle:** "Choose 5-7 questions (takes referrer ~3-5 minutes to answer)"

- **Context Reminder Card**
  ```
  ┌────────────────────────────────────┐
  │ Reference for: Jane Smith          │
  │ Your role: Senior Software Engineer│
  │ Relationship: Manager              │
  │ Duration: Jan 2021 - Dec 2023      │
  └────────────────────────────────────┘
  ```

- **Question Tabs** (switching interface)
  - Tabs:
    - [General] (default, active)
    - [Role-Specific]
    - [Custom]
  - Tab indicator shows selected question count per category

  ### General Tab

  - **Pre-curated Question Categories**
    - Organized by theme
    - Each category has 3-5 questions
    - User selects individual questions (checkboxes)

    **Example structure:**
    ```
    Leadership & Management (for Manager relationship)
    [ ] "Describe John's leadership style and how he motivated the team"
        Used by 847 seekers
    [ ] "What was John's biggest achievement while under your supervision?"
        Used by 623 seekers
    [ ] "How did John handle difficult situations or conflicts?"
        Used by 512 seekers
    [Show more...] (expands to show 2 more)

    Technical Competence
    [ ] "Rate John's technical skills and provide specific examples"
        Used by 756 seekers
    [ ] "Describe a challenging technical problem John solved"
        Used by 689 seekers

    Communication & Collaboration
    [ ] "How effectively did John communicate with team members and stakeholders?"
        Used by 598 seekers
    [ ] "Describe John's collaboration style and teamwork approach"
        Used by 445 seekers

    Growth & Development
    [ ] "How did John respond to feedback and coaching?"
        Used by 389 seekers
    [ ] "What areas did John improve in during your time working together?"
        Used by 267 seekers

    Final Verdict
    [✓] "Would you hire John again? Why or why not?"
        Used by 1,234 seekers (most popular)
    ```

    - Each question shows:
      - Checkbox for selection
      - Question text
      - Social proof ("Used by N seekers")
      - [Show more] expands category

  ### Role-Specific Tab

  - **Industry/Role Suggestions**
    - Based on user's role and industry
    - Example for Software Engineer:
      ```
      Software Engineering Questions
      [ ] "Describe John's approach to code quality and testing"
      [ ] "How did John handle technical debt and legacy code?"
      [ ] "What was John's contribution to architecture decisions?"
      [ ] "Describe John's mentorship of junior developers"
      ```

    - Example for Manager role:
      ```
      Management Questions
      [ ] "How did John handle performance issues on the team?"
      [ ] "Describe John's approach to hiring and team building"
      [ ] "How effective was John at cross-functional collaboration?"
      ```

  ### Custom Tab

  - **Add Your Own Questions**
    - Button: [+ Add Custom Question]
    - Clicking opens textarea:
      ```
      ┌────────────────────────────────────┐
      │ Custom Question                    │
      │ ┌────────────────────────────────┐ │
      │ │ Enter your question...         │ │
      │ │                                │ │
      │ └────────────────────────────────┘ │
      │ Character count: 0 / 500           │
      │ [Cancel] [Add Question]            │
      └────────────────────────────────────┘
      ```
    - Max length: 500 characters
    - Validation: Must be a question (ends with ?)
    - Multiple custom questions allowed

  - **Custom Questions List**
    ```
    Your Custom Questions (2)

    1. "Can you describe our work on the database migration project?"
       [Edit] [Remove]

    2. "What made our team effective despite remote work challenges?"
       [Edit] [Remove]
    ```

- **Selected Questions Panel** (sticky sidebar or bottom panel)
  ```
  ┌────────────────────────────────────┐
  │ Selected Questions (6)             │
  │ Estimated time: 4-6 minutes        │
  │                                    │
  │ 1. [Drag] Describe John's leader... │
  │    [Edit] [Remove]                  │
  │ 2. [Drag] What was John's biggest...│
  │    [Edit] [Remove]                  │
  │ 3. [Drag] Rate John's technical...  │
  │    [Edit] [Remove]                  │
  │ ... (3 more)                        │
  │                                    │
  │ 💡 Tip: 5-7 questions is ideal     │
  │                                    │
  │ [Clear All] [Restore Defaults]     │
  └────────────────────────────────────┘
  ```

  - Shows all selected questions
  - Drag handles to reorder (numbered 1, 2, 3...)
  - Edit button: Opens inline editor to tweak wording
  - Remove button: Unselect question
  - Estimated time calculation: ~30-60 seconds per question
  - Warnings:
    - If < 3 questions: "Too few questions. Add at least 2 more."
    - If > 10 questions: "This is a lot! Consider reducing to 7 or fewer."

- **Question Preview** (modal/expandable)
  - Button: [Preview How This Will Look]
  - Opens modal showing referrer's view:
    ```
    ┌────────────────────────────────────┐
    │ Reference Request from John Seek   │
    │                                    │
    │ You'll be asked to answer these    │
    │ 6 questions about your time        │
    │ working with John at TechCo        │
    │                                    │
    │ 1. Describe John's leadership...   │
    │ 2. What was John's biggest...      │
    │ 3. Rate John's technical skills... │
    │ ... (3 more)                       │
    │                                    │
    │ This will take approximately       │
    │ 4-6 minutes                        │
    └────────────────────────────────────┘
    ```

- **Helper Information**
  - **Response Format Limits** (info box)
    ```
    📏 Response limits:
    • Text answers: 500 characters per question
    • Video/Audio: 2:00 per question (extendable to 4:00)
    • Total time: Depends on format chosen in next step
    ```

- **Action Buttons**
  - Secondary: [← Back] → REQ-02
  - Primary: [Next: Choose Format →]
  - Disabled until: At least 3 questions selected

**Validation:**
- Minimum 3 questions required
- Maximum 10 questions recommended (can override with warning)
- Custom questions must be valid (not empty, under char limit)
- At least one question selected

**States:**
1. **Default:** Pre-selected popular questions (smart defaults)
2. **Selecting:** User browsing and selecting
3. **Reordering:** Drag-and-drop active
4. **Editing:** Custom question editor open
5. **Valid:** 3-10 questions selected, ready to proceed
6. **Warning:** < 3 or > 10 questions

**Smart Defaults:**
- Auto-select top 5 most popular questions based on relationship type
- User can modify from there
- Makes it faster for users who want standard questions

**Question Editing:**
- User can edit pre-made questions
- Edit button → Inline textarea appears
- Changes only apply to this request
- Original question unaffected in template library

**Question Library Management:**
- Questions come from curated database
- Track usage counts for social proof
- Admin can add/remove/edit template questions
- Consider user-submitted questions (moderated)

**Time Estimation Logic:**
- Text: ~45 seconds per question (typing + thinking)
- Video: ~1.5 minutes per question (recording + retakes)
- Audio: ~1 minute per question
- Use average of selected format in next step

**Navigation:**
- [Back] → REQ-02 (preserve selections)
- [Next] → REQ-03 (pass question list)
- Auto-save selections to draft

**Accessibility:**
- Drag-and-drop has keyboard alternative (up/down arrow + move)
- Checkboxes clearly labeled
- Estimated time announced on selection change
- Screen reader: Announce count when questions added/removed

**Performance:**
- Lazy load question categories (load on tab switch)
- Debounced search if search is added
- Smooth drag-and-drop animations

**Analytics:**
- Track which questions are most selected
- Track custom question usage rate
- Track average number of questions per request
- A/B test default selections

**Notes:**
- Consider adding question templates for specific job types (PM, Designer, etc.)
- Allow users to save custom question sets for reuse
- Plan for AI-suggested questions based on job description (future)
- Mobile: Simpler reordering (move up/down buttons instead of drag)

---

## REQ-04 · New Reference · Format & Privacy

**Purpose:** Configure response format options, deadline, and privacy settings for the reference request.

**Elements:**
- **Wizard Header**
  - Progress: Step 4 of 5
  - Progress bar: ████████████████░ (80%)
  - Breadcrumb: Choose Referrer → Context → Questions → **Format** → Send

- **Section Title:** "Response format & settings"
- **Subtitle:** "Choose how [Referrer Name] should respond"

- **Format Selection** (prominent, visual)

  - Label: "Allowed Response Formats"
  - Subtitle: "Referrer can choose any enabled format"

  - **Toggle Cards** (3 cards, side-by-side)
    ```
    ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
    │ 🎥 Video       │  │ 🎙 Audio       │  │ ✏️ Text        │
    │ [ON / OFF]     │  │ [ON / OFF]     │  │ [ON / OFF]     │
    │                │  │                │  │                │
    │ Most impactful │  │ Easy & quick   │  │ Fastest option │
    │ 2:00 per Q     │  │ 2:00 per Q     │  │ 500 chars per Q│
    │ Extendable +2  │  │ Extendable +2  │  │                │
    └────────────────┘  └────────────────┘  └────────────────┘
    ```

    - Each card:
      - Icon + format name
      - Toggle switch (ON/OFF)
      - Benefits description
      - Time/length limits
    - Default: All three enabled
    - Must have at least one enabled
    - If only one enabled, show: "Referrer must respond in [Format]"

  - **Validation:**
    - At least one format must be enabled
    - If all disabled: Error "Please enable at least one format"

- **Deadline Settings**

  - Label: "Response Deadline"
  - Subtitle: "Give your referrer enough time to respond thoughtfully"

  - **Date Picker**
    - Field: Due date
    - Format: "Dec 25, 2024"
    - Validation: Must be at least 3 days in future, max 90 days
    - Helper text: "Recommended: 7-14 days"

  - **Quick Select Buttons** (optional shortcuts)
    ```
    [7 days] [14 days] [30 days] [Custom]
    ```
    - Clicking sets date automatically
    - "Custom" opens date picker

  - **Time Estimate Reminder**
    ```
    💡 Estimated completion time: 4-6 minutes
    Most referrers complete within 2-3 days
    ```

- **Privacy & Permissions**

  - **Back-Channel Toggle** (important setting)
    ```
    ┌────────────────────────────────────────────┐
    │ Back-Channel Verification                  │
    │                                            │
    │ [OFF / ON] Allow employers to contact      │
    │            this referrer directly          │
    │                                            │
    │ ℹ️  What this means:                       │
    │ • Employers can request to contact Jane    │
    │ • You'll be notified and must approve      │
    │ • Jane's contact info only shared if you   │
    │   approve and Jane accepts                 │
    │                                            │
    │ Default: OFF (more privacy)                │
    └────────────────────────────────────────────┘
    ```
    - Toggle: OFF by default (privacy-first)
    - Expandable info section explaining what it means
    - Clear that seeker has control

  - **Visibility Note** (info box, not editable here)
    ```
    🔒 Privacy Note:
    This reference will remain private until you add it to a bundle.
    Only you can see it after submission.
    You control what employers see.
    ```

- **Reminder Settings** (optional, advanced)

  - Collapsible section: [⚙ Advanced Settings]
  - When expanded:
    ```
    Automatic Reminders
    [ ] Send reminder if not started after 3 days
    [ ] Send reminder 2 days before deadline

    Custom reminder message (optional):
    ┌────────────────────────────────────┐
    │ Hi Jane, just a friendly reminder..│
    └────────────────────────────────────┘
    ```

- **Preview Section**

  - **Preview Button:** [👁 Preview Request]
  - Opens modal showing what referrer will see:
    ```
    ┌────────────────────────────────────┐
    │ Reference Request from John Seek   │
    │                                    │
    │ For: Senior Software Engineer      │
    │      TechCo (Jan 2021 - Dec 2023)  │
    │                                    │
    │ Questions: 6                       │
    │ Format: Video, Audio, or Text      │
    │ Due: Dec 25, 2024 (14 days)       │
    │ Time needed: ~4-6 minutes          │
    │                                    │
    │ [Accept & Start] [Decline]         │
    └────────────────────────────────────┘
    ```

- **Action Buttons**
  - Secondary: [← Back] → REQ-03
  - Primary: [Next: Review & Send →]
  - Disabled until: At least one format enabled, valid deadline

**Validation:**
- At least one format must be enabled
- Deadline must be:
  - In the future
  - At least 3 days from now (recommendation)
  - Not more than 90 days from now
- If deadline < 7 days: Warning "Short deadline may reduce response rate"
- If deadline > 60 days: Warning "Long deadline may cause delays"

**States:**
1. **Default:** All formats enabled, 14-day deadline
2. **Configuring:** User changing settings
3. **Valid:** Settings meet requirements
4. **Invalid:** Missing required settings (show errors)
5. **Preview open:** Modal showing request preview

**Format Recommendations:**
- Show recommendation based on relationship:
  - Manager: Video (most impactful)
  - Peer: Audio or Video
  - Client: Video or Text
- User can override

**Deadline Logic:**
- Default: 14 days from today
- Track response rates by deadline length
- Show recommendation: "Requests with 7-14 day deadlines have 80% completion rate"

**Back-Channel Explanation:**
- Tooltip/info icon with detailed explanation
- Show example flow:
  1. Employer views your bundle
  2. Employer requests back-channel contact
  3. You get notification, approve or decline
  4. If approved, Jane gets email asking if she'll talk
  5. If Jane agrees, employer gets contact info
- Privacy-preserving: Multi-step consent

**Navigation:**
- [Back] → REQ-03 (preserve settings)
- [Next] → REQ-05 (pass format & privacy settings)
- Auto-save settings to draft

**Accessibility:**
- Toggle switches keyboard accessible (Space to toggle)
- Date picker keyboard navigable
- Clear labels for screen readers
- Info sections expandable with Enter key

**Performance:**
- Smooth toggle animations
- Fast date picker rendering
- Preview modal loads instantly (client-side render)

**Analytics:**
- Track most common format combinations
- Track average deadline length
- Track back-channel toggle rate (ON vs OFF)
- Correlate settings with completion rates

**Notes:**
- Consider adding "Copy settings from previous request"
- Allow saving format preferences as default
- Plan for reference request templates (save all settings for reuse)
- Mobile: Stack format cards vertically, larger toggles

---

*[Continuing with remaining frames in next section...]*

---

## REQ-05 · New Reference · Delivery

**Purpose:** Configure delivery method and customize the invitation message before sending.

**Elements:**
- **Wizard Header**
  - Progress: Step 5 of 5
  - Progress bar: ████████████████████ (100%)
  - Breadcrumb: Choose Referrer → Context → Questions → Format → **Send**

- **Section Title:** "Review and send request"
- **Subtitle:** "Choose how to send the request to [Referrer Name]"

- **Delivery Methods**

  - **Email** (required, always on)
    ```
    ┌────────────────────────────────────┐
    │ ✉️  Email                          │
    │ ✓ Primary delivery method          │
    │                                    │
    │ To: jane.smith@techco.com          │
    │ Subject: Reference request from    │
    │         John Seek                  │
    │                                    │
    │ [✓] Send email notification        │
    └────────────────────────────────────┘
    ```
    - Email address shown (from REQ-01)
    - Subject line preview
    - Cannot be disabled (primary method)

  - **SMS** (optional)
    ```
    ┌────────────────────────────────────┐
    │ 📱 SMS (Optional)                  │
    │ [ ] Also send via text message     │
    │                                    │
    │ Phone number: [+1 (   )    -    ] │
    │ Country code selector              │
    │                                    │
    │ ℹ️  Increases response rate by 40% │
    └────────────────────────────────────┘
    ```
    - Checkbox to enable
    - Phone number input (if enabled)
    - Country code dropdown
    - E.164 format validation
    - Social proof messaging

  - **Shareable Link** (always available)
    ```
    ┌────────────────────────────────────┐
    │ 🔗 Shareable Link                  │
    │                                    │
    │ Get a link you can share anywhere  │
    │ (email, Slack, text, etc.)         │
    │                                    │
    │ [Generate Link]                    │
    │                                    │
    │ After sending, you'll get:         │
    │ https://deepref.com/r/abc123...    │
    └────────────────────────────────────┘
    ```
    - Link generated after sending
    - Can be copied and shared manually
    - Useful for sending via other channels

- **Custom Message** (optional but recommended)

  - Label: "Add a personal message"
  - Subtitle: "This will appear in the email/SMS to [Referrer Name]"

  - **Textarea:**
    ```
    ┌────────────────────────────────────┐
    │ Hi Jane,                           │
    │                                    │
    │ I hope you're doing well! I'm      │
    │ currently in the job search and    │
    │ would really appreciate a reference│
    │ from you about our time working    │
    │ together at TechCo.                │
    │                                    │
    │ Thanks so much!                    │
    │ John                               │
    └────────────────────────────────────┘
    ```
    - Placeholder: Default template message
    - Max length: 500 characters
    - Character counter: "247 / 500"
    - Editable

  - **Quick Templates** (optional shortcuts)
    ```
    Insert template:
    [Formal] [Casual] [Follow-up] [Urgent]
    ```
    - Clicking inserts pre-written message
    - User can edit after insertion

- **Request Summary** (read-only preview box)

  - **Review Card:**
    ```
    ┌────────────────────────────────────┐
    │ 📋 Request Summary                 │
    │                                    │
    │ Referrer: Jane Smith               │
    │ Email: jane.smith@techco.com       │
    │ Relationship: Manager              │
    │ Period: Jan 2021 - Dec 2023        │
    │                                    │
    │ Questions: 6                       │
    │ Format: Video, Audio, or Text      │
    │ Due: Dec 25, 2024 (14 days)       │
    │ Back-channel: OFF                  │
    │                                    │
    │ [Edit Any Step]                    │
    └────────────────────────────────────┘
    ```
    - Shows all key details from previous steps
    - [Edit] links next to each section → Jump back to that step
    - Helps user review before sending

- **Email Preview** (expandable)

  - Button: [👁 Preview Email]
  - Opens modal showing actual email that will be sent:
    ```
    ┌────────────────────────────────────┐
    │ From: John Seek via DeepRef        │
    │ To: jane.smith@techco.com          │
    │ Subject: Reference request from    │
    │          John Seek                 │
    │                                    │
    │ ──────────────────────────────────│
    │                                    │
    │ Hi Jane,                           │
    │                                    │
    │ [Custom message here...]           │
    │                                    │
    │ John has requested a reference     │
    │ for their time at TechCo as        │
    │ Senior Software Engineer.          │
    │                                    │
    │ This will take about 4-6 minutes.  │
    │ You can respond via video, audio,  │
    │ or text by Dec 25, 2024.           │
    │                                    │
    │ [Accept & Start] [Decline]         │
    │                                    │
    │ Questions? Learn more about DeepRef│
    └────────────────────────────────────┘
    ```
    - Shows exact email formatting
    - CTAs clearly visible
    - Professional design

- **Consent & Disclosures**

  - Checkbox: (required before sending)
    ```
    [✓] I confirm that:
        • I worked with Jane Smith at TechCo
        • I have permission to request this reference
        • The information provided is accurate
    ```
  - Link: [Terms of Use] [Privacy Policy]

- **Action Buttons**
  - Secondary: [← Back] → REQ-04
  - Secondary: [Save as Draft] → Saves to drafts, returns to dashboard
  - Primary: [Send Request] ✈️
  - Disabled until: Consent checked

**States:**
1. **Default:** Email enabled, custom message template shown
2. **Configuring:** User editing message, enabling SMS
3. **Previewing:** Email preview modal open
4. **Validating:** Checking phone number format, etc.
5. **Sending:** API call in progress, loading spinner
6. **Sent:** Success state (see REQ-06)
7. **Error:** Send failed, show error message

**Validation:**
- Email: Always required (pre-filled from REQ-01)
- SMS: If enabled, phone number required and valid
- Custom message: Optional, max 500 chars
- Consent: Must be checked to proceed

**SMS Validation:**
- Phone number format: E.164 (international standard)
- Country code: Dropdown with common countries at top
- Real-time formatting: (555) 123-4567 → +15551234567
- Validation: Check if number is mobile (not landline)
- Error states:
  - Invalid format: "Please enter a valid mobile number"
  - Landline detected: "This appears to be a landline. SMS may not work."

**Delivery Logic:**
- Primary: Email (always sent)
- Secondary: SMS (if enabled and phone valid)
- Link: Generated after sending, available in REQ-DETAIL

**Message Templates:**
- **Formal:**
  ```
  Dear [Name],

  I am currently seeking new opportunities and would greatly
  appreciate your support in providing a reference for our time
  working together at [Company].

  Thank you for considering this request.

  Best regards,
  [Your Name]
  ```

- **Casual:**
  ```
  Hey [Name]!

  Hope you're doing well! I'm job hunting and would love to get
  a reference from you about our time at [Company]. Would really
  appreciate it!

  Thanks!
  [Your Name]
  ```

- **Follow-up:**
  ```
  Hi [Name],

  Following up on my previous request. I know you're busy, but
  would really appreciate your reference when you get a chance.

  Thanks!
  [Your Name]
  ```

- **Urgent:**
  ```
  Hi [Name],

  I have an interview coming up soon and would really appreciate
  your reference ASAP if possible. Thanks so much for your help!

  [Your Name]
  ```

**Send Process:**
1. User clicks [Send Request]
2. Validate all data
3. Show loading spinner on button: "Sending..."
4. API call:
   - Create reference request record
   - Generate unique invite token
   - Send email via email service
   - If SMS enabled: Send SMS via SMS service
   - Generate shareable link
5. On success → Navigate to REQ-06 (Success)
6. On error → Show error message, allow retry

**Error Handling:**
- Email send failed: "Failed to send email. Please try again."
- SMS send failed: "Email sent, but SMS failed. You can resend later."
- Network error: "Network error. Please check your connection."
- Rate limit: "You've sent too many requests today. Try again tomorrow."
- Invalid referrer data: "Please go back and check the referrer's information."

**Draft Saving:**
- [Save as Draft] saves all data from all steps
- Stored in user's account
- Can be resumed later from dashboard
- Draft expires after 30 days

**Navigation:**
- [Back] → REQ-04 (preserve all data)
- [Send Request] → On success: REQ-06 (Success)
- [Save as Draft] → Dashboard with toast: "Request saved as draft"
- Jump to any previous step via [Edit] links in summary

**Post-Send Actions:**
- Create request record in database with status "pending"
- Generate unique token for invite link
- Queue email send job
- If SMS enabled, queue SMS send job
- Create timeline entry: "Request sent"
- Redirect to success page

**Accessibility:**
- Phone number input has clear formatting instructions
- Email preview modal keyboard accessible (Esc to close)
- Consent checkbox clearly labeled for screen readers
- Button loading states announced

**Performance:**
- Email preview rendered client-side (fast)
- Send action optimistic UI (show success immediately, handle failures gracefully)
- Auto-save draft every 30 seconds while editing message

**Analytics:**
- Track SMS usage rate
- Track custom message usage (vs default)
- Track template selection frequency
- Measure send success rate
- Correlate delivery method with response rate

**Security:**
- Rate limiting: Max 10 requests per day per user
- Validate email deliverability before sending
- Encrypt invite tokens
- Audit log of all sends

**Notes:**
- Consider adding scheduling: "Send on [Date]"
- Allow attaching files to the request message
- Plan for bulk sending (multiple requests at once)
- Mobile: Larger buttons, simplified preview

---

## REQ-06 · Request Sent (Success)

**Purpose:** Confirm successful sending of reference request and provide next steps.

**Elements:**
- **Success Animation** (optional)
  - Brief animation: Checkmark or paper airplane
  - Duration: 1-2 seconds

- **Success Card** (centered, prominent)
  ```
  ┌────────────────────────────────────┐
  │         ✓ Request Sent!            │
  │                                    │
  │ Your reference request was sent to:│
  │                                    │
  │ Jane Smith                         │
  │ jane.smith@techco.com              │
  │                                    │
  │ ✓ Email sent                       │
  │ ✓ SMS sent                         │
  │                                    │
  │ We'll notify you when Jane:        │
  │ • Opens the request                │
  │ • Starts responding                │
  │ • Submits the reference            │
  └────────────────────────────────────┘
  ```

  - Large checkmark icon (green)
  - Confirmation message
  - Referrer details
  - Delivery method confirmations (✓ marks)
  - What happens next

- **Shareable Link Section** (if applicable)
  ```
  ┌────────────────────────────────────┐
  │ 🔗 Shareable Link                  │
  │                                    │
  │ Copy this link to share via Slack, │
  │ text, or other channels:           │
  │                                    │
  │ https://deepref.com/r/abc123def    │
  │ [Copy Link] [Send via...]          │
  │                                    │
  │ This link is unique to this        │
  │ request and expires on Dec 25.     │
  └────────────────────────────────────┘
  ```
  - Display unique link
  - Copy button with clipboard feedback
  - Optional: Share via other channels (Slack, WhatsApp, etc.)
  - Expiry information

- **What's Next** (information section)
  ```
  💡 What happens next:

  1. Jane receives your request via email/SMS
  2. Jane verifies their identity (email + phone)
  3. Jane records their reference (4-6 minutes)
  4. You receive notification when submitted
  5. Reference appears in your Library

  Typical response time: 2-3 days
  Due date: Dec 25, 2024 (14 days)
  ```

- **Quick Actions**

  - Primary Actions (buttons):
    - [Go to Request Details] → REQ-DETAIL (view this request)
    - [Back to Dashboard] → SEEK-HOME
    - [Send Another Request] → REQ-01 (new request)

  - Secondary Actions (links):
    - [Edit this request] → REQ-01 (pre-filled)
    - [Send reminder] (if not opened after 3 days)

- **Helpful Tips** (collapsible, optional)
  ```
  💡 Tips for better responses:

  • Follow up personally: A quick text or call increases response rate by 40%
  • Be patient: Most people complete within 2-3 days
  • Send reminder after 5 days if not started
  • Offer to help: Let them know you're available for questions
  ```

- **Related Actions** (card layout)
  ```
  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │ Request from   │  │ Create Bundle  │  │ View Library   │
  │ Another Person │  │                │  │                │
  │ [+ New]        │  │ [Bundle Now]   │  │ [View All]     │
  └────────────────┘  └────────────────┘  └────────────────┘
  ```

**States:**
1. **Success:** Request sent successfully
2. **Partial success:** Email sent, SMS failed (show warning)
3. **Delayed:** Request queued, will send soon

**Partial Success Handling:**
- If email sent but SMS failed:
  ```
  ⚠️ Email sent, but SMS delivery failed

  Jane Smith will still receive the email.
  You can resend the SMS from request details.

  [Resend SMS] [Continue Anyway]
  ```

**Link Copy Interaction:**
- Click [Copy Link]
- Button text changes: "Copied!" ✓
- Clipboard populated
- After 2 seconds, button text reverts
- Toast notification: "Link copied to clipboard"

**Notifications Setup:**
- Automatically opt user into notifications for this request:
  - Email: When opened, started, submitted, declined
  - In-app: Real-time notifications
  - SMS: (optional) Critical updates only

**Analytics Tracking:**
- Track which CTAs users click most
- Measure time spent on success page
- Track shareable link usage
- Measure follow-up action rate

**Navigation:**
- [Go to Request Details] → REQ-DETAIL (pass request ID)
- [Back to Dashboard] → SEEK-HOME
- [Send Another Request] → REQ-01 (clean slate)
- Auto-redirect: After 30 seconds of inactivity → Dashboard

**Background Processing:**
- Email delivery confirmation polling
- SMS delivery status check
- Update request status in real-time
- If delivery fails after page load → In-app notification

**Next Steps Setup:**
- Create timeline entry: "Request sent"
- Set reminder schedules:
  - After 3 days: Suggest sending reminder
  - After 7 days: Auto-send reminder (if enabled in settings)
  - 2 days before due date: Urgency reminder
- Initialize analytics tracking for this request

**Accessibility:**
- Success announced by screen reader
- Copy button accessible via keyboard
- Clear focus states on action buttons

**Performance:**
- Instant page load (no API calls needed, use data from previous step)
- Background: Confirm delivery status
- Optimistic UI: Assume success, handle failures gracefully

**Mobile Considerations:**
- Share link via native share sheet on mobile
- Larger buttons for primary actions
- Stack cards vertically

**Notes:**
- Consider adding "Invite more people" bulk flow
- Track success page abandonment rate
- A/B test different CTA copy
- Consider gamification: "You've sent 5 requests! 🎉"

---

## REQ-DETAIL · Request Detail (Timeline & Actions)

**Purpose:** View detailed status, timeline, and actions for a specific reference request.

**Elements:**
- **Header:** Standard app header
- **Left Sidebar:** Seeker navigation (Requests active)

- **Breadcrumb:**
  - Requests › [Referrer Name]

- **Main Content**

  ### Header Section

  - **Referrer Card** (prominent, top)
    ```
    ┌────────────────────────────────────────────┐
    │ Jane Smith                       [Status]  │
    │ jane.smith@techco.com            SUBMITTED │
    │ Engineering Manager @ TechCo               │
    │ Manager • Jan 2021 - Dec 2023              │
    │                                            │
    │ ✓ Email verified  ✓ Phone verified        │
    │ [Contact] [View Reference] [⋮ More]        │
    └────────────────────────────────────────────┘
    ```

    - Referrer name (large, bold)
    - Email address
    - Company + role
    - Relationship + dates
    - Verification badges
    - Quick actions:
      - [Contact]: Send message or view share link
      - [View Reference]: If submitted, opens reference viewer
      - [⋮ More]: Dropdown menu

  - **Status Chip** (color-coded, top right)
    - Statuses:
      - 🔵 **Sent:** Delivered but not opened
      - 🟡 **Opened:** Viewed but not started
      - 🟠 **Started:** In progress
      - 🟢 **Submitted:** Complete
      - 🔴 **Declined:** Referrer declined
      - ⚫ **Expired:** Deadline passed
      - 🟣 **Revoked:** You canceled it

  ### RCS Score (if submitted)

  - **RCS Badge** (prominent, next to status)
    ```
    ┌──────────┐
    │   [92]   │
    │   HIGH   │
    │  ●●●○    │
    └──────────┘
    ```
    - Shows score and band
    - Tooltip: Breakdown of score
    - Link: "View detailed breakdown"

  ### Timeline Section

  - **Title:** "Request Timeline"

  - **Visual Timeline** (horizontal or vertical)
    ```
    Sent           Opened        Started       Submitted
     ●━━━━━━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━━━━━━●
    Dec 1          Dec 3         Dec 5         Dec 8
    10:30 AM       2:45 PM       9:12 AM       4:23 PM

    ✓ Request sent via email & SMS
    ✓ Jane opened the request
    ✓ Jane started recording
    ✓ Jane submitted reference
    ```

    - Timeline dots connected with lines
    - Completed steps: Filled dots, green
    - Current step: Pulsing dot
    - Future steps: Empty dots, gray
    - Each step shows:
      - Date + time
      - Description
      - Additional context (e.g., "via email")

  - **Detailed Activity Log** (expandable, below timeline)
    ```
    [Show detailed activity ▼]

    Dec 8, 2024 at 4:23 PM
    ✓ Jane submitted video reference (2:14)

    Dec 5, 2024 at 9:12 AM
    • Jane started responding (Question 1 of 6)

    Dec 3, 2024 at 2:45 PM
    • Jane opened request via email

    Dec 1, 2024 at 10:30 AM
    • Request sent to jane.smith@techco.com
    • Email delivered successfully
    • SMS delivered successfully
    ```
    - Reverse chronological order
    - Icons for each event type
    - Timestamps
    - Contextual details

  ### Request Details Section

  - **Collapsible Sections:**

    1. **Questions Asked** (expandable)
       ```
       [Questions (6) ▼]

       1. Describe John's leadership style and how he motivated the team
       2. What was John's biggest achievement while under your supervision?
       3. Rate John's technical skills and provide specific examples
       4. How effectively did John communicate with team members?
       5. How did John respond to feedback and coaching?
       6. Would you hire John again? Why or why not?
       ```

    2. **Request Settings** (expandable)
       ```
       [Settings ▼]

       Response format: Video, Audio, or Text
       Due date: Dec 25, 2024 (17 days remaining)
       Back-channel: OFF
       Reminders: Enabled

       [Edit Settings]
       ```

    3. **Context Provided** (expandable)
       ```
       [Context ▼]

       Your role: Senior Software Engineer
       Period: Jan 2021 - Dec 2023 (2 years 11 months)
       Team: Platform Team

       Your note to referrer:
       "Hi Jane, I hope you're doing well!..."
       ```

  ### Actions Section (sticky or prominent)

  - **Primary Actions** (buttons)
    - If **not started yet:**
      - [Send Reminder]
      - [Resend Invitation]
      - [Edit Request]
      - [Revoke Request]

    - If **in progress:**
      - [Send Encouragement]
      - [Extend Deadline]
      - [Revoke Request]

    - If **submitted:**
      - [View Reference]
      - [Add to Bundle]
      - [Request Changes]
      - [Download]

    - If **declined:**
      - [Request from Someone Else]
      - [Archive]

  - **Secondary Actions** (dropdown menu ⋮)
    - Copy invite link
    - Download as PDF
    - View email sent
    - Contact referrer
    - Report issue
    - Delete request

  ### Reference Preview (if submitted)

  - **Preview Card**
    ```
    ┌────────────────────────────────────┐
    │ 🎥 Video Reference                 │
    │ Duration: 2:14                     │
    │ Submitted: Dec 8, 2024             │
    │                                    │
    │ [▶ Play Preview]                   │
    │                                    │
    │ Transcript available               │
    │ 6 questions answered               │
    │                                    │
    │ [View Full Reference →]            │
    └────────────────────────────────────┘
    ```
    - Format indicator (video/audio/text)
    - Duration/word count
    - Submission date
    - Preview player or excerpt
    - Link to full reference viewer

  ### Reminders & Notifications

  - **Reminder Status** (if applicable)
    ```
    ⏱ Next reminder scheduled for Dec 4, 2024

    [Cancel Reminder] [Send Now] [Edit Schedule]
    ```

  - **Needs Attention Banner** (if action required)
    ```
    ⚠️ Opened 5 days ago but not started

    Jane may need a reminder or help getting started.
    [Send Reminder] [Contact Jane] [Extend Deadline]
    ```

  ### Reach-Back Requests (if any)

  - **Back-Channel Section** (if employer requested)
    ```
    ┌────────────────────────────────────┐
    │ 📞 Employer Verification Request   │
    │                                    │
    │ Google HR wants to contact Jane    │
    │ directly for back-channel          │
    │ verification.                      │
    │                                    │
    │ Status: Pending your approval      │
    │                                    │
    │ [Approve] [Decline] [Learn More]   │
    └────────────────────────────────────┘
    ```
    - Shows pending requests
    - Employer name
    - Approval actions
    - Status tracking

**States:**
1. **Sent (not opened):** Timeline shows sent only
2. **Opened:** Timeline shows sent + opened
3. **Started:** Timeline shows progress
4. **Submitted:** Complete timeline + reference preview
5. **Declined:** Timeline shows decline event
6. **Expired:** Timeline shows expiry, suggest extend or resend
7. **Revoked:** Timeline shows revocation

**Status-Specific Content:**

### If Not Started (After 3+ Days):
- Show prominent reminder button
- Display: "Opened 5 days ago but hasn't started"
- Suggest actions:
  - Send friendly reminder
  - Personal follow-up via phone/text
  - Extend deadline

### If In Progress:
- Show progress indicator: "Question 3 of 6 answered"
- Estimate: "Should be done in ~10 minutes"
- No nagging (don't interrupt flow)

### If Declined:
- Show decline reason (if provided by referrer)
- Suggestions:
  - Request from someone else
  - Reach out personally to understand why
- Remove from active requests

### If Expired:
- Clear expiry message: "Deadline passed on Dec 25"
- Options:
  - Extend deadline and resend
  - Request from someone else
  - Archive

### If Submitted:
- Highlight RCS score
- Quick actions: Add to bundle, view reference
- Show submission details (format, duration, etc.)

**Reminder Functionality:**
- **Send Reminder Button:**
  - Click → Opens modal:
    ```
    ┌────────────────────────────────────┐
    │ Send Reminder to Jane Smith        │
    │                                    │
    │ Template message:                  │
    │ ┌────────────────────────────────┐ │
    │ │ Hi Jane, just a friendly       │ │
    │ │ reminder about the reference   │ │
    │ │ request. No rush, but wanted   │ │
    │ │ to check in!                   │ │
    │ └────────────────────────────────┘ │
    │ Character count: 87 / 500          │
    │                                    │
    │ Send via: [✓ Email] [✓ SMS]        │
    │                                    │
    │ [Cancel] [Send Reminder]           │
    └────────────────────────────────────┘
    ```
  - Editable message
  - Choose delivery method
  - Rate limit: Max 3 reminders per request

**Edit Request:**
- If not started → Allow editing:
  - Questions
  - Deadline
  - Custom message
  - Format options
- If started → Can't edit questions, but can extend deadline

**Revoke Request:**
- Confirmation dialog:
  ```
  ⚠️ Revoke this request?

  This will cancel the request and notify Jane.
  This action cannot be undone.

  Reason (optional):
  [Textarea]

  [Cancel] [Revoke Request]
  ```
- Sends notification to referrer
- Marks request as revoked
- Removes from active requests

**Download Options:**
- If submitted:
  - Download reference video/audio file
  - Download transcript (PDF, TXT)
  - Download full request details (PDF report)

**Navigation:**
- [View Reference] → Opens reference viewer (modal or page)
- [Add to Bundle] → BUNDLE-01 (pre-selected this reference)
- [Edit Request] → REQ-01 (pre-filled, limited edits)
- Breadcrumb → Back to requests list
- Sidebar → Other sections

**Real-Time Updates:**
- WebSocket connection for live status updates
- When referrer opens/starts/submits → Update page instantly
- Toast notification: "Jane just opened your request!"

**Analytics:**
- Track time to completion
- Track reminder effectiveness
- Track action usage (which buttons clicked most)
- Correlate reminder frequency with completion rate

**Accessibility:**
- Timeline keyboard navigable
- Status changes announced by screen reader
- All actions have clear labels and shortcuts
- High contrast mode support

**Performance:**
- Lazy load activity log (expand on demand)
- Cache timeline data
- Real-time updates via WebSocket (fallback to polling)
- Optimistic UI for actions (show result immediately)

**Security:**
- Only seeker can view this page
- Referrer contact info protected
- Audit log of all actions

**Notes:**
- Consider adding comparison: "Jane responded faster than 80% of referrers"
- Show map if referrer in different timezone
- Plan for reference versioning (if referrer edits)
- Mobile: Simplified timeline, larger action buttons

---

## LIB-01 · References Library

**Purpose:** Browse, filter, and manage all completed references.

**Elements:**
- **Header:** Standard app header
- **Left Sidebar:** Seeker navigation (Library active)

- **Main Content**

  ### Page Header
  - **Title:** "References Library"
  - **Subtitle:** "All your completed references in one place"
  - **Stats Summary:**
    ```
    97 References  •  Avg RCS: 87 (High)  •  45 in Bundles
    ```

  ### Filters & Search Bar (top)

  - **Search Bar** (prominent, left)
    - Placeholder: "Search by referrer name, company, or keyword..."
    - Icon: 🔍
    - Real-time search results
    - Searches: Name, company, content, transcript

  - **Filter Panel** (expandable, right side or sidebar)
    ```
    [Filters ▾]

    Company
    [ ] TechCo (23)
    [ ] CorporateMail (15)
    [ ] StartupAI (8)
    [Show all...]

    Date Range
    ( ) Last 30 days
    ( ) Last 3 months
    ( ) Last year
    ( ) All time (default)
    ( ) Custom range → Date picker

    Format
    [ ] Video (45)
    [ ] Audio (32)
    [ ] Text (20)

    RCS Band
    [ ] High (80-100) - 67 refs
    [ ] Medium (50-79) - 25 refs
    [ ] Low (0-49) - 5 refs

    Status
    [ ] In bundles (45)
    [ ] Not bundled (52)
    [ ] Retracted (0)

    Relationship
    [ ] Manager (34)
    [ ] Peer (28)
    [ ] Client (22)
    [ ] Direct Report (13)

    [Clear All Filters]
    ```

  ### View Options
  - Toggle: [Grid View] [List View]
  - Sort dropdown:
    - Most Recent (default)
    - Highest RCS
    - Oldest First
    - Company A-Z
    - Referrer A-Z

  ### Bulk Actions Bar (appears when items selected)
  ```
  [✓] 3 selected
  [Add to Bundle] [Download All] [Archive] [Deselect All]
  ```

  ### References Grid/List

  #### Grid View (default)
  ```
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ [✓] 🎥           │  │ [✓] 🎙           │  │ [ ] ✏️           │
  │ Jane Smith       │  │ Mac Developer    │  │ Sarah Chen       │
  │ TechCo          │  │ CorporateMail   │  │ StartupAI       │
  │ Manager         │  │ Peer            │  │ Client          │
  │                 │  │                 │  │                 │
  │ Video • 2:14    │  │ Audio • 3:45    │  │ Text • 487 words│
  │ [92] HIGH       │  │ [85] HIGH       │  │ [88] HIGH       │
  │ 2 days ago      │  │ 1 week ago      │  │ 2 weeks ago     │
  │                 │  │                 │  │                 │
  │ [View] [Bundle] │  │ [View] [Bundle] │  │ [View] [Bundle] │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
  ```

  - Each card shows:
    - Checkbox for bulk selection
    - Format icon (🎥/🎙/✏️)
    - Referrer name
    - Company
    - Relationship type
    - Duration/word count
    - RCS badge (color-coded)
    - Relative date
    - Quick actions
    - Hover state: Shows more details

  #### List View
  ```
  Table Layout:
  ┌────────────────────────────────────────────────────────────────────┐
  │ [✓] │ Referrer        │ Company    │ Type    │ Format │ RCS  │ Date    │ Actions │
  ├─────┼─────────────────┼────────────┼─────────┼────────┼──────┼─────────┼─────────┤
  │ [✓] │ Jane Smith      │ TechCo     │ Manager │ 🎥 2:14│ [92] │ 2d ago  │ [⋮]     │
  │ [✓] │ Mac Developer   │ CorporateM │ Peer    │ 🎙 3:45│ [85] │ 1w ago  │ [⋮]     │
  │ [ ] │ Sarah Chen      │ StartupAI  │ Client  │ ✏️ 487w│ [88] │ 2w ago  │ [⋮]     │
  └────────────────────────────────────────────────────────────────────┘
  ```

  - Sortable columns
  - Hover row: Highlight
  - Click row: Opens detail modal or navigates to detail page
  - Actions menu [⋮]: View, Add to Bundle, Download, Archive, Delete

  ### Reference Detail (Modal or Side Panel)

  When clicking [View] or a reference card:

  ```
  ┌──────────────────────────────────────────────────┐
  │  [← Back to Library]                      [× Close] │
  ├──────────────────────────────────────────────────┤
  │  Jane Smith - Engineering Manager @ TechCo       │
  │  [92] HIGH  •  Video  •  2:14  •  Dec 8, 2024   │
  │  ✓ Email verified  ✓ Phone verified             │
  ├──────────────────────────────────────────────────┤
  │                                                  │
  │  🎥 Video Player                                 │
  │  ┌──────────────────────────────────────────┐   │
  │  │                                          │   │
  │  │        [▶ Play Video]                   │   │
  │  │        Thumbnail preview                │   │
  │  │                                          │   │
  │  └──────────────────────────────────────────┘   │
  │  [─────────●─────────] 0:45 / 2:14              │
  │  [▶ Pause] [🔊 Volume] [⚙ Settings] [⛶ Fullscreen]│
  │                                                  │
  │  ─── Transcript ───────────────────────────────  │
  │  Q1: Describe John's leadership style            │
  │  [0:03] "John was an exceptional leader who..."  │
  │                                                  │
  │  Q2: What was John's biggest achievement?        │
  │  [0:45] "The database migration project was..."  │
  │                                                  │
  │  [Show all 6 questions ▼]                        │
  │                                                  │
  │  ─── RCS Breakdown ────────────────────────────  │
  │  Identity & Tenure:     ████████████ 90%        │
  │  Content Consistency:   █████████████ 92%       │
  │  Provenance:            ████████░░░ 79%         │
  │  [Learn more about RCS]                          │
  │                                                  │
  │  ─── Metadata ─────────────────────────────────  │
  │  Submitted: Dec 8, 2024 at 4:23 PM              │
  │  Request sent: Dec 1, 2024                      │
  │  Response time: 7 days                          │
  │  In bundles: 2 (Senior Dev Bundle, Google App)  │
  │                                                  │
  │  ─── Actions ──────────────────────────────────  │
  │  [Add to Bundle]  [Download]  [Share Link]      │
  │  [Request Update]  [Archive]  [Delete]          │
  └──────────────────────────────────────────────────┘
  ```

  ### Empty State (if no references)
  ```
  ┌────────────────────────────────────┐
  │         📚                         │
  │                                    │
  │   No references yet                │
  │                                    │
  │   Start by requesting references   │
  │   from people you've worked with   │
  │                                    │
  │   [+ Request Reference]            │
  └────────────────────────────────────┘
  ```

  ### Filtered Empty State
  ```
  No references match your filters

  Try adjusting your filters or search

  [Clear All Filters]
  ```

**Validation:** N/A (read-only display)

**States:**
1. **Loading:** Skeleton cards/rows
2. **Loaded:** References displayed
3. **Filtering:** Update results in real-time
4. **Searching:** Debounced search, highlight matches
5. **Selected:** Bulk selection active
6. **Empty:** No references or no matches

**Interactions:**
- Click card/row → Open detail view
- Checkbox → Select for bulk actions
- [View] → Open detail modal
- [Bundle] → Pre-select for BUNDLE-01
- Hover → Show tooltip with more info
- Drag (optional) → Reorder or drag to bundle area

**Bulk Actions:**
- Add to bundle → Opens BUNDLE-01 with selected refs
- Download all → ZIP file with all selected media + transcripts
- Archive → Move to archived (hidden from default view)
- Delete → Confirmation dialog, permanent deletion

**Navigation:**
- [+ Request Reference] → REQ-01
- [Add to Bundle] → BUNDLE-01
- Click reference → Detail modal
- Sidebar → Other sections

**Performance:**
- Lazy load: Load 20 refs at a time, infinite scroll
- Thumbnail generation: Low-res previews for fast loading
- Search: Debounced (300ms), indexed backend search
- Filters: Client-side if < 100 refs, server-side if more

**Accessibility:**
- Grid/list toggle keyboard accessible
- Filters keyboard navigable
- Screen reader announces filter changes
- High contrast mode for RCS badges

**Analytics:**
- Track which filters used most
- Track search queries
- Track bulk action usage
- Measure time to find reference

**Notes:**
- Consider tags/labels for custom organization
- Plan for "Recently viewed" section
- Add "Similar references" suggestions
- Mobile: List view only, simplified filters

---

## BUNDLE-01 · Create Bundle (Already in Flows)

*Covered in Flow 5 - see User Flows document*

---

## BUNDLE-02 · Bundle Settings (Already in Flows)

*Covered in Flow 5 - see User Flows document*

---

## BUNDLE-READY · Bundle Link Ready (Already in Flows)

*Covered in Flow 5 - see User Flows document*

---

## SEEK-PREVIEW · Bundle Viewer (Seeker Preview)

**Purpose:** Allow seeker to preview their bundle exactly as employers will see it.

**Elements:**
- **Header:** Standard app header
- **Left Sidebar:** Seeker navigation (Bundles active)

- **Mode Toggle** (top right)
  ```
  [👁 Preview Mode] ←→ [✏️ Edit Mode]
  ```
  - Preview Mode: Read-only, employer view
  - Edit Mode: Go back to BUNDLE-02

- **Main Content** (identical to EMP-VIEW but with banner)

  ### Seeker Banner (top, dismissable)
  ```
  ℹ️ This is how employers see your bundle
     [Edit Bundle] [Share Link] [Dismiss]
  ```

  ### Candidate Header
  ```
  ┌────────────────────────────────────────────┐
  │  👤 [Your Photo]                           │
  │  John Seek                       [87] HIGH │
  │  Senior Software Engineer                  │
  │  ✓ Identity Verified  ✓ 12 Years Exp      │
  └────────────────────────────────────────────┘
  ```

  ### Aggregated RCS
  ```
  ┌────────────────────────────────────────┐
  │   REFERENCE CONFIDENCE SCORE           │
  │              [87]                      │
  │              HIGH                      │
  │             ●●●○                       │
  │   Based on 5 verified references       │
  │   [Why this score? ℹ️]                 │
  └────────────────────────────────────────┘
  ```

  ### References List
  - Same layout as EMP-VIEW
  - Video/audio players functional
  - Transcripts visible
  - RCS badges per reference

  ### Differences from EMP-VIEW:
  - Top banner: "This is preview mode"
  - Can't request back-channel (seeker preview)
  - Shows [Edit] button instead of employer actions
  - Views/analytics not counted

**Actions:**
- [Edit Bundle] → BUNDLE-02
- [Share Link] → Copy link modal
- [Exit Preview] → BUNDLE-READY or dashboard

**Navigation:**
- [Back] → BUNDLE-READY
- Sidebar → Other sections

**Notes:**
- Exact replica of employer experience
- Helps seeker verify before sharing
- Shows what employers will see
- No analytics tracking in preview mode

---

## SET-SEEK · Seeker Settings

**Purpose:** Manage seeker account settings, preferences, and data.

**Elements:**
- **Header:** Standard app header
- **Left Sidebar:** Seeker navigation (Settings active)

- **Secondary Navigation** (tabs or sidebar within settings)
  ```
  Settings
    › Profile
    › Verification
    › Notifications
    › Privacy & Data
    › Billing (if applicable)
    › Connected Apps
  ```

- **Main Content** (changes based on selected section)

  ### Profile Section

  ```
  Profile Settings

  Avatar
  ┌────────────┐
  │   Photo    │  [Change Photo] [Remove]
  └────────────┘

  Basic Information
  First name     [John               ]
  Last name      [Seek               ]
  Headline       [Senior Software Eng]
                 87 / 120 characters

  Contact
  Primary email  john@example.com (verified ✓)
  Alt. email     [personal@email.com ]
  Phone          +1 (555) 123-4567 (verified ✓)
                 [Change]

  Professional
  LinkedIn       [linkedin.com/in/john] (connected ✓)
  Resume         resume.pdf (2.3 MB) [Replace] [Download]
  Portfolio      [https://johnseek.com]

  [Save Changes]  [Cancel]
  ```

  ### Verification Section

  ```
  Identity Verification

  Status: ✓ Verified
  Verified on: Dec 1, 2024

  Documents
  • ID: Driver's License (verified ✓)
  • Selfie: Liveness check passed ✓

  RCS Impact: +40 points

  [View Verification Details]
  [Update Documents] (for re-verification)

  ───────────────────────────────────

  LinkedIn Verification
  Status: ✓ Connected
  Connected: Dec 1, 2024
  Last synced: 2 hours ago

  [Disconnect] [Sync Now]

  ───────────────────────────────────

  Phone Verification
  Status: ✓ Verified
  Number: +1 (555) 123-4567
  Verified: Dec 1, 2024

  [Change Number]
  ```

  ### Notifications Section

  ```
  Notification Preferences

  Email Notifications
  [✓] Reference submitted
  [✓] Reference opened
  [✓] Reference declined
  [✓] Bundle viewed
  [✓] Back-channel requests
  [ ] Weekly summary
  [ ] Marketing emails

  In-App Notifications
  [✓] Real-time alerts
  [✓] Desktop notifications (requires permission)

  SMS Notifications
  [ ] Enable SMS alerts
      Only for critical updates (limited)
      Standard messaging rates apply

  [Save Preferences]
  ```

  ### Privacy & Data Section

  ```
  Privacy & Data

  Data Visibility
  [ ] Make my profile public
      (Allow employers to find me)

  [✓] Allow anonymous analytics
      (Help improve DeepRef)

  Back-Channel Default
  ( ) Always allow employer contact
  ( ) Always require my approval (default)
  ( ) Never allow

  ───────────────────────────────────

  Data Export
  Download all your data in JSON format

  [Request Data Export]
  (Takes up to 48 hours)

  ───────────────────────────────────

  Data Deletion
  ⚠️ Delete your account and all data

  This action:
  • Deletes all references
  • Cancels active requests
  • Removes bundles
  • Cannot be undone

  [Request Account Deletion]
  ```

  ### Billing Section (if applicable)

  ```
  Billing & Subscription

  Current Plan: Pro
  $29/month • Renews Jan 15, 2025

  Features:
  • Unlimited reference requests
  • Unlimited bundles
  • Advanced analytics
  • Priority support

  [Change Plan] [View Invoices]

  ───────────────────────────────────

  Payment Method
  💳 Visa ending in 4242
  Expires: 12/2025

  [Update Card] [Remove]

  ───────────────────────────────────

  Billing History
  Jan 1, 2025    $29.00  [Invoice ↓]
  Dec 1, 2024    $29.00  [Invoice ↓]
  Nov 1, 2024    $29.00  [Invoice ↓]

  [View All]
  ```

  ### Connected Apps Section

  ```
  Connected Apps & Integrations

  LinkedIn
  ✓ Connected
  Last synced: 2 hours ago
  Permissions: Read profile, work history

  [Disconnect]

  ───────────────────────────────────

  Google Workspace
  Not connected

  Import contacts for easier reference requests

  [Connect Google]

  ───────────────────────────────────

  Slack (Coming Soon)
  Get notifications in Slack

  [Join Waitlist]

  ───────────────────────────────────

  ATS Integrations
  • Greenhouse
  • Lever
  • Workday

  [View Integrations]
  ```

**Validation:**
- Email format
- Phone E.164 format
- URL validation for links
- File size limits for uploads

**States:**
1. **Viewing:** Settings displayed
2. **Editing:** Form fields active
3. **Saving:** API call in progress
4. **Saved:** Success message
5. **Error:** Field-level errors

**Actions:**
- [Save Changes] → Update profile/settings
- [Cancel] → Revert unsaved changes
- [Request Data Export] → Queue export job
- [Request Account Deletion] → Confirmation flow
- [Change Photo] → File picker modal
- [Update Documents] → Return to ID-SEEK-01

**Navigation:**
- Secondary nav → Switch settings sections
- [Back] → Dashboard
- Sidebar → Other main sections

**Security:**
- Password confirmation for sensitive changes
- 2FA for account deletion
- Audit log of all settings changes

**Performance:**
- Auto-save drafts (profile section)
- Instant validation feedback
- Optimistic UI for saves

**Accessibility:**
- Form labels clear
- Error messages announced
- Keyboard navigation
- Focus management

**Notes:**
- Consider adding "Account Activity" section
- Plan for "Security" section (password change, 2FA)
- Add "Help & Support" section
- Mobile: Accordion layout for sections

---

# REFERRER FRAMES

## REF-MANAGE · Referrer Dashboard

**Purpose:** Dashboard for referrers to view and manage their submitted references.

**Elements:**
- **Header:** Standard app header
- **Left Sidebar:** Referrer navigation

  ```
  Profile
  References
  Employers (if they've submitted multiple)
  Settings
  Sign Out
  ```

- **Main Content**

  ### Header Section
  ```
  ┌────────────────────────────────────────┐
  │  👤 [Avatar]                           │
  │  Jane Smith                            │
  │  Engineering Manager                   │
  │  ✓ Email verified  ✓ Phone verified   │
  │  ✓ LinkedIn connected                  │
  └────────────────────────────────────────┘
  ```

  ### Stats Overview
  ```
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │    137      │  │    137      │  │     10      │  │     2       │
  │  Received   │  │  Submitted  │  │  Declined   │  │   Drafted   │
  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
  ```

  ### Pending Requests (if any)
  ```
  ⚠️ You have 2 pending reference requests

  ┌────────────────────────────────────────────────┐
  │ John Seek                                      │
  │ Senior Software Engineer @ TechCo              │
  │ Requested: 3 days ago  •  Due: 11 days        │
  │ [Respond Now] [Decline]                        │
  └────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────┐
  │ Sarah Developer                                │
  │ Full Stack Engineer @ StartupXYZ              │
  │ Requested: 1 week ago  •  Due: 7 days         │
  │ [Respond Now] [Decline]                        │
  └────────────────────────────────────────────────┘
  ```

  ### Submitted References
  ```
  Your References

  [Sort: Most Recent ▾]  [Filter: All Status ▾]

  Table View:
  ┌──────────────────────────────────────────────────────────────┐
  │ For              │ Company    │ Format │ Status    │ Date      │ Actions │
  ├──────────────────┼────────────┼────────┼───────────┼───────────┼─────────┤
  │ John Seek        │ TechCo     │ 🎥 Video│ Submitted │ Dec 8     │ [⋮]     │
  │ Sarah Developer  │ StartupXYZ │ 🎙 Audio│ In draft  │ Dec 5     │ [⋮]     │
  │ Mike Manager     │ Corp Inc   │ ✏️ Text │ Submitted │ Nov 30    │ [⋮]     │
  └──────────────────────────────────────────────────────────────┘
  ```

  - Actions menu [⋮]:
    - View Reference
    - Edit (if within edit window)
    - Request Retraction
    - Download
    - Contact Person

  ### Your Impact (gamification)
  ```
  💫 Your Impact

  • You've helped 137 people with references
  • Avg response time: 2.3 days (faster than 78% of referrers)
  • Avg reference quality: 89/100 (excellent!)
  • 🏆 Top Referrer Badge earned

  [View Detailed Stats]
  ```

  ### Empty State (first-time referrer)
  ```
  Welcome to DeepRef!

  You haven't submitted any references yet.

  When people request references from you, they'll
  appear here.

  [Learn How It Works]
  ```

**Navigation:**
- [Respond Now] → RESP-MODE (for that request)
- [View Reference] → Reference detail view
- Sidebar → Profile, Settings, etc.

**States:**
1. **Empty:** No references yet
2. **Pending requests:** Show pending section
3. **Active:** References displayed
4. **Loading:** Skeleton UI

**Notes:**
- Encourage referrers with positive feedback
- Show their verification status prominently
- Track their responsiveness and quality
- Mobile: Simplified list view

---

# EMPLOYER FRAMES

## EMP-VIEW · Employer Viewer (Already covered in Flows)

*See Flow 9 - Complete employer bundle viewing experience*

---

## EMP-VERIFY-EMAIL · Employer Email Verification (Already covered in Flows)

*See Flow 9 - Email OTP verification for employers*

---

## EMP-RB-ASK · Back-Channel Request (Already covered in Flows)

*See Flow 9 - Request to contact referrer directly*

---

## EMP-RB-SENT · Back-Channel Status (Already covered in Flows)

*See Flow 9 - Status tracking for back-channel request*

---

# ADMIN FRAMES

## ADM-VERIFY · Verification Queue

**Purpose:** Admin interface to review and approve identity verifications.

**Elements:**
- **Header:** Admin header with elevated permissions indicator
- **Left Sidebar:** Admin navigation

  ```
  Verification Queue
  Disputes
  Audit Logs
  Users
  Analytics
  Settings
  ```

- **Main Content**

  ### Queue Stats
  ```
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │     23      │  │    156      │  │     2       │
  │  Pending    │  │  Approved   │  │  Rejected   │
  │   Review    │  │   Today     │  │   Today     │
  └─────────────┘  └─────────────┘  └─────────────┘
  ```

  ### Filters
  ```
  [Priority: All ▾]  [Type: All ▾]  [Date: Today ▾]
  ```

  ### Verification Queue Table
  ```
  ┌────────────────────────────────────────────────────────────────────────────┐
  │ User          │ Type    │ Signals         │ Suggested │ Submitted  │ Actions │
  ├───────────────┼─────────┼─────────────────┼───────────┼────────────┼─────────┤
  │ John Seek     │ Seeker  │ 🟢 Face match  │ APPROVE   │ 2 hrs ago  │ [Review]│
  │ ID: abc123    │ KYC     │ 🟢 Doc valid   │   (95%)   │            │         │
  │               │         │ 🟢 Liveness OK │           │            │         │
  │               │         │ 🟡 Minor blur  │           │            │         │
  ├───────────────┼─────────┼─────────────────┼───────────┼────────────┼─────────┤
  │ Jane Smith    │ Referrer│ 🟢 Email verify│ APPROVE   │ 5 hrs ago  │ [Review]│
  │ Ref for: John │ 2FA     │ 🟢 Phone verify│   (100%)  │            │         │
  │               │         │ 🟢 LinkedIn OK │           │            │         │
  └────────────────────────────────────────────────────────────────────────────┘
  ```

  ### Detail Panel (when [Review] clicked)
  ```
  ┌──────────────────────────────────────────────────┐
  │  User: John Seek (john@example.com)              │
  │  Type: Seeker Identity Verification              │
  │  Submitted: Dec 8, 2024 at 2:15 PM              │
  │                                                  │
  │  ─── ID Document ───────────────────────────    │
  │  Type: Driver's License (California)             │
  │  Name: John Michael Seek                         │
  │  DOB: Jan 15, 1990                              │
  │  ID#: D1234567                                   │
  │  Expiry: Jan 15, 2027                           │
  │                                                  │
  │  Front Image:                                    │
  │  [Show Image ▼]                                  │
  │  Back Image:                                     │
  │  [Show Image ▼]                                  │
  │                                                  │
  │  ─── Selfie ────────────────────────────────    │
  │  [Show Selfie ▼]                                 │
  │                                                  │
  │  ─── Automated Checks ──────────────────────    │
  │  ✓ Face match: 96% confidence                   │
  │  ✓ Document authentic: High confidence          │
  │  ✓ Liveness check: Passed                       │
  │  ⚠ Image quality: Slightly blurry               │
  │                                                  │
  │  ─── Cross-Checks ──────────────────────────    │
  │  ✓ Name matches account: John Seek              │
  │  ⚠ DOB not in profile (add if approved)         │
  │  ✓ Address: California (matches signup IP)      │
  │                                                  │
  │  ─── Risk Signals ──────────────────────────    │
  │  🟢 No red flags                                 │
  │  🟢 First verification attempt                   │
  │  🟢 Account age: 7 days                         │
  │                                                  │
  │  ─── Suggested Action ──────────────────────    │
  │  APPROVE (95% confidence)                        │
  │                                                  │
  │  ─── Admin Decision ─────────────────────────   │
  │  [ ] Approve                                     │
  │  [ ] Reject                                      │
  │  [ ] Request more info                           │
  │                                                  │
  │  Rejection reason (if applicable):               │
  │  ┌────────────────────────────────────────┐     │
  │  │                                        │     │
  │  └────────────────────────────────────────┘     │
  │                                                  │
  │  [Cancel]  [Submit Decision]                     │
  └──────────────────────────────────────────────────┘
  ```

**Actions:**
- [Approve] → Mark verified, notify user, unlock features
- [Reject] → Mark failed, notify user with reason, allow retry
- [Request More Info] → Send notification, request better images
- [Flag for Senior Review] → Escalate to senior admin

**Security:**
- Audit log of all decisions
- Two-admin approval for high-risk cases
- Rate limiting on approval speed (prevent rubber stamping)

**Notes:**
- Prioritize by urgency (user waiting to send requests)
- Show verification history (previous attempts)
- Track admin performance (approval rate, time per review)

---

## ADM-DISPUTES · Disputes & Retractions

**Purpose:** Admin interface to handle disputes and retraction requests.

**Elements:**
- **Header:** Admin header
- **Left Sidebar:** Admin navigation (Disputes active)

- **Main Content**

  ### Stats
  ```
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │     8       │  │     45      │  │    12       │
  │  Open       │  │  Resolved   │  │  Escalated  │
  │  Disputes   │  │  This Month │  │  To Legal   │
  └─────────────┘  └─────────────┘  └─────────────┘
  ```

  ### Dispute Queue
  ```
  ┌────────────────────────────────────────────────────────────────────┐
  │ Type       │ Parties       │ Issue           │ Deadline  │ Actions   │
  ├────────────┼───────────────┼─────────────────┼───────────┼───────────┤
  │ Retraction │ Jane → John   │ Ref retraction  │ 8d left   │ [Review]  │
  │            │               │ (in bundle)     │           │           │
  ├────────────┼───────────────┼─────────────────┼───────────┼───────────┤
  │ Dispute    │ John vs Emp   │ Unauthorized    │ Urgent    │ [Review]  │
  │            │               │ contact         │           │           │
  ├────────────┼───────────────┼─────────────────┼───────────┼───────────┤
  │ RCS        │ Sarah         │ Score dispute   │ 3d left   │ [Review]  │
  │            │               │ (claims error)  │           │           │
  └────────────────────────────────────────────────────────────────────┘
  ```

  ### Detail Panel
  ```
  Dispute Details

  Type: Reference Retraction
  Status: Pending Resolution
  Opened: Dec 5, 2024
  Deadline: Dec 15, 2024 (8 days remaining)

  Parties:
  • Referrer: Jane Smith (jane@techco.com)
  • Seeker: John Seek (john@example.com)

  Issue:
  Jane Smith requested to retract her reference for John Seek.

  Reason: "Relationship changed"
  Message: "John's work performance declined after I left..."

  Status:
  • Retraction requested: Dec 5
  • John notified: Dec 5
  • No response from John yet
  • Auto-retract date: Dec 15 (if no response)

  Impact:
  • Reference in 2 active bundles
  • Viewed by 3 employers
  • Part of John's RCS calculation

  Timeline:
  [Dec 5] Retraction requested
  [Dec 5] John notified
  [Dec 5] 10-day countdown started
  [Dec 15] Auto-retract if no response

  Admin Actions:
  [ ] Expedite retraction (immediate)
  [ ] Extend grace period (+30 days)
  [ ] Mediate dispute (contact both parties)
  [ ] Reject retraction (rare, requires justification)
  [ ] Escalate to legal

  Notes (internal):
  ┌────────────────────────────────────────┐
  │                                        │
  └────────────────────────────────────────┘

  [Save Notes]  [Take Action]
  ```

**Actions:**
- [Expedite] → Immediately retract, notify parties
- [Extend Grace] → Give seeker more time
- [Mediate] → Send messages to both parties
- [Reject] → Deny retraction (must justify)
- [Escalate] → Send to legal team

**Automation:**
- Auto-retract after deadline
- Auto-notify parties of status changes
- Auto-escalate if multiple disputes from same user

**Notes:**
- Track resolution time
- Document all decisions
- Follow retraction policy strictly
- Protect both parties' interests

---

# SHARED COMPONENTS

## CMP-RCS-BADGE · Reference Confidence Score Badge

**Purpose:** Display RCS score consistently across the app.

**Variants:**

### Large (Dashboard, Bundle Header)
```
┌──────────┐
│    87    │
│   HIGH   │
│  ●●●○    │
└──────────┘
```
- Size: 120x120px
- Font: Bold, 48px for number
- Band text: 16px
- Dots: Visual indicator (3 filled = high)

### Medium (Reference Cards, Lists)
```
[87] HIGH
```
- Pill shape
- Background color: Green (high), Yellow (med), Orange (low)
- Size: 80x32px
- Font: Bold, 18px

### Small (Compact Lists, Tags)
```
[87]
```
- Square or pill
- Size: 40x24px
- Font: Bold, 14px
- Color-coded background

**Color Scale:**
- 80-100: Green (#10B981)
- 50-79: Yellow (#F59E0B)
- 0-49: Orange (#F97316)

**Tooltip (on hover):**
```
Reference Confidence Score: 87
Band: HIGH

Breakdown:
• Identity & Tenure: 90%
• Content Consistency: 92%
• Provenance: 79%

[Learn more]
```

**Accessibility:**
- Color not only indicator (text + dots)
- ARIA label: "Reference Confidence Score 87, High"
- High contrast mode support

---

## CMP-TIMELINE · Event Timeline

**Purpose:** Show chronological events for requests.

**Layout:**
```
Sent          Opened       Started      Submitted
 ●━━━━━━━━━━━━●━━━━━━━━━━━━●━━━━━━━━━━━━●
Dec 1         Dec 3        Dec 5        Dec 8
10:30 AM      2:45 PM      9:12 AM      4:23 PM

✓ Request sent via email & SMS
✓ Jane opened the request
✓ Jane started recording
✓ Jane submitted reference
```

**Elements:**
- Dots: Filled (completed), Empty (pending), Pulsing (current)
- Lines: Solid (completed), Dashed (pending)
- Labels: Above (event name), Below (date/time)
- Icons: Check marks for completed
- Expandable: [Show details ▼] for activity log

**States:**
- Completed: Green dot, solid line
- Current: Blue pulsing dot
- Pending: Gray empty dot, dashed line
- Failed: Red dot, x icon

**Responsive:**
- Desktop: Horizontal
- Mobile: Vertical timeline

---

## CMP-VIDEO-RECORDER · Video Recording Component

**Purpose:** Record video responses.

**Interface:**
```
┌────────────────────────────────────┐
│  Question 1 of 6                   │
│  "Describe John's leadership..."   │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │                              │ │
│  │   Live Camera Preview        │ │
│  │                              │ │
│  │   [Guidelines overlay]       │ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                                    │
│  🔴 REC  Timer: 1:23 / 2:00       │
│                                    │
│  [⏸ Pause]  [⏹ Stop]  [↻ Restart] │
│                                    │
│  💡 Tip: Look at camera, be       │
│     specific with examples         │
└────────────────────────────────────┘
```

**Features:**
- Live preview with face detection
- Recording timer with countdown
- Pause/resume capability
- Retake option
- Extension (+2:00) when limit reached
- Quality settings (720p default)
- Background upload while recording

**States:**
- Initializing camera
- Ready to record
- Recording
- Paused
- Reviewing
- Uploading

---

## CMP-AUDIO-RECORDER · Audio Recording Component

**Purpose:** Record audio responses.

**Interface:**
```
┌────────────────────────────────────┐
│  Question 1 of 6                   │
│  "Describe John's leadership..."   │
├────────────────────────────────────┤
│                                    │
│  🎙 Recording...                   │
│                                    │
│  ████████████░░░░ (Audio levels)   │
│                                    │
│  Timer: 1:23 / 2:00                │
│                                    │
│  [⏸ Pause]  [⏹ Stop]  [↻ Restart] │
│                                    │
│  💡 Tip: Speak clearly in a        │
│     quiet environment              │
└────────────────────────────────────┘
```

**Features:**
- Waveform visualization
- Audio level meter
- Same timer/pause/retake as video
- Background noise detection
- Auto-normalize audio levels

---

*[End of Frame Specifications]*

---

## Summary

This document now includes complete specifications for:
- **21 Authentication & Global frames**
- **16 Seeker frames** (Dashboard, Requests, Library, Bundles, Settings)
- **11 Referrer frames** (Invitation, Verification, Response, Management)
- **4 Employer frames** (Bundle viewing, Verification, Back-channel)
- **2 Admin frames** (Verification queue, Disputes)
- **5 Shared components** (RCS badge, Timeline, Recorders, etc.)

**Total: 59 frames + 5 components fully specified**

Each frame includes:
- Purpose & user goals
- Complete element listings
- Validation rules
- State management
- Error handling
- Navigation paths
- Accessibility notes
- Performance considerations
- Mobile responsiveness
- Analytics tracking

Ready for:
- Wireframing
- UI/UX design
- Frontend development
- Testing & QA
- Documentation

---
