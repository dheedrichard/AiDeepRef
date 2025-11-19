/**
 * Auth Actions
 *
 * Defines all NgRx actions for authentication feature.
 * Using createActionGroup for type-safe action creators.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  User,
  AuthToken,
  SignUpRequest,
  SignUpResponse,
  SignInRequest,
  SignInResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  KycDocumentUploadRequest,
  KycDocumentUploadResponse,
  KycSelfieUploadRequest,
  KycSelfieUploadResponse,
  KycVerificationResult,
} from '../models/auth.models';

/**
 * Auth Actions Group
 */
export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    // Sign Up Actions
    'Sign Up': props<{ request: SignUpRequest }>(),
    'Sign Up Success': props<{ response: SignUpResponse }>(),
    'Sign Up Failure': props<{ error: string }>(),

    // Sign In (Magic Link) Actions
    'Sign In': props<{ request: SignInRequest }>(),
    'Sign In Success': props<{ response: SignInResponse }>(),
    'Sign In Failure': props<{ error: string }>(),

    // Resend Magic Link Actions
    'Resend Magic Link': props<{ email: string }>(),
    'Resend Magic Link Success': emptyProps(),
    'Resend Magic Link Failure': props<{ error: string }>(),

    // Verify Email Actions
    'Verify Email': props<{ request: VerifyEmailRequest }>(),
    'Verify Email Success': props<{ response: VerifyEmailResponse }>(),
    'Verify Email Failure': props<{ error: string }>(),

    // Logout Action
    Logout: emptyProps(),
    'Logout Success': emptyProps(),

    // Load User from Storage (on app init)
    'Load User From Storage': emptyProps(),
    'Load User From Storage Success': props<{ user: User; token: AuthToken }>(),
    'Load User From Storage Failure': emptyProps(),

    // Update User
    'Update User': props<{ user: Partial<User> }>(),
    'Update User Success': props<{ user: User }>(),

    // KYC Actions
    'Upload Kyc Documents': props<{ request: KycDocumentUploadRequest }>(),
    'Upload Kyc Documents Success': props<{ response: KycDocumentUploadResponse }>(),
    'Upload Kyc Documents Failure': props<{ error: string }>(),

    'Upload Kyc Selfie': props<{ request: KycSelfieUploadRequest }>(),
    'Upload Kyc Selfie Success': props<{ response: KycSelfieUploadResponse }>(),
    'Upload Kyc Selfie Failure': props<{ error: string }>(),

    'Check Kyc Status': props<{ userId: string }>(),
    'Check Kyc Status Success': props<{ result: KycVerificationResult }>(),
    'Check Kyc Status Failure': props<{ error: string }>(),

    // Clear Error
    'Clear Error': emptyProps(),
  },
});
