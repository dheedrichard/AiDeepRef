# DeepRef Design System
**Version:** 1.0
**Date:** 2025-09-30
**Purpose:** Single source of truth for all HTML prototype development

---

## 1. Color Palette

### Primary Colors
```css
--primary-purple: #6366F1;      /* Primary buttons, active states, links */
--primary-purple-hover: #4F46E5; /* Hover state for primary */
--primary-purple-light: #818CF8; /* Lighter variant */
```

### Neutral Colors
```css
--text-primary: #1F2937;         /* Headings, primary text */
--text-secondary: #6B7280;       /* Secondary text, labels */
--text-tertiary: #9CA3AF;        /* Placeholders, disabled text */

--bg-white: #FFFFFF;             /* Main background */
--bg-gray-50: #F9FAFB;           /* Subtle background */
--bg-gray-100: #F3F4F6;          /* Illustration area, hover states */
--bg-gray-200: #E5E7EB;          /* Borders, dividers */
```

### Semantic Colors
```css
--success-green: #10B981;        /* Verification checkmarks, success states */
--warning-yellow: #F59E0B;       /* Warning states */
--error-red: #EF4444;            /* Error states */
--info-blue: #3B82F6;            /* Info states */
```

### Brand Colors
```css
--linkedin-blue: #0A66C2;        /* LinkedIn icon */
```

---

## 2. Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Font Sizes & Weights
```css
/* Logo */
--font-logo: 700 32px/1.2;

/* Headings */
--font-h1: 700 28px/1.3;         /* Page titles */
--font-h2: 600 24px/1.3;         /* Section headings */
--font-h3: 600 20px/1.4;         /* Subsection headings */

/* Body */
--font-body: 400 16px/1.5;       /* Main content */
--font-body-sm: 400 14px/1.5;    /* Secondary content */
--font-body-xs: 400 12px/1.5;    /* Small text, captions */

/* UI Elements */
--font-label: 500 14px/1.4;      /* Form labels */
--font-button: 500 16px/1.5;     /* Button text */
--font-nav: 500 16px/1.5;        /* Navigation items */
```

---

## 3. Spacing System

Use multiples of 4px for consistency:
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

**Usage Guidelines:**
- Form field vertical spacing: `--space-6` (24px)
- Card padding: `--space-6` to `--space-8` (24-32px)
- Section spacing: `--space-8` to `--space-12` (32-48px)
- Button padding: `--space-3` `--space-6` (12px 24px)

---

## 4. Layout System

### Grid Structure

#### Auth Layouts (Unauthenticated)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────────────────┐    ┌──────────────────────┐   │
│  │                        │    │                      │   │
│  │   Auth Content Area    │    │  Illustration Area   │   │
│  │   (max-width: 560px)   │    │  (bg-gray-100)       │   │
│  │   Left-aligned         │    │                      │   │
│  │                        │    │                      │   │
│  └────────────────────────┘    └──────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Content area: max-width 560px, padding 40px
- Illustration: Flexible width, centered placeholder
- Split: ~45% content / ~55% illustration

#### App Layouts (Authenticated)
```
┌──────────────────────────────────────────────────────────────┐
│  Logo                                      [Icons] [Avatar]  │
├─────────┬────────────────────────────────────────────────────┤
│         │                                                    │
│  Nav    │            Main Content Area                       │
│  250px  │            (bg-white, border: 1px gray-200)        │
│         │            padding: 32px                           │
│         │                                                    │
│         │                                                    │
└─────────┴────────────────────────────────────────────────────┘
```

**Specs:**
- Sidebar: 250px fixed width
- Main content: calc(100% - 250px), min-height 100vh
- Header height: 64px
- Content padding: 32px

---

## 5. Component Library

### 5.1 Buttons

#### Primary Button
```html
<button class="btn-primary">Sign In</button>
```
```css
.btn-primary {
  background: var(--primary-purple);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font: var(--font-button);
  cursor: pointer;
  width: 100%; /* or auto for inline */
  transition: background 0.2s;
}
.btn-primary:hover {
  background: var(--primary-purple-hover);
}
```

#### Secondary Button (Text Link)
```html
<button class="btn-secondary">Forgot your Password?</button>
```
```css
.btn-secondary {
  background: transparent;
  color: var(--primary-purple);
  border: none;
  font: var(--font-button);
  cursor: pointer;
  text-decoration: none;
}
.btn-secondary:hover {
  text-decoration: underline;
}
```

### 5.2 Form Inputs

#### Text Input
```html
<div class="form-group">
  <label for="email">Email</label>
  <input type="email" id="email" placeholder="info@email.com">
</div>
```
```css
.form-group {
  margin-bottom: 24px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font: var(--font-label);
  color: var(--text-primary);
}
.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--bg-gray-200);
  border-radius: 6px;
  font: var(--font-body);
  color: var(--text-primary);
}
.form-group input::placeholder {
  color: var(--text-tertiary);
}
.form-group input:focus {
  outline: none;
  border-color: var(--primary-purple);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

#### Checkbox
```html
<label class="checkbox">
  <input type="checkbox">
  <span>Keep me logged in</span>
</label>
```
```css
.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--font-body-sm);
  color: var(--text-secondary);
  cursor: pointer;
}
```

### 5.3 Navigation

#### Sidebar Navigation
```html
<nav class="sidebar-nav">
  <div class="nav-header">
    <div class="avatar"></div>
    <div class="user-name">John Seek</div>
  </div>
  <ul class="nav-menu">
    <li class="nav-item active">Dashboard</li>
    <li class="nav-item">Requests</li>
    <li class="nav-item nested">All</li>
    <li class="nav-item nested">Pending</li>
    <li class="nav-item">Library</li>
    <li class="nav-item">Bundles</li>
    <li class="nav-item">Settings</li>
    <li class="nav-item">Sign Out</li>
  </ul>
