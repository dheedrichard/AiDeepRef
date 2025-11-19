import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/**
 * Server-specific application configuration
 *
 * Extends the base app configuration with server-side specific providers:
 * - provideServerRendering(): Enables server-side rendering
 * - provideServerRoutesConfig(): Provides route configuration for SSR
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRoutesConfig(serverRoutes),
  ],
};

/**
 * Merged application configuration for server
 *
 * Combines the base app config with server-specific config
 */
export const config = mergeApplicationConfig(appConfig, serverConfig);
