# Angular 19 Frontend Setup Research

**Date:** 2025-11-19
**Agent:** Frontend Lead Agent
**Project:** DeepRef AI Reference Verification Platform

## Angular 19 Key Findings

### Version Information
- **Latest Stable:** Angular 19.0.0 (Released: November 19, 2024)
- **TypeScript Support:** 5.6+
- **LTS Status:** Active support until May 19, 2025, then LTS until May 19, 2026

### Major Changes in Angular 19

#### 1. Standalone Components (Default)
- **Breaking Change:** `standalone: true` is now the default
- No need to specify `standalone: true` in component decorators
- To use NgModules (legacy), must explicitly set `standalone: false`
- Migration schematics automatically add `standalone: false` to existing code

#### 2. No NgModules Required
- New projects should NOT use NgModules
- All components, directives, pipes are standalone by default
- Simplified application architecture

#### 3. Enhanced Features
- Incremental hydration for SSR
- Server route configuration
- Event replay enabled by default
- Faster initial page loads

## Tailwind CSS 4 Integration

### Installation
```bash
npm install tailwindcss @tailwindcss/postcss postcss --force
```
**Note:** `--force` flag required due to Angular DevKit compatibility issues (being resolved)

### Configuration Changes in V4
- **CSS-First Configuration:** No more `tailwind.config.js` by default
- Use `@config` directive for JavaScript configs (if needed)
- Configuration through CSS directives preferred

### Setup Steps
1. Create `.postcssrc.json` with `@tailwindcss/postcss` plugin
2. Import Tailwind in `src/styles.css` (or use `@use` for SCSS)
3. No automatic detection of JS config files (must use `@config`)

### Angular Integration
- Create `.postcssrc.json` for PostCSS configuration
- Add Tailwind imports to main styles file
- SCSS users: use `@use` instead of `@import`

## NgRx 19

### Version Compatibility
- NgRx 19 is compatible with Angular 19
- Full support for standalone components
- No NgModule required for store setup

### Setup Approach
- Use `provideStore()` in app config (standalone approach)
- Use `provideEffects()` for side effects
- Use `provideStoreDevtools()` for debugging

## Angular Material 19

### Version
- Angular Material 19 matches Angular 19 version
- Fully compatible with standalone components

### Installation
```bash
ng add @angular/material
```

### Configuration
- Provides standalone setup by default
- No module imports needed
- Import components directly in standalone components

## PrimeNG 19

### Version Compatibility
- PrimeNG 19 (or latest v18.x compatible with Angular 19)
- Works with standalone components

### Installation
```bash
npm install primeng primeicons
```

## Project Structure for Standalone Apps

```
src/app/
├── core/                    # Core services, guards, interceptors
│   ├── guards/
│   ├── interceptors/
│   └── services/
├── features/                # Feature modules (standalone)
│   ├── auth/
│   ├── seeker/
│   ├── referrer/
│   ├── employer/
│   └── admin/
├── shared/                  # Shared standalone components
│   ├── components/
│   ├── directives/
│   ├── pipes/
│   └── models/
├── app.config.ts           # App configuration (providers)
├── app.routes.ts           # Route definitions
└── app.component.ts        # Root standalone component
```

## TypeScript Configuration

### Strict Mode Settings
- Enable `strict: true`
- Enable `strictNullChecks`
- Enable `strictPropertyInitialization`
- Enable `noImplicitAny`
- Enable `noImplicitReturns`

## ESLint & Prettier

### ESLint for Angular 19
```bash
ng add @angular-eslint/schematics
```

### Prettier
```bash
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

## Routing Structure Based on Specs

### Route Mapping from Frontend Spec

#### Auth Routes (Public)
- `/` - Welcome/Landing
- `/auth/signin` - Sign in with magic link
- `/auth/signup` - Create account
- `/auth/verify-email` - Email verification

#### Seeker Routes (Protected)
- `/app/seeker` - Dashboard
- `/app/seeker/profile` - Profile setup
- `/app/seeker/requests` - Requests list
- `/app/seeker/requests/new` - New request wizard
- `/app/seeker/requests/:id` - Request detail
- `/app/seeker/library` - References library
- `/app/seeker/bundles` - Bundles list
- `/app/seeker/bundles/new` - Create bundle
- `/app/seeker/bundles/:id` - Bundle viewer
- `/app/seeker/settings` - Settings
- `/app/seeker/verify-id` - ID verification flow

#### Referrer Routes
- `/r/invite/:token` - Invite landing
- `/r/verify/email` - Email OTP verification
- `/r/verify/phone` - Phone OTP verification
- `/r/respond/:requestId/mode` - Choose response mode
- `/r/respond/:requestId/record` - Recording interface
- `/r/respond/:requestId/review` - Review & submit
- `/r/app/submissions` - Manage submissions

#### Employer Routes (Public with verification)
- `/b/:bundleId` - Bundle viewer
- `/b/:bundleId/verify` - Email verification
- `/b/:bundleId/reachback` - Reach-back request

#### Admin Routes (Protected)
- `/admin/verification` - Verification queue
- `/admin/disputes` - Disputes & retracts

## Development Tools

### Recommended VSCode Extensions
- Angular Language Service
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Angular Schematics

### Build & Dev Commands
- `npm start` or `ng serve` - Development server
- `ng build` - Production build
- `ng test` - Run tests
- `ng lint` - Lint code

## Key Decisions

1. **Use Standalone Components Only** - No NgModules
2. **Tailwind CSS 4** - Use CSS-first configuration
3. **NgRx 19** - Use functional approach with `provideStore()`
4. **Strict TypeScript** - Enable all strict mode options
5. **ESLint + Prettier** - Unified code style
6. **Feature-based Architecture** - Organize by domain (auth, seeker, referrer, etc.)

## References

- [Angular 19 Release Notes](https://blog.angular.dev/the-future-is-standalone-475d7edbc706)
- [Tailwind CSS 4 with Angular 19 Setup Guide](https://dev.to/manthanank/setting-up-tailwind-css-40-in-angular-v191-a-step-by-step-guide-258m)
- [Angular Style Guide](https://angular.dev/style-guide)
- [NgRx Standalone Setup](https://ngrx.io/guide/store/install)

## Next Steps

1. Create Angular 19 project using Angular CLI
2. Configure Tailwind CSS 4
3. Install NgRx 19, Angular Material 19, PrimeNG
4. Set up folder structure
5. Configure routing
6. Set up ESLint and Prettier
7. Create initial components and guards
8. Document setup in README
