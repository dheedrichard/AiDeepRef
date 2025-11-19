# DeepRef HTML Prototypes - Architecture & Orchestration Plan
**Version:** 1.0
**Date:** 2025-09-30
**Workflow Pattern:** Inspired by [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows)

---

## 1. Overview

### Objective
Build high-fidelity HTML prototypes for DeepRef's AUTH, SEEKER, and REFERRER swimlanes using:
- **Git Worktrees**: Parallel development environments
- **Multiple Agents**: Specialized agents for each swimlane
- **Orchestrators**: Quality control agents providing feedback
- **Playwright MCP**: Automated visual testing and feedback loops

### Success Criteria
- All frames match design system specifications exactly
- Playwright screenshots pass visual regression tests
- Orchestrator approval before merging to main
- Cross-browser compatibility (Firefox primary, Chrome/Safari secondary)

---

## 2. Git Worktree Architecture

### 2.1 Worktree Structure

```
DeepApp/  (main worktree)
├── .git/
├── DEVROOM/
│   ├── DeepRef-Design-System.md
│   ├── DeepRef-Architecture-Orchestration-Plan.md
│   └── ...existing docs
│
../DeepApp-worktrees/
├── worktree-auth/        (branch: feature/auth-frames)
│   ├── index.html
│   ├── auth/
│   │   ├── welcome.html
│   │   ├── signup.html
│   │   ├── signin.html
│   │   └── verify-email.html
│   └── assets/
│       ├── styles.css
│       └── components.css
│
├── worktree-seeker/      (branch: feature/seeker-frames)
│   ├── index.html
│   ├── seeker/
│   │   ├── dashboard.html
│   │   ├── kyc-upload.html
│   │   ├── kyc-selfie.html
│   │   ├── requests-new.html
│   │   ├── requests-detail.html
│   │   ├── library.html
│   │   └── settings.html
│   └── assets/
│       ├── styles.css
│       └── components.css
│
├── worktree-referrer/    (branch: feature/referrer-frames)
│   ├── index.html
│   ├── referrer/
│   │   ├── invitation.html
│   │   ├── verify-email.html
│   │   ├── verify-phone.html
│   │   ├── decide.html
│   │   ├── record-video.html
│   │   ├── review.html
│   │   └── dashboard.html
│   └── assets/
│       ├── styles.css
│       └── components.css
│
└── worktree-shared/      (branch: feature/shared-components)
    ├── index.html
    └── components/
        ├── rcs-badge.html
        ├── navigation.html
        ├── buttons.html
        ├── forms.html
        └── cards.html
```

### 2.2 Worktree Setup Commands

```bash
# Navigate to parent directory
cd /Users/laptopname/Documents/AstraHeeD

# Create worktree directory
mkdir -p DeepApp-worktrees

# Create worktrees with new branches
cd DeepApp
git worktree add ../DeepApp-worktrees/worktree-auth -b feature/auth-frames
git worktree add ../DeepApp-worktrees/worktree-seeker -b feature/seeker-frames
git worktree add ../DeepApp-worktrees/worktree-referrer -b feature/referrer-frames
git worktree add ../DeepApp-worktrees/worktree-shared -b feature/shared-components

# List active worktrees
git worktree list
```

### 2.3 Branch Strategy

```
main
├── feature/shared-components  (First to complete - foundation)
├── feature/auth-frames         (Depends on shared)
├── feature/seeker-frames       (Depends on shared)
└── feature/referrer-frames     (Depends on shared)
```

**Merge Order:**
1. `feature/shared-components` → `main` (after orchestrator approval)
2. `feature/auth-frames` → `main` (after orchestrator approval)
3. `feature/seeker-frames` → `main` (after orchestrator approval)
4. `feature/referrer-frames` → `main` (after orchestrator approval)

---

## 3. Agent Architecture

### 3.1 Agent Roles & Responsibilities

#### **Builder Agents** (4 total)
Specialized agents that create HTML/CSS/JS for specific swimlanes.

| Agent Name | Worktree | Responsibilities | Frames Count |
|------------|----------|------------------|--------------|
| `shared-builder` | worktree-shared | Build reusable components | 5 components |
| `auth-builder` | worktree-auth | Build AUTH frames | 4 frames |
| `seeker-builder` | worktree-seeker | Build SEEKER frames | 7 frames |
| `referrer-builder` | worktree-referrer | Build REFERRER frames | 7 frames |

#### **Orchestrator Agents** (4 total)
Quality control agents that review builder output using Playwright MCP.

