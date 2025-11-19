import { Routes } from '@angular/router';

export const SEEKER_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard - DeepRef',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
        title: 'Profile Setup - DeepRef',
      },
      {
        path: 'requests',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/requests/requests-list/requests-list.component').then(
                (m) => m.RequestsListComponent
              ),
            title: 'My Requests - DeepRef',
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/requests/new-request/new-request.component').then(
                (m) => m.NewRequestComponent
              ),
            title: 'New Reference Request - DeepRef',
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/requests/request-detail/request-detail.component').then(
                (m) => m.RequestDetailComponent
              ),
            title: 'Request Detail - DeepRef',
          },
        ],
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./pages/library/library.component').then((m) => m.LibraryComponent),
        title: 'References Library - DeepRef',
      },
      {
        path: 'bundles',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/bundles/bundles-list/bundles-list.component').then(
                (m) => m.BundlesListComponent
              ),
            title: 'My Bundles - DeepRef',
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/bundles/create-bundle/create-bundle.component').then(
                (m) => m.CreateBundleComponent
              ),
            title: 'Create Bundle - DeepRef',
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/bundles/bundle-viewer/bundle-viewer.component').then(
                (m) => m.BundleViewerComponent
              ),
            title: 'Bundle Viewer - DeepRef',
          },
        ],
      },
      {
        path: 'verify-id',
        loadComponent: () =>
          import('./pages/verify-id/verify-id.component').then((m) => m.VerifyIdComponent),
        title: 'ID Verification - DeepRef',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
        title: 'Settings - DeepRef',
      },
    ],
  },
];