</nav>
```
```css
.sidebar-nav {
  width: 250px;
  height: 100vh;
  padding: 32px 24px;
  background: var(--bg-white);
}
.nav-header {
  text-align: center;
  margin-bottom: 40px;
}
.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--bg-gray-100);
  margin: 0 auto 16px;
}
.user-name {
  font: var(--font-h3);
  color: var(--text-primary);
}
.nav-menu {
  list-style: none;
  padding: 0;
}
.nav-item {
  padding: 12px 16px;
  margin-bottom: 4px;
  font: var(--font-nav);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}
.nav-item:hover {
  background: var(--bg-gray-50);
}
.nav-item.active {
  color: var(--primary-purple);
  font-weight: 600;
}
.nav-item.nested {
  padding-left: 48px;
  font-size: 14px;
}
```

### 5.4 Cards

#### Stat Card
```html
<div class="stat-card">
  <div class="stat-number">128</div>
  <div class="stat-label">Sent</div>
</div>
```
```css
.stat-card {
  padding: 24px;
  border: 1px solid var(--bg-gray-200);
  border-radius: 8px;
  text-align: center;
  background: var(--bg-white);
}
.stat-number {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.stat-label {
  font: var(--font-body-sm);
  color: var(--text-secondary);
}
```

#### Content Card (Main Area)
```html
<div class="content-card">
  <!-- Card content -->
</div>
```
```css
.content-card {
  background: var(--bg-white);
  border: 1px solid var(--bg-gray-200);
  border-radius: 8px;
  padding: 32px;
  min-height: calc(100vh - 64px - 64px); /* Full height minus header and padding */
}
```

### 5.5 Tables

```html
<table class="data-table">
  <thead>
    <tr>
      <th>Referrer</th>
      <th>Active</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>jane@ms.com</td>
      <td>3d</td>
      <td>Opened</td>
      <td></td>
    </tr>
  </tbody>
</table>
```
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
}
.data-table th {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 2px solid var(--bg-gray-200);
  font: var(--font-label);
  color: var(--text-secondary);
}
.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--bg-gray-200);
  font: var(--font-body-sm);
  color: var(--text-primary);
}
```

### 5.6 Icons

#### Verification Badge (Top Right)
```html
<div class="header-icons">
  <div class="icon-linkedin">
    <svg><!-- LinkedIn icon --></svg>
  </div>
  <div class="icon-verified">
    <svg><!-- Checkmark icon --></svg>
  </div>
</div>
```
```css
.header-icons {
  display: flex;
  gap: 16px;
  position: absolute;
  top: 24px;
  right: 24px;
}
.icon-linkedin {
  width: 40px;
  height: 40px;
  background: var(--linkedin-blue);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.icon-verified {
  width: 40px;
  height: 40px;
  background: var(--success-green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
```

### 5.7 RCS Badge Component

```html
<div class="rcs-badge">
  <div class="rcs-score">87</div>
  <div class="rcs-label">HIGH</div>
  <div class="rcs-dots">●●●○</div>
</div>
```
```css
.rcs-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 2px solid var(--success-green);
  border-radius: 12px;
  min-width: 120px;
}
.rcs-score {
  font-size: 48px;
  font-weight: 700;
  color: var(--success-green);
  line-height: 1;
}
.rcs-label {
  font: var(--font-label);
  color: var(--success-green);
  margin-top: 4px;
}
.rcs-dots {
  font-size: 20px;
  color: var(--success-green);
  margin-top: 8px;
  letter-spacing: 4px;
}
```

---

## 6. Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  /* Stack layout, hide sidebar, show hamburger menu */
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Collapse sidebar to icons only */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Full layout as designed */
}
```

---

## 7. Implementation Standards

### HTML Structure
- Use semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`)
- Include proper ARIA labels for accessibility
- Use BEM naming convention for CSS classes (optional but recommended)

### CSS Standards
- Use CSS custom properties (variables) defined above
- Mobile-first approach
- Avoid !important unless absolutely necessary
- Group related styles together
- Comment complex selectors

### TailwindCSS Mapping (if using Tailwind)
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'primary': '#6366F1',
        'primary-hover': '#4F46E5',
        // ... map all custom properties
      }
    }
  }
}
```

---

## 8. Quality Checklist

Before marking a frame complete, verify:

- [ ] Colors match the palette exactly
- [ ] Typography uses correct font sizes and weights
- [ ] Spacing follows the 4px grid system
- [ ] Layout matches the specified structure (sidebar width, padding, etc.)
- [ ] All interactive elements have hover states
- [ ] Focus states are visible for accessibility
- [ ] Responsive behavior works at all breakpoints
- [ ] Icons are properly sized and colored
- [ ] Forms have proper validation states (not just visual)
- [ ] Component matches the reference PNG exactly

---

## 9. Reference Images

All reference images are located in:
```
/Users/laptopname/Documents/AstraHeeD/DeepApp/frames_sep29/
```

**Key Reference Files:**
- `DeepRef - Welcome - Global@2x.png` - Auth layout pattern
- `DeepRef - Seeker - Dashboard@2x.png` - App layout pattern with sidebar
- `DeepRef - Sign Up - Global@2x.png` - Form components
- `DeepRef - Seeker - ID Verification - Upload@2x.png` - Button styles, nested nav

---

## 10. Tools & Dependencies

### Required CDN Links
```html
<!-- TailwindCSS (optional, for rapid prototyping) -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Alpine.js (for interactivity) -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- OR plain CSS + vanilla JS -->
```

### Browser Support
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari/Chrome: Latest 2 versions

---

**End of Design System Document**