| Agent Name | Reviews | Feedback Method |
|------------|---------|-----------------|
| `shared-orchestrator` | shared-builder | Playwright visual tests |
| `auth-orchestrator` | auth-builder | Playwright visual tests |
| `seeker-orchestrator` | seeker-builder | Playwright visual tests |
| `referrer-orchestrator` | referrer-builder | Playwright visual tests |

### 3.2 Agent Communication Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Main Orchestrator                     │
│              (Coordinates all workflows)                 │
└───────────────────┬──────────────────────────────────────┘
                    │
      ┌─────────────┼─────────────┬──────────────┐
      │             │             │              │
      ▼             ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Shared   │  │  Auth    │  │ Seeker   │  │ Referrer │
│ Orch.    │  │  Orch.   │  │ Orch.    │  │ Orch.    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │              │
     ▼             ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Shared   │  │  Auth    │  │ Seeker   │  │ Referrer │
│ Builder  │  │  Builder │  │ Builder  │  │ Builder  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 4. Playwright MCP Feedback Loop

### 4.1 Feedback Loop Architecture

```
Builder Agent (worktree-auth)
    │
    ├─► Create welcome.html
    │
    ├─► Commit to branch
    │
    └─► Signal "Ready for Review"
            │
            ▼
Orchestrator Agent
    │
    ├─► Playwright MCP: Navigate to file:///.../welcome.html
    │
    ├─► Playwright MCP: Take screenshot
    │
    ├─► Compare screenshot to reference PNG
    │       (frames_sep29/DeepRef - Welcome - Global@2x.png)
    │
    ├─► Check against Design System:
    │   ├─ Colors match palette?
    │   ├─ Typography correct?
    │   ├─ Spacing follows 4px grid?
    │   ├─ Layout matches spec?
    │   └─ Components styled correctly?
    │
    ├─► Generate Feedback Report:
    │   ├─ PASS: Approve frame
    │   └─ FAIL: Provide specific corrections
    │
    └─► Send feedback to Builder Agent
            │
            ├─► If PASS: Mark frame complete
            │
            └─► If FAIL: Builder iterates
                    │
                    └─► Loop back to "Create welcome.html"
```

### 4.2 Playwright MCP Commands Used

```javascript
// 1. Navigate to HTML file
mcp__playwright__browser_navigate({
  url: "file:///Users/laptopname/Documents/AstraHeeD/DeepApp-worktrees/worktree-auth/auth/welcome.html"
});

// 2. Take full-page screenshot
mcp__playwright__browser_take_screenshot({
  fullPage: true,
  filename: "welcome-firefox-actual.png"
});

// 3. Check specific elements
mcp__playwright__browser_snapshot();

// 4. Test interactions
mcp__playwright__browser_click({
  element: "Sign In button",
  ref: "button.btn-primary"
});

// 5. Verify hover states
mcp__playwright__browser_hover({
  element: "Sign Up button",
  ref: "button.btn-secondary"
});

// 6. Test responsive behavior
mcp__playwright__browser_resize({
  width: 375,
  height: 812
});
```

### 4.3 Validation Checklist

Each orchestrator runs this checklist using Playwright:

**Visual Checks:**
- [ ] Screenshot matches reference PNG (pixel-perfect or 95%+ similarity)
- [ ] Colors extracted from screenshot match design system
- [ ] Typography sizes match specifications
- [ ] Spacing between elements follows 4px grid

**Functional Checks:**
- [ ] All interactive elements respond to hover
- [ ] All interactive elements respond to click
- [ ] Forms have proper focus states
- [ ] Navigation links work (if applicable)

**Responsive Checks:**
- [ ] Layout works at 375px (mobile)
- [ ] Layout works at 768px (tablet)
- [ ] Layout works at 1440px (desktop)

**Accessibility Checks:**
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible

---

## 5. Orchestrator Agent Configuration

### 5.1 Custom Agent Files

Create custom orchestrator agents in `.claude/agents/`:

```bash
# File: .claude/agents/auth-orchestrator.md
---
name: auth-orchestrator
description: Reviews AUTH frames using Playwright MCP and provides feedback
model: claude-sonnet-4-5
---

# AUTH Orchestrator Agent

## Role
You are a quality control agent responsible for reviewing AUTH frames built by the `auth-builder` agent.

## Tools Available
- Read: Read HTML/CSS files
- Playwright MCP: Test frames in browser
- Bash: Run git commands, file operations

## Workflow
1. Navigate to worktree-auth directory
2. Read latest commit from auth-builder
3. For each new/modified HTML file:
   - Open in Playwright (Firefox browser)
   - Take screenshot
   - Compare to reference PNG in frames_sep29/
   - Check against Design System document
   - Test interactions (hover, click, focus)
   - Test responsive behavior
4. Generate detailed feedback report
5. If PASS: Comment approval on file
6. If FAIL: Provide specific corrections needed

## Feedback Format
```
## Review: auth/welcome.html

