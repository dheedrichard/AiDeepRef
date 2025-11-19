/**
 * Employer Models and Types
 *
 * Defines all employer-related types, interfaces, and enums
 * used throughout the employer feature module.
 */

/**
 * Reference Format Types
 */
export enum ReferenceFormat {
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
}

/**
 * Reference Status
 */
export enum ReferenceStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

/**
 * Bundle Access Type
 */
export enum BundleAccessType {
  GUEST = 'guest',
  AUTHENTICATED = 'authenticated',
}

/**
 * Reach-Back Request Status
 */
export enum ReachBackStatus {
  PENDING = 'pending',
  SENT = 'sent',
  RESPONDED = 'responded',
  DECLINED = 'declined',
}

/**
 * Media Type
 */
export enum MediaType {
  VIDEO_MP4 = 'video/mp4',
  VIDEO_WEBM = 'video/webm',
  AUDIO_MP3 = 'audio/mp3',
  AUDIO_AAC = 'audio/aac',
  AUDIO_WAV = 'audio/wav',
}

/**
 * Seeker Information (anonymized)
 */
export interface SeekerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string; // Only if allowed by seeker
  profilePictureUrl?: string;
  headline?: string;
}

/**
 * Referrer Information (anonymized based on settings)
 */
export interface ReferrerInfo {
  id: string;
  name?: string; // May be anonymized
  company?: string;
  role?: string;
  relationship?: string;
  isAnonymous: boolean;
}

/**
 * RCS (Reference Credibility Score) Breakdown
 */
export interface RcsScoreBreakdown {
  overall: number; // 0-100
  authenticity: number; // 0-100
  consistency: number; // 0-100
  detail: number; // 0-100
  sentiment: number; // 0-100
  timestamp: string;
}

/**
 * Reference Question
 */
export interface ReferenceQuestion {
  id: string;
  text: string;
  category?: string;
  order: number;
}

/**
 * Reference Answer
 */
export interface ReferenceAnswer {
  questionId: string;
  question: string;
  answer: string;
  timestamp?: string;
}

/**
 * Media Content
 */
export interface MediaContent {
  id: string;
  type: MediaType;
  url: string; // Proxied URL
  streamingUrl?: string; // For large files
  thumbnailUrl?: string;
  duration?: number; // In seconds
  size: number; // In bytes
  transcription?: string;
  captionsUrl?: string;
  waveformData?: number[]; // For audio visualization
}

/**
 * Reference Model
 */
export interface Reference {
  id: string;
  seekerId: string;
  referrerId: string;
  referrer: ReferrerInfo;
  status: ReferenceStatus;
  format: ReferenceFormat;
  rcsScore: RcsScoreBreakdown;
  questions: ReferenceQuestion[];
  answers: ReferenceAnswer[];
  mediaContent?: MediaContent;
  textContent?: string;
  submittedAt: string;
  authenticityVerified: boolean;
  authenticityScore?: number; // 0-100
  deepfakeProbability?: number; // 0-1
  allowReachBack: boolean;
  metadata?: {
    deviceInfo?: string;
    location?: string;
    recordingDate?: string;
  };
}

/**
 * Bundle Statistics
 */
export interface BundleStatistics {
  totalReferences: number;
  completedReferences: number;
  videoReferences: number;
  audioReferences: number;
  textReferences: number;
  averageRcsScore: number;
  viewCount: number;
  lastViewedAt?: string;
}

/**
 * Bundle Model
 */
export interface Bundle {
  id: string;
  title: string;
  description?: string;
  seeker: SeekerInfo;
  references: Reference[];
  aggregatedRcs: RcsScoreBreakdown;
  statistics: BundleStatistics;
  shareLink: string;
  isPasswordProtected: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  allowPrint: boolean;
  allowDownload: boolean;
  watermarkEnabled: boolean;
}

/**
 * Bundle Access Session
 */
export interface BundleAccessSession {
  bundleId: string;
  accessType: BundleAccessType;
  sessionId: string;
  expiresAt: number;
  viewerId?: string; // If authenticated
  viewerEmail?: string;
}

/**
 * Bundle Access Request
 */
export interface BundleAccessRequest {
  bundleId?: string;
  shareLink?: string;
  password?: string;
  viewerEmail?: string; // For guest access tracking
}

/**
 * Bundle Access Response
 */
export interface BundleAccessResponse {
  success: boolean;
  session: BundleAccessSession;
  bundle: Bundle;
  message?: string;
}

/**
 * Reach-Back Request
 */
export interface ReachBackRequest {
  referenceId: string;
  bundleId: string;
  question: string;
  context?: string;
  requestorEmail?: string; // For guest users
}

/**
 * Reach-Back Response
 */
export interface ReachBackResponse {
  requestId: string;
  status: ReachBackStatus;
  message: string;
  estimatedResponseTime?: string;
}

/**
 * Analytics Event Types
 */
export enum AnalyticsEventType {
  BUNDLE_VIEW = 'bundle_view',
  BUNDLE_ACCESS = 'bundle_access',
  REFERENCE_VIEW = 'reference_view',
  REFERENCE_PLAY = 'reference_play',
  REFERENCE_DOWNLOAD = 'reference_download',
  REACH_BACK_REQUEST = 'reach_back_request',
  TIME_SPENT = 'time_spent',
}

/**
 * Analytics Event
 */
export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  bundleId: string;
  referenceId?: string;
  sessionId: string;
  timestamp: number;
  metadata?: {
    duration?: number; // For time spent events
    playbackPosition?: number; // For media events
    downloadFormat?: string;
    [key: string]: unknown;
  };
}

/**
 * Filter Options for References
 */
export interface ReferenceFilterOptions {
  format?: ReferenceFormat;
  minRcsScore?: number;
  sortBy?: 'date' | 'rcsScore' | 'format';
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
}

/**
 * Employer State
 */
export interface EmployerState {
  currentBundle: Bundle | null;
  currentReference: Reference | null;
  session: BundleAccessSession | null;
  isLoading: boolean;
  error: string | null;
  filterOptions: ReferenceFilterOptions;
  reachBackRequests: Map<string, ReachBackResponse>;
  analytics: {
    viewStartTime: number | null;
    eventsQueue: AnalyticsEvent[];
  };
}

/**
 * Video Player State
 */
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;
  isMuted: boolean;
  captionsEnabled: boolean;
}

/**
 * Audio Player State
 */
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  waveformData?: number[];
}

/**
 * Export Format Options
 */
export enum ExportFormat {
  PDF = 'pdf',
  JSON = 'json',
  CSV = 'csv',
}

/**
 * Export Request
 */
export interface ExportRequest {
  bundleId: string;
  referenceIds?: string[];
  format: ExportFormat;
  includeMedia: boolean;
}
