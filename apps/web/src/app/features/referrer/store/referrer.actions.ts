/**
 * Referrer Actions
 *
 * NgRx actions for the referrer feature.
 * Handles all referrer-related state mutations.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  ReferenceRequest,
  CompletedReference,
  ReferrerStats,
  ReferrerNotification,
  SubmitReferenceResponsePayload,
  SubmitReferenceResponseResponse,
  MediaUploadPayload,
  MediaUploadResponse,
  SaveDraftPayload,
  ReferenceResponse,
  UploadProgress,
} from '../models/referrer.models';

export const ReferrerActions = createActionGroup({
  source: 'Referrer',
  events: {
    // Load Requests
    'Load Requests': emptyProps(),
    'Load Requests Success': props<{ requests: ReferenceRequest[] }>(),
    'Load Requests Failure': props<{ error: string }>(),

    // Load Single Request
    'Load Request': props<{ requestId: string }>(),
    'Load Request Success': props<{ request: ReferenceRequest }>(),
    'Load Request Failure': props<{ error: string }>(),

    // Accept Request
    'Accept Request': props<{ requestId: string }>(),
    'Accept Request Success': props<{ request: ReferenceRequest }>(),
    'Accept Request Failure': props<{ error: string }>(),

    // Decline Request
    'Decline Request': props<{ requestId: string; reason?: string }>(),
    'Decline Request Success': props<{ requestId: string }>(),
    'Decline Request Failure': props<{ error: string }>(),

    // Submit Response
    'Submit Response': props<{ payload: SubmitReferenceResponsePayload }>(),
    'Submit Response Success': props<{ response: SubmitReferenceResponseResponse }>(),
    'Submit Response Failure': props<{ error: string }>(),

    // Save Draft
    'Save Draft': props<{ payload: SaveDraftPayload }>(),
    'Save Draft Success': props<{ draft: ReferenceResponse }>(),
    'Save Draft Failure': props<{ error: string }>(),

    // Load Draft
    'Load Draft': props<{ referenceRequestId: string }>(),
    'Load Draft Success': props<{ draft: ReferenceResponse | null }>(),
    'Load Draft Failure': props<{ error: string }>(),

    // Upload Media
    'Upload Media': props<{ payload: MediaUploadPayload }>(),
    'Upload Media Progress': props<{ progress: UploadProgress }>(),
    'Upload Media Success': props<{ response: MediaUploadResponse }>(),
    'Upload Media Failure': props<{ fileId: string; error: string }>(),

    // Load Completed References
    'Load Completed References': emptyProps(),
    'Load Completed References Success': props<{ references: CompletedReference[] }>(),
    'Load Completed References Failure': props<{ error: string }>(),

    // Load Statistics
    'Load Statistics': emptyProps(),
    'Load Statistics Success': props<{ stats: ReferrerStats }>(),
    'Load Statistics Failure': props<{ error: string }>(),

    // Load Notifications
    'Load Notifications': emptyProps(),
    'Load Notifications Success': props<{ notifications: ReferrerNotification[] }>(),
    'Load Notifications Failure': props<{ error: string }>(),

    // Mark Notification as Read
    'Mark Notification Read': props<{ notificationId: string }>(),
    'Mark Notification Read Success': props<{ notificationId: string }>(),
    'Mark Notification Read Failure': props<{ error: string }>(),

    // Clear Error
    'Clear Error': emptyProps(),

    // Clear Selected Request
    'Clear Selected Request': emptyProps(),
  },
});
