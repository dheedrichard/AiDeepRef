import { Routes } from '@angular/router';

/**
 * DeepRef Application Routes
 *
 * Route Structure:
 * - / (root) → Auth routes (welcome, signin, signup)
 * - /app/seeker → Seeker features (dashboard, requests, library, bundles)
 * - /r → Referrer features (invite, verify, respond)
 * - /b → Employer features (bundle viewer, verification, reach-back)
 * - /admin → Admin features (verification queue, disputes)
 *
 * Note: All routes use lazy loading for optimal performance
 */
export const routes: Routes = [
  // Default route - redirect to auth/welcome
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },

  // Auth routes (public)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Seeker routes (protected with auth and KYC guards)
  {
    path: 'app/seeker',
    loadChildren: () => import('./features/seeker/seeker.routes').then((m) => m.SEEKER_ROUTES),
    // Protected with auth guard and KYC guard
    canActivate: [
      () => import('./features/auth/guards/auth.guard').then((m) => m.authGuard),
      () => import('./features/auth/guards/kyc.guard').then((m) => m.kycGuard),
    ],
  },

  // Referrer routes (public with verification)
  // {
  //   path: 'r',
  //   loadChildren: () =>
  //     import('./features/referrer/referrer.routes').then((m) => m.REFERRER_ROUTES),
  // },

  // Employer routes (public with verification)
  // {
  //   path: 'b',
  //   loadChildren: () =>
  //     import('./features/employer/employer.routes').then((m) => m.EMPLOYER_ROUTES),
  // },

  // Admin routes (protected - will add admin guard later)
  // {
  //   path: 'admin',
  //   loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  //   // TODO: Add admin auth guard
  //   // canActivate: [AdminGuard],
  // },

  // Wildcard route - 404 page (will create later)
  {
    path: '**',
    redirectTo: 'auth',
  },
];
