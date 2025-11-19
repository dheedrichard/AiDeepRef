# DeepRef Frontend - Quick Start Guide

## Get Started in 60 Seconds

### 1. Navigate to the project
```bash
cd /home/user/AiDeepRef/apps/web
```

### 2. Start the development server
```bash
npm start
```

### 3. Open your browser
Navigate to `http://localhost:4200/`

You should see the DeepRef Welcome page!

## What's Working Right Now

- ✅ Angular 20 application running
- ✅ Tailwind CSS 4 styling
- ✅ NgRx state management configured
- ✅ TypeScript strict mode enabled
- ✅ ESLint + Prettier configured
- ✅ Welcome page (`/auth/welcome`) functional
- ✅ Production build working

## Current Routes

**Working:**
- `/` or `/auth/welcome` - Landing page ✅

**Defined but need components:**
- `/auth/signin` - Sign in page
- `/auth/signup` - Create account page
- All other routes are defined but commented out until components are created

## Create Your First Component

```bash
# Example: Create the signin component
npx ng generate component features/auth/pages/signin --standalone

# Then uncomment the route in src/app/features/auth/auth.routes.ts
```

## Common Commands

```bash
# Development
npm start                 # Start dev server
npm run build            # Production build
npm test                 # Run tests

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check formatting

# Component Generation
npx ng generate component <path> --standalone
npx ng generate service <path>
npx ng generate guard <path> --functional
```

## Project Structure

```
src/app/
├── core/           # Services, guards, interceptors
├── features/       # Feature modules (auth, seeker, referrer, employer, admin)
├── shared/         # Shared components, directives, pipes
├── app.config.ts   # App configuration (NgRx, HTTP, etc.)
└── app.routes.ts   # Main routing
```

## Next Steps

1. Read the full [README.md](./README.md)
2. Check [Frontend Specification](/home/user/AiDeepRef/DEVROOM/Whimsical/DeepRef-Frontend-Spec-ALIGNED-v2.1.md)
3. Review [Design System](/home/user/AiDeepRef/DEVROOM/DeepRef-Design-System.md)
4. Start creating components for the routes defined in the spec

## Need Help?

- Full documentation: `README.md`
- Setup details: `/home/user/AiDeepRef/files/research_notes/frontend-setup-summary.md`
- Angular docs: https://angular.dev

---

**Happy Coding! 🚀**
