/**
 * Employer Feature Routes
 *
 * Defines routing configuration for employer bundle viewing features.
 * Includes guards for session validation.
 */

import { Routes } from '@angular/router';
import { bundleSessionGuard } from './guards/bundle-session.guard';

export const EMPLOYER_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'bundle-access',
    pathMatch: 'full',
  },
  {
    path: 'bundle-access',
    loadComponent: () =>
      import('./pages/bundle-access/bundle-access.component').then(
        (m) => m.BundleAccessComponent
      ),
  },
  {
    path: 'bundle-viewer/:id',
    loadComponent: () =>
      import('./pages/bundle-viewer/bundle-viewer.component').then(
        (m) => m.BundleViewerComponent
      ),
    canActivate: [bundleSessionGuard],
  },
  {
    path: 'reference-detail/:id',
    loadComponent: () =>
      import('./pages/reference-detail/reference-detail.component').then(
        (m) => m.ReferenceDetailComponent
      ),
    canActivate: [bundleSessionGuard],
  },
  {
    path: 'reach-back/:referenceId',
    loadComponent: () =>
      import('./pages/reach-back/reach-back.component').then(
        (m) => m.ReachBackComponent
      ),
    canActivate: [bundleSessionGuard],
  },
];
