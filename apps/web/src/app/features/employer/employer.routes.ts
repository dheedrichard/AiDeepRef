import { Routes } from '@angular/router';

export const EMPLOYER_ROUTES: Routes = [
  {
    path: ':bundleId',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/bundle-viewer/bundle-viewer.component').then(
            (m) => m.BundleViewerComponent
          ),
        title: 'Reference Bundle - DeepRef',
      },
      {
        path: 'verify',
        loadComponent: () =>
          import('./pages/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
        title: 'Verify Email - DeepRef',
      },
      {
        path: 'reachback',
        loadComponent: () =>
          import('./pages/reachback/reachback.component').then((m) => m.ReachbackComponent),
        title: 'Request Verification - DeepRef',
      },
    ],
  },
];
