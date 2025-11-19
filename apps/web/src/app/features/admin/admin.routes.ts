import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'verification',
        pathMatch: 'full',
      },
      {
        path: 'verification',
        loadComponent: () =>
          import('./pages/verification-queue/verification-queue.component').then(
            (m) => m.VerificationQueueComponent
          ),
        title: 'Verification Queue - Admin - DeepRef',
      },
      {
        path: 'disputes',
        loadComponent: () =>
          import('./pages/disputes/disputes.component').then((m) => m.DisputesComponent),
        title: 'Disputes & Retracts - Admin - DeepRef',
      },
    ],
  },
];
