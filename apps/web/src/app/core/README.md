# Core Module

This directory contains core application services, guards, and interceptors that are used globally across the application.

## Structure

- **guards/** - Route guards for authentication and authorization
- **interceptors/** - HTTP interceptors for request/response handling
- **services/** - Core singleton services (auth, API, storage, etc.)

## Usage

Core services are provided at the application level in `app.config.ts` and are available throughout the application as singletons.
