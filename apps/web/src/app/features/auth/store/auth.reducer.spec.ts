/**
 * Auth Reducer Tests
 */

import { authReducer, initialAuthState } from './auth.reducer';
import { AuthActions } from './auth.actions';
import { UserRole, KycStatus } from '../models/auth.models';

describe('Auth Reducer', () => {
  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = authReducer(initialAuthState, action as any);

      expect(state).toBe(initialAuthState);
    });
  });

  describe('Sign Up', () => {
    it('should set loading to true on signUp', () => {
      const action = AuthActions.signUp({
        request: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123',
          role: UserRole.SEEKER,
          keepMeSignedIn: true,
        },
      });

      const state = authReducer(initialAuthState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set user and token on signUpSuccess', () => {
      const response = {
        user: {
          id: '1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SEEKER,
          kycStatus: KycStatus.NOT_STARTED,
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        },
        message: 'User created successfully',
      };

      const action = AuthActions.signUpSuccess({ response });
      const state = authReducer(initialAuthState, action);

      expect(state.user).toEqual(response.user);
      expect(state.token).toEqual(response.token);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on signUpFailure', () => {
      const error = 'Sign up failed';
      const action = AuthActions.signUpFailure({ error });
      const state = authReducer(initialAuthState, action);

      expect(state.error).toBe(error);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should reset to initial state on logoutSuccess', () => {
      const authenticatedState = {
        ...initialAuthState,
        user: {
          id: '1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SEEKER,
          kycStatus: KycStatus.NOT_STARTED,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000,
        },
        isAuthenticated: true,
      };

      const action = AuthActions.logoutSuccess();
      const state = authReducer(authenticatedState, action);

      expect(state).toEqual(initialAuthState);
    });
  });

  describe('KYC Actions', () => {
    it('should update KYC status on uploadKycDocumentsSuccess', () => {
      const stateWithUser = {
        ...initialAuthState,
        user: {
          id: '1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SEEKER,
          kycStatus: KycStatus.NOT_STARTED,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const action = AuthActions.uploadKycDocumentsSuccess({
        response: {
          message: 'Documents uploaded',
          kycStatus: KycStatus.SELFIE_PENDING,
          uploadId: 'upload-id',
        },
      });

      const state = authReducer(stateWithUser, action);

      expect(state.user?.kycStatus).toBe(KycStatus.SELFIE_PENDING);
      expect(state.isLoading).toBe(false);
    });

    it('should update KYC status on uploadKycSelfieSuccess', () => {
      const stateWithUser = {
        ...initialAuthState,
        user: {
          id: '1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SEEKER,
          kycStatus: KycStatus.SELFIE_PENDING,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const action = AuthActions.uploadKycSelfieSuccess({
        response: {
          message: 'Selfie uploaded',
          kycStatus: KycStatus.UNDER_REVIEW,
          verificationId: 'verification-id',
        },
      });

      const state = authReducer(stateWithUser, action);

      expect(state.user?.kycStatus).toBe(KycStatus.UNDER_REVIEW);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Clear Error', () => {
    it('should clear error', () => {
      const stateWithError = {
        ...initialAuthState,
        error: 'Some error',
      };

      const action = AuthActions.clearError();
      const state = authReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });
});
