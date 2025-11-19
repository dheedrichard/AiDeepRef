/**
 * Referrer Models
 *
 * Type definitions for the referrer feature.
 * Includes interfaces for reference requests, responses, and state.
 */

/**
 * Reference Request Status
 */
export type ReferenceRequestStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';

/**
 * Reference Format Type
 */
export type ReferenceFormat = 'video' | 'audio' | 'text';

/**
 * Question for Reference
 */
export interface ReferenceQuestion {
  id: string;
  text: string;
  required: boolean;
  order: number;
}

/**
 * Seeker Information
 */
export interface SeekerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  role?: string;
  profileImageUrl?: string;
}

/**
 * Reference Request
 */
export interface ReferenceRequest {
  id: string;
  seekerId: string;
  seeker: SeekerInfo;
  status: ReferenceRequestStatus;
  questions: ReferenceQuestion[];
  allowedFormats: ReferenceFormat[];
  allowEmployerReachback: boolean;
  context?: string;
  requestedAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
}

/**
 * Response Attachment
 */
export interface ResponseAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
}

/**
 * Question Response
 */
export interface QuestionResponse {
  questionId: string;
  answer: string;
  mediaUrl?: string;
  mediaType?: ReferenceFormat;
}

/**
 * Reference Response (Draft or Submitted)
 */
export interface ReferenceResponse {
  id: string;
  referenceRequestId: string;
  format: ReferenceFormat;
  responses: QuestionResponse[];
  attachments: ResponseAttachment[];
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
}

/**
 * Reference with RCS Score
 */
export interface CompletedReference {
  id: string;
  referenceRequestId: string;
  seekerId: string;
  seeker: SeekerInfo;
  format: ReferenceFormat;
  rcsScore: number;
  authenticityScore: number;
  submittedAt: Date;
  viewCount: number;
}

/**
 * Referrer Statistics
 */
export interface ReferrerStats {
  totalRequests: number;
  pendingRequests: number;
  completedReferences: number;
  averageRcsScore: number;
  responseRate: number;
}

/**
 * Notification
 */
export interface ReferrerNotification {
  id: string;
  type: 'new_request' | 'reminder' | 'expiring_soon';
  title: string;
  message: string;
  referenceRequestId?: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Media Recording State
 */
export interface MediaRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  blobUrl?: string;
  blob?: Blob;
}

/**
 * Upload Progress
 */
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

/**
 * Referrer State (NgRx)
 */
export interface ReferrerState {
  // Requests
  requests: ReferenceRequest[];
  selectedRequest: ReferenceRequest | null;

  // Completed References
  completedReferences: CompletedReference[];

  // Draft Responses
  draftResponses: Map<string, ReferenceResponse>;

  // Statistics
  stats: ReferrerStats | null;

  // Notifications
  notifications: ReferrerNotification[];
  unreadCount: number;

  // Upload Progress
  uploads: Map<string, UploadProgress>;

  // Loading States
  isLoading: boolean;
  isSubmitting: boolean;

  // Errors
  error: string | null;
}

/**
 * API Request/Response Types
 */

export interface AcceptReferenceRequestPayload {
  referenceRequestId: string;
}

export interface DeclineReferenceRequestPayload {
  referenceRequestId: string;
  reason?: string;
}

export interface SubmitReferenceResponsePayload {
  referenceRequestId: string;
  format: ReferenceFormat;
  responses: QuestionResponse[];
  attachments?: ResponseAttachment[];
}

export interface SubmitReferenceResponseResponse {
  referenceId: string;
  rcsScore: number;
  authenticityScore: number;
}

export interface SaveDraftPayload {
  referenceRequestId: string;
  format: ReferenceFormat;
  responses: QuestionResponse[];
  attachments?: ResponseAttachment[];
}

export interface MediaUploadPayload {
  file: File;
  referenceRequestId: string;
  questionId?: string;
}

export interface MediaUploadResponse {
  fileId: string;
  url: string;
  authenticityScore?: number;
  deepfakeProbability?: number;
}
