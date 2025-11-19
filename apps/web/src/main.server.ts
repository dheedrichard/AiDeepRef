import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

/**
 * Server-side bootstrap for Angular SSR
 *
 * This is the entry point for server-side rendering.
 * It uses the server-specific configuration from app.config.server.ts
 */
const bootstrap = () => bootstrapApplication(App, config);

export default bootstrap;
