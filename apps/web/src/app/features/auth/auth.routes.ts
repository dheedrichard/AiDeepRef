import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'welcome',
        pathMatch: 'full',
      },
      {
        path: 'welcome',
        loadComponent: () =>
          import('./pages/welcome/welcome.component').then((m) => m.WelcomeComponent),
        title: 'Welcome to DeepRef',
      },
      {
        path: 'signin',
        loadComponent: () =>
          import('./pages/signin/signin.component').then((m) => m.SigninComponent),
        title: 'Sign In - DeepRef',
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./pages/signup/signup.component').then((m) => m.SignupComponent),
        title: 'Create Account - DeepRef',
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./pages/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent
          ),
        title: 'Verify Email - DeepRef',
      },
      {
        path: 'id-capture',
        loadComponent: () =>
          import('./pages/id-capture/id-capture.component').then((m) => m.IdCaptureComponent),
        title: 'ID Verification - DeepRef',
      },
      {
        path: 'selfie-capture',
        loadComponent: () =>
          import('./pages/selfie-capture/selfie-capture.component').then(
            (m) => m.SelfieCaptureComponent
          ),
        title: 'Selfie Verification - DeepRef',
      },
      {
        path: 'verification-result',
        loadComponent: () =>
          import('./pages/verification-result/verification-result.component').then(
            (m) => m.VerificationResultComponent
          ),
        title: 'Verification Result - DeepRef',
      },
    ],
  },
];
