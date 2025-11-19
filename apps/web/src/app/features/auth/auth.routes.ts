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
      // TODO: Uncomment routes below after creating components
      // {
      //   path: 'signin',
      //   loadComponent: () =>
      //     import('./pages/signin/signin.component').then((m) => m.SigninComponent),
      //   title: 'Sign In - DeepRef',
      // },
      // {
      //   path: 'signup',
      //   loadComponent: () =>
      //     import('./pages/signup/signup.component').then((m) => m.SignupComponent),
      //   title: 'Create Account - DeepRef',
      // },
      // {
      //   path: 'verify-email',
      //   loadComponent: () =>
      //     import('./pages/verify-email/verify-email.component').then(
      //       (m) => m.VerifyEmailComponent
      //     ),
      //   title: 'Verify Email - DeepRef',
      // },
    ],
  },
];
