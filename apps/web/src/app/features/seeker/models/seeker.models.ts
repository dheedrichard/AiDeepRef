/**
 * Seeker Models and Types
 *
 * Defines all seeker-related types, interfaces, and enums
 * for references, requests, and bundles.
 */

/**
 * Reference Request Status
 */
export enum ReferenceRequestStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PENDING = 'pending',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

/**
 * Reference Format Types
 */
export enum ReferenceFormat {
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
}

/**
 * Bundle Status
 */
export enum BundleStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
}

/**
 * Question Model
 */
export interface Question {
  id: string;
  text: string;
  category?: string;
  isAiGenerated: boolean;
  isRequired: boolean;
}

/**
 * Reference Request Model
 */
export interface ReferenceRequest {
  id: string;
  seekerId: string;
  referrerName: string;
  referrerEmail: string;
  company: string;
  role: string;
  workingRelationship?: string;
  questions: Question[];
  allowedFormats: ReferenceFormat[];
  allowEmployerReachback: boolean;
  status: ReferenceRequestStatus;
  sentAt?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reference Model
 */
export interface Reference {
  id: string;
  requestId: string;
  seekerId: string;
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  company: string;
  role: string;
  format: ReferenceFormat;
  rcsScore: number;
  status: ReferenceRequestStatus;
  content?: string; // For text references
  mediaUrl?: string; // For video/audio references
  authenticityScore?: number;
  deepfakeScore?: number;
  isVerified: boolean;
  responses: QuestionResponse[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Question Response
 */
export interface QuestionResponse {
  questionId: string;
  questionText: string;
  answer: string;
  timestamp?: number; // For video/audio responses
}

/**
 * Bundle Model
 */
export interface Bundle {
  id: string;
  seekerId: string;
  title: string;
  description?: string;
  referenceIds: string[];
  references: Reference[];
  aggregatedRCS: number;
  shareLink: string;
  expiryDate?: string;
  password?: string;
  hasPassword: boolean;
  views: number;
  downloads: number;
  status: BundleStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard Statistics
 */
export interface DashboardStats {
  totalReferences: number;
  completedReferences: number;
  pendingReferences: number;
  averageRCS: number;
  totalBundles: number;
  activeBundles: number;
  totalRequests: number;
  pendingRequests: number;
}

/**
 * Recent Activity Item
 */
export interface RecentActivity {
  id: string;
  type: 'request_sent' | 'reference_received' | 'bundle_created' | 'bundle_viewed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create Reference Request Payload
 */
export interface CreateReferenceRequestPayload {
  referrerName: string;
  referrerEmail: string;
  company: string;
  role: string;
  workingRelationship?: string;
  questions: Question[];
  allowedFormats: ReferenceFormat[];
  allowEmployerReachback: boolean;
}

/**
 * Create Bundle Payload
 */
export interface CreateBundlePayload {
  title: string;
  description?: string;
  referenceIds: string[];
  expiryDate?: string;
  password?: string;
}

/**
 * Update Bundle Payload
 */
export interface UpdateBundlePayload {
  title?: string;
  description?: string;
  referenceIds?: string[];
  expiryDate?: string;
  password?: string;
  status?: BundleStatus;
}

/**
 * AI Question Generation Request
 */
export interface GenerateQuestionsRequest {
  jobDescription: string;
  role: string;
  industry?: string;
  experienceLevel?: string;
}

/**
 * AI Question Generation Response
 */
export interface GenerateQuestionsResponse {
  questions: Question[];
  generatedAt: string;
}

/**
 * Reference Filter Options
 */
export interface ReferenceFilters {
  status?: ReferenceRequestStatus[];
  format?: ReferenceFormat[];
  minRCS?: number;
  maxRCS?: number;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

/**
 * Bundle Analytics
 */
export interface BundleAnalytics {
  bundleId: string;
  views: number;
  downloads: number;
  viewHistory: BundleViewEvent[];
  downloadHistory: BundleDownloadEvent[];
}

/**
 * Bundle View Event
 */
export interface BundleViewEvent {
  id: string;
  timestamp: string;
  viewerIp?: string;
  viewerLocation?: string;
  duration?: number;
}

/**
 * Bundle Download Event
 */
export interface BundleDownloadEvent {
  id: string;
  timestamp: string;
  downloaderIp?: string;
  downloaderLocation?: string;
  format: 'pdf' | 'json';
}

/**
 * Seeker State (NgRx)
 */
export interface SeekerState {
  // Dashboard
  dashboardStats: DashboardStats | null;
  recentActivity: RecentActivity[];

  // Reference Requests
  requests: ReferenceRequest[];
  selectedRequest: ReferenceRequest | null;

  // References
  references: Reference[];
  selectedReference: Reference | null;
  referenceFilters: ReferenceFilters;

  // Bundles
  bundles: Bundle[];
  selectedBundle: Bundle | null;

  // UI State
  isLoading: boolean;
  isLoadingRequests: boolean;
  isLoadingReferences: boolean;
  isLoadingBundles: boolean;
  error: string | null;
}
