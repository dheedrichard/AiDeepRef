import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server-side route configuration for SSR
 *
 * Configures which routes should be:
 * - Prerendered: Generated at build time (static routes)
 * - Server: Rendered on each request (dynamic routes)
 * - Client: Rendered only on client side (protected routes)
 */
export const serverRoutes: ServerRoute[] = [
  // Prerender public static routes at build time
  {
    path: 'auth/welcome',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'auth/signin',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'auth/signup',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'auth/forgot-password',
    renderMode: RenderMode.Prerender,
  },

  // Server-side render for authenticated routes (for better performance)
  // These will be rendered on the server with each request
  {
    path: 'app/seeker/**',
    renderMode: RenderMode.Server,
  },

  // Client-side render for other routes (fallback)
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
