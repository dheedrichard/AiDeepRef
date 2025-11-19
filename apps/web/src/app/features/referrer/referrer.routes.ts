import { Routes } from '@angular/router';

export const REFERRER_ROUTES: Routes = [
  {
    path: 'invite/:token',
    loadComponent: () =>
      import('./pages/invite-landing/invite-landing.component').then(
        (m) => m.InviteLandingComponent
      ),
    title: 'Reference Request - DeepRef',
  },
  {
    path: 'verify/email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
    title: 'Verify Email - DeepRef',
  },
  {
    path: 'verify/phone',
    loadComponent: () =>
      import('./pages/verify-phone/verify-phone.component').then((m) => m.VerifyPhoneComponent),
    title: 'Verify Phone - DeepRef',
  },
  {
    path: 'respond/:requestId',
    children: [
      {
        path: 'mode',
        loadComponent: () =>
          import('./pages/choose-mode/choose-mode.component').then((m) => m.ChooseModeComponent),
        title: 'Choose Response Mode - DeepRef',
      },
      {
        path: 'record',
        loadComponent: () =>
          import('./pages/record-response/record-response.component').then(
            (m) => m.RecordResponseComponent
          ),
        title: 'Record Response - DeepRef',
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./pages/review-response/review-response.component').then(
            (m) => m.ReviewResponseComponent
          ),
        title: 'Review & Submit - DeepRef',
      },
    ],
  },
  {
    path: 'app/submissions',
    loadComponent: () =>
      import('./pages/submissions/submissions.component').then((m) => m.SubmissionsComponent),
    title: 'My Submissions - DeepRef',
  },
];
