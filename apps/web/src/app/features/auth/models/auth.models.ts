/**
 * Auth Models and Types
 *
 * Defines all authentication-related types, interfaces, and enums
 * used throughout the auth feature module.
 */

/**
 * User Role Types
 */
export enum UserRole {
  SEEKER = 'seeker',
  REFERRER = 'referrer',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
}

/**
 * KYC Verification Status
 */
export enum KycStatus {
  NOT_STARTED = 'not_started',
  ID_PENDING = 'id_pending',
  SELFIE_PENDING = 'selfie_pending',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

/**
 * Document Types for ID Verification
 */
export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'driversLicense',
  NATIONAL_ID = 'nationalId',
}

/**
 * User Model
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  kycStatus: KycStatus;
  emailVerified: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth Token
 */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Auth State
 */
export interface AuthState {
  user: User | null;
  token: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  keepMeSignedIn: boolean;
}

/**
 * Sign Up Request
 */
export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  keepMeSignedIn: boolean;
}

/**
 * Sign Up Response
 */
export interface SignUpResponse {
  user: User;
  token: AuthToken;
  message: string;
}

/**
 * Sign In Request (Magic Link)
 */
export interface SignInRequest {
  email: string;
}

/**
 * Sign In Response
 */
export interface SignInResponse {
  message: string;
  magicLinkSent: boolean;
}

/**
 * Verify Email Request
 */
export interface VerifyEmailRequest {
  token: string;
}

/**
 * Verify Email Response
 */
export interface VerifyEmailResponse {
  user: User;
  token: AuthToken;
  message: string;
}

/**
 * KYC Document Upload Request
 */
export interface KycDocumentUploadRequest {
  userId: string;
  documentType: DocumentType;
  frontImage: File;
  backImage?: File;
  consent: boolean;
}

/**
 * KYC Document Upload Response
 */
export interface KycDocumentUploadResponse {
  message: string;
  kycStatus: KycStatus;
  uploadId: string;
}

/**
 * KYC Selfie Upload Request
 */
export interface KycSelfieUploadRequest {
  userId: string;
  selfieImage: File;
  livenessData?: unknown; // Placeholder for liveness detection data
}

/**
 * KYC Selfie Upload Response
 */
export interface KycSelfieUploadResponse {
  message: string;
  kycStatus: KycStatus;
  verificationId: string;
}

/**
 * KYC Verification Result
 */
export interface KycVerificationResult {
  status: KycStatus;
  verifiedAt?: string;
  rejectionReason?: string;
  needsReview: boolean;
}

/**
 * API Error Response
 */
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
