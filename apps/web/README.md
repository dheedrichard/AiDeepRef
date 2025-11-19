# DeepRef - Frontend Web Application

DeepRef is an AI-powered reference verification platform that enables job seekers to collect, manage, and share verified professional references with potential employers.

## Technology Stack

- **Framework:** Angular 20.3.0 (with standalone components)
- **Language:** TypeScript 5.9.2
- **Styling:** Tailwind CSS 4 + SCSS
- **State Management:** NgRx 20.1.0 (Store, Effects, Router Store, DevTools)
- **UI Libraries:**
  - Angular Material 20.2.13
  - PrimeNG 20.3.0
- **Code Quality:** ESLint + Prettier
- **Build Tool:** Angular CLI 20.3.10 with esbuild

## Prerequisites

- Node.js 22.x or higher
- npm 10.x or higher

## Getting Started

### Installation

```bash
# Navigate to the web app directory
cd /home/user/AiDeepRef/apps/web

# Install dependencies
npm install
```

### Development Server

```bash
# Start the development server
npm start

# Or use Angular CLI directly
npx ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload when you change source files.

### Available Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run unit tests
npm run lint       # Lint TypeScript and HTML files
npm run format     # Format code with Prettier
npm run format:check  # Check code formatting
```

## Project Structure

```
src/app/
├── core/                     # Core services, guards, interceptors
│   ├── guards/              # Route guards (auth, admin, KYC)
│   ├── interceptors/        # HTTP interceptors (auth, error handling)
│   └── services/            # Core services (auth, API, storage)
├── features/                # Feature modules (lazy-loaded)
│   ├── auth/               # Authentication & authorization
│   ├── seeker/             # Job seeker features
│   ├── referrer/           # Referrer features
│   ├── employer/           # Employer features
│   └── admin/              # Admin features
├── shared/                  # Shared components, directives, pipes
│   ├── components/         # Reusable UI components
│   ├── directives/         # Custom directives
│   ├── pipes/              # Custom pipes
│   └── models/             # TypeScript interfaces and types
├── app.config.ts           # Application configuration
├── app.routes.ts           # Main routing configuration
└── app.ts                  # Root component
```

## Routing Structure

### Public Routes

- `/auth/welcome` - Landing page
- `/auth/signin` - Sign in with magic link
- `/auth/signup` - Create account
- `/auth/verify-email` - Email verification

### Seeker Routes (Protected)

- `/app/seeker/dashboard` - Main dashboard
- `/app/seeker/profile` - Profile setup
- `/app/seeker/requests` - Reference requests list
- `/app/seeker/requests/new` - New request wizard
- `/app/seeker/requests/:id` - Request detail
- `/app/seeker/library` - References library
- `/app/seeker/bundles` - Bundles list
- `/app/seeker/bundles/new` - Create bundle
- `/app/seeker/bundles/:id` - Bundle viewer
- `/app/seeker/verify-id` - ID verification flow
- `/app/seeker/settings` - User settings

### Referrer Routes

- `/r/invite/:token` - Invite landing page
- `/r/verify/email` - Email OTP verification
- `/r/verify/phone` - Phone OTP verification
- `/r/respond/:requestId/mode` - Choose response mode
- `/r/respond/:requestId/record` - Record response
- `/r/respond/:requestId/review` - Review & submit
- `/r/app/submissions` - Manage submissions

### Employer Routes

- `/b/:bundleId` - Bundle viewer
- `/b/:bundleId/verify` - Email verification
- `/b/:bundleId/reachback` - Request verification

### Admin Routes (Protected)

- `/admin/verification` - Verification queue
- `/admin/disputes` - Disputes & retracts

## Architecture Decisions

### Standalone Components

This application uses Angular's standalone components exclusively (no NgModules). This provides:
- Simpler mental model
- Better tree-shaking
- Easier testing
- Clearer dependencies

### Lazy Loading

All feature modules are lazy-loaded for optimal performance and reduced initial bundle size.

### State Management

NgRx is configured with strict runtime checks to ensure:
- State immutability
- Action immutability
- State serializability
- Actions are dispatched within NgZone

### TypeScript Strict Mode

TypeScript strict mode is enabled with all strict options for maximum type safety:
- `strict: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `noPropertyAccessFromIndexSignature: true`

## Design System

The application follows the DeepRef Design System with:

### Color Palette

- **Primary:** Purple (#6366F1)
- **Semantic:** Green (success), Red (error), Yellow (warning), Blue (info)
- **Neutrals:** Gray scale from 50 to 200

### Typography

- **Font Family:** System fonts (Apple system, Segoe UI, Roboto)
- **Sizes:** 12px to 32px with consistent line heights

### Spacing

4px grid system (`--space-1` through `--space-16`)

See `/home/user/AiDeepRef/DEVROOM/DeepRef-Design-System.md` for complete design specifications.

## Development Guidelines

### Component Generation

```bash
# Generate a standalone component
npx ng generate component features/auth/pages/signin --standalone

# Generate a service
npx ng generate service core/services/auth

# Generate a guard
npx ng generate guard core/guards/auth --functional
```

### Code Style

- Follow Angular style guide
- Use functional programming patterns where appropriate
- Prefer signals for reactive state (Angular 20+)
- Use async pipe for observables in templates
- Keep components focused and single-responsibility
- Extract reusable logic into services

### State Management

- Use NgRx for complex state that needs to be shared across features
- Use component state (signals) for local UI state
- Always use typed actions and reducers
- Use effects for side effects (API calls, navigation, etc.)

### Testing

- Write unit tests for all services and components
- Use Testing Library patterns for component tests
- Mock external dependencies
- Aim for >80% code coverage

## Building for Production

```bash
# Production build
npm run build

# The build artifacts will be stored in the dist/ directory
```

## Configuration Files

- `angular.json` - Angular CLI configuration
- `tsconfig.json` - TypeScript configuration
- `tsconfig.app.json` - App-specific TypeScript config
- `eslint.config.js` - ESLint configuration
- `.prettierrc.json` - Prettier configuration
- `.postcssrc.json` - PostCSS configuration (for Tailwind)

## Environment Variables

Environment-specific configuration will be managed through Angular's environment files (to be created):
- `src/environments/environment.ts` - Development
- `src/environments/environment.prod.ts` - Production

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari/Chrome: Latest 2 versions

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Run linting and formatting: `npm run lint && npm run format`
4. Write tests for new features
5. Run all tests: `npm test`
6. Create a pull request

## Troubleshooting

### Common Issues

**Build errors with Tailwind CSS 4:**
- Ensure `.postcssrc.json` exists with the correct configuration
- Clear the Angular cache: `rm -rf .angular`

**NgRx DevTools not working:**
- Install the Redux DevTools browser extension
- Ensure you're running in development mode

**Routing not working:**
- Check that `provideRouter(routes)` is in `app.config.ts`
- Verify lazy-loaded routes return the correct exports

## Documentation

- [Frontend Specification](/home/user/AiDeepRef/DEVROOM/Whimsical/DeepRef-Frontend-Spec-ALIGNED-v2.1.md)
- [Design System](/home/user/AiDeepRef/DEVROOM/DeepRef-Design-System.md)
- [Research Notes](/home/user/AiDeepRef/files/research_notes/angular-19-setup-research.md)

## License

Proprietary - DeepRef Platform

## Support

For questions or issues, contact the development team.

---

**Last Updated:** 2025-11-19
**Angular Version:** 20.3.0
**Node Version:** 22.21.1
