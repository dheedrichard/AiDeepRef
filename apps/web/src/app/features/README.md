# Features Module

This directory contains all feature modules organized by domain. Each feature is a standalone module with its own components, services, and routes.

## Features

- **auth/** - Authentication and authorization flows (sign in, sign up, verify email)
- **seeker/** - Job seeker features (dashboard, requests, library, bundles, profile)
- **referrer/** - Referrer features (invite landing, verification, response submission)
- **employer/** - Employer features (bundle viewer, verification, reach-back requests)
- **admin/** - Admin features (verification queue, disputes, trust & safety)

## Structure

Each feature directory should contain:
- Components specific to that feature
- Feature-specific services
- Feature routing module
- Models/interfaces specific to that feature
- State management (NgRx store, effects, reducers) if needed

## Routing

Each feature defines its own routes which are lazy-loaded in the main `app.routes.ts`.