### Visual Comparison
- Reference: frames_sep29/DeepRef - Welcome - Global@2x.png
- Screenshot: auth/welcome-firefox-actual.png
- Similarity: 87% ❌

### Issues Found
1. **Color Mismatch**: Button background is #7C7CF1 (should be #6366F1)
2. **Spacing**: Gap between email and password fields is 32px (should be 24px)
3. **Typography**: Logo font-size is 36px (should be 32px)

### Corrections Needed
- Update button background to var(--primary-purple)
- Change form-group margin-bottom to 24px
- Set .logo font-size to 32px

### Status
❌ FAILED - Requires iteration
```

## Success Criteria
- Screenshot similarity >= 95%
- All colors match design system
- All spacing follows 4px grid
- All interactions work as expected
- Responsive behavior correct at all breakpoints
```

### 5.2 Builder Agent Configuration

```bash
# File: .claude/agents/auth-builder.md
---
name: auth-builder
description: Builds AUTH frames following the design system
model: claude-sonnet-4-5
---

# AUTH Builder Agent

## Role
You are a frontend developer building AUTH frames for the DeepRef application.

## Reference Documents
- Design System: DEVROOM/DeepRef-Design-System.md
- Frame Specifications: DEVROOM/DeepRef-Frame-Specifications.md
- Reference PNGs: frames_sep29/

## Frames to Build
1. auth/welcome.html - Welcome/Sign-in page
2. auth/signup.html - Sign-up page
3. auth/verify-email.html - Email verification
4. auth/password-create.html - Password creation

## Implementation Guidelines
1. Use CSS custom properties from Design System
2. Match reference PNGs exactly
3. Include proper semantic HTML
4. Add Alpine.js for basic interactivity
5. Make responsive (mobile-first)
6. Comment your code

## Workflow
1. Read Design System document
2. View reference PNG for current frame
3. Write HTML structure
4. Write CSS styles using design tokens
5. Add interactivity if needed
6. Test in browser manually (if possible)
7. Commit with descriptive message
8. Signal orchestrator for review
9. Respond to feedback and iterate

## Code Standards
- Use BEM naming convention
- Keep CSS DRY (use shared styles)
- Mobile-first responsive design
- Comment complex sections

## Example Commit Message
```
feat(auth): add welcome.html frame

- Implement sign-in/sign-up split layout
- Add form with email/password inputs
- Style primary/secondary buttons
- Match DeepRef - Welcome - Global@2x.png reference
- Responsive design for mobile/tablet/desktop

Ready for orchestrator review.
```
```

---

## 6. Execution Plan

### 6.1 Phase 1: Foundation (Estimated: 2 hours)

**Objective:** Set up infrastructure and shared components

1. **Main Orchestrator (Me)**
   - Initialize git repository (if not exists)
   - Create worktrees
   - Copy design documents to each worktree
   - Create agent configuration files

2. **Launch `shared-builder` Agent**
   - Task: Build shared components
   - Output: components/rcs-badge.html, navigation.html, buttons.html, forms.html, cards.html
   - Commits to: feature/shared-components branch

3. **Launch `shared-orchestrator` Agent**
   - Task: Review shared components
   - Method: Playwright visual tests
   - Output: Approval or feedback

4. **Iterate until approval**

5. **Merge to main:**
   ```bash
   git checkout main
   git merge feature/shared-components
   ```

### 6.2 Phase 2: Parallel Frame Development (Estimated: 4 hours)

**Objective:** Build all frames in parallel across worktrees

**Parallel Track 1: AUTH**
1. Launch `auth-builder` agent in worktree-auth
2. Launch `auth-orchestrator` agent
3. Feedback loop until all 4 frames approved

**Parallel Track 2: SEEKER**
1. Launch `seeker-builder` agent in worktree-seeker
2. Launch `seeker-orchestrator` agent
3. Feedback loop until all 7 frames approved

**Parallel Track 3: REFERRER**
1. Launch `referrer-builder` agent in worktree-referrer
2. Launch `referrer-orchestrator` agent
3. Feedback loop until all 7 frames approved

### 6.3 Phase 3: Integration & Final Review (Estimated: 1 hour)

1. Merge all feature branches to main:
   ```bash
   git checkout main
   git merge feature/auth-frames
   git merge feature/seeker-frames
   git merge feature/referrer-frames
   ```

2. Create unified index.html navigator in main worktree

3. Final cross-browser testing (Firefox, Chrome, Safari)

4. Generate documentation for handoff

---

## 7. Monitoring & Progress Tracking

### 7.1 Progress Dashboard

Each orchestrator reports progress to main orchestrator:

```
┌─────────────────────────────────────────────────────────┐
│              DeepRef Prototyping Progress               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ SHARED COMPONENTS: ████████████████████████ 100% ✅    │
│   - rcs-badge.html        ✅                            │
│   - navigation.html       ✅                            │
│   - buttons.html          ✅                            │
│   - forms.html            ✅                            │
│   - cards.html            ✅                            │
│                                                         │
│ AUTH FRAMES: ██████████████░░░░░░░░░░░░░░ 50%          │
│   - welcome.html          ✅                            │
│   - signup.html           ✅                            │
│   - verify-email.html     🔄 (iteration 2)             │
│   - password-create.html  ⏳ (pending)                 │
│                                                         │
│ SEEKER FRAMES: ████████░░░░░░░░░░░░░░░░░░ 30%          │
│   - dashboard.html        ✅                            │
│   - kyc-upload.html       ✅                            │
│   - kyc-selfie.html       🔄 (iteration 1)             │
│   - requests-new.html     ⏳ (pending)                 │
│   - requests-detail.html  ⏳ (pending)                 │
│   - library.html          ⏳ (pending)                 │
│   - settings.html         ⏳ (pending)                 │
│                                                         │
│ REFERRER FRAMES: ████░░░░░░░░░░░░░░░░░░░░ 15%          │
│   - invitation.html       ✅                            │
│   - verify-email.html     🔄 (iteration 1)             │
│   - verify-phone.html     ⏳ (pending)                 │
│   - decide.html           ⏳ (pending)                 │
│   - record-video.html     ⏳ (pending)                 │
│   - review.html           ⏳ (pending)                 │
│   - dashboard.html        ⏳ (pending)                 │
│                                                         │
│ Overall Progress: ████████░░░░░░░░░░░░░░░░ 35%         │
└─────────────────────────────────────────────────────────┘

Legend:
✅ Approved by orchestrator
🔄 In feedback loop (iteration N)
⏳ Pending / Not started
❌ Blocked / Issue
```

### 7.2 Real-time Reporting

Each agent logs to structured files:

```
logs/
├── auth-builder.log
├── auth-orchestrator.log
├── seeker-builder.log
├── seeker-orchestrator.log
├── referrer-builder.log
├── referrer-orchestrator.log
└── main-orchestrator.log
```

---

## 8. Risk Management

### 8.1 Potential Issues & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Playwright MCP not working | HIGH | Test MCP tools first; fallback to manual screenshots |
| Agents drift from design system | MEDIUM | Orchestrators enforce strict validation |
| Git merge conflicts | MEDIUM | Shared components completed first; regular syncs |
| Performance bottleneck | LOW | Agents work in parallel; no blocking dependencies |
| Browser inconsistencies | MEDIUM | Test in Firefox first (specified), then cross-browser |

### 8.2 Rollback Plan

If any phase fails critically:
1. Abandon worktree branch
2. Create fresh worktree with new branch
3. Restart agent with lessons learned
4. Original worktree preserved for reference

---

## 9. Success Metrics

### 9.1 Quality Metrics

- **Visual Accuracy:** >= 95% similarity to reference PNGs
- **Design System Compliance:** 100% (enforced by orchestrators)
- **Playwright Test Pass Rate:** 100% before merge
- **Cross-browser Compatibility:** Firefox (100%), Chrome (95%+), Safari (95%+)

### 9.2 Velocity Metrics

- **Frames per Hour:** Target 2-3 frames/hour (including iterations)
- **First-time Pass Rate:** Target 50%+ (improves with builder learning)
- **Average Iterations:** Target <= 2 iterations per frame

### 9.3 Completion Criteria

- [ ] All 23 frames built and approved
- [ ] All frames pass Playwright visual tests
- [ ] Cross-browser testing complete
- [ ] Documentation generated
- [ ] All feature branches merged to main
- [ ] Worktrees cleaned up

---

## 10. Next Steps

**Immediate Actions:**
1. Initialize git repository in DeepApp (if not exists)
2. Create worktrees using commands in Section 2.2
3. Create agent configuration files in `.claude/agents/`
4. Copy design documents to each worktree
5. Begin Phase 1: Launch shared-builder agent

**Command to Start:**
```bash
# Run this to begin the orchestration
cd /Users/laptopname/Documents/AstraHeeD/DeepApp
./scripts/start-orchestration.sh
```

---

**End of Architecture & Orchestration Plan**