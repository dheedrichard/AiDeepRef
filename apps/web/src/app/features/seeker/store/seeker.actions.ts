/**
 * Seeker Actions
 *
 * Defines all actions for the seeker feature module.
 * Using NgRx action groups for type safety and organization.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  DashboardStats,
  RecentActivity,
  ReferenceRequest,
  Reference,
  Bundle,
  CreateReferenceRequestPayload,
  CreateBundlePayload,
  UpdateBundlePayload,
  ReferenceFilters,
  BundleAnalytics,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
} from '../models/seeker.models';

/**
 * Dashboard Actions
 */
export const DashboardActions = createActionGroup({
  source: 'Dashboard',
  events: {
    'Load Dashboard': emptyProps(),
    'Load Dashboard Success': props<{
      stats: DashboardStats;
      recentActivity: RecentActivity[];
    }>(),
    'Load Dashboard Failure': props<{ error: string }>(),

    'Refresh Activity': emptyProps(),
    'Refresh Activity Success': props<{ recentActivity: RecentActivity[] }>(),
    'Refresh Activity Failure': props<{ error: string }>(),
  },
});

/**
 * Reference Request Actions
 */
export const ReferenceRequestActions = createActionGroup({
  source: 'Reference Request',
  events: {
    // Load requests
    'Load Requests': emptyProps(),
    'Load Requests Success': props<{ requests: ReferenceRequest[] }>(),
    'Load Requests Failure': props<{ error: string }>(),

    // Load single request
    'Load Request': props<{ requestId: string }>(),
    'Load Request Success': props<{ request: ReferenceRequest }>(),
    'Load Request Failure': props<{ error: string }>(),

    // Create request
    'Create Request': props<{ payload: CreateReferenceRequestPayload }>(),
    'Create Request Success': props<{ request: ReferenceRequest }>(),
    'Create Request Failure': props<{ error: string }>(),

    // Delete request
    'Delete Request': props<{ requestId: string }>(),
    'Delete Request Success': props<{ requestId: string }>(),
    'Delete Request Failure': props<{ error: string }>(),

    // Generate AI questions
    'Generate Questions': props<{ request: GenerateQuestionsRequest }>(),
    'Generate Questions Success': props<{ response: GenerateQuestionsResponse }>(),
    'Generate Questions Failure': props<{ error: string }>(),

    // Select request
    'Select Request': props<{ requestId: string | null }>(),
  },
});

/**
 * Reference Actions
 */
export const ReferenceActions = createActionGroup({
  source: 'Reference',
  events: {
    // Load references
    'Load References': props<{ filters?: ReferenceFilters }>(),
    'Load References Success': props<{ references: Reference[] }>(),
    'Load References Failure': props<{ error: string }>(),

    // Load single reference
    'Load Reference': props<{ referenceId: string }>(),
    'Load Reference Success': props<{ reference: Reference }>(),
    'Load Reference Failure': props<{ error: string }>(),

    // Download reference
    'Download Reference': props<{ referenceId: string }>(),
    'Download Reference Success': props<{ referenceId: string }>(),
    'Download Reference Failure': props<{ error: string }>(),

    // Apply filters
    'Apply Filters': props<{ filters: ReferenceFilters }>(),
    'Clear Filters': emptyProps(),

    // Select reference
    'Select Reference': props<{ referenceId: string | null }>(),
  },
});

/**
 * Bundle Actions
 */
export const BundleActions = createActionGroup({
  source: 'Bundle',
  events: {
    // Load bundles
    'Load Bundles': emptyProps(),
    'Load Bundles Success': props<{ bundles: Bundle[] }>(),
    'Load Bundles Failure': props<{ error: string }>(),

    // Load single bundle
    'Load Bundle': props<{ bundleId: string }>(),
    'Load Bundle Success': props<{ bundle: Bundle }>(),
    'Load Bundle Failure': props<{ error: string }>(),

    // Create bundle
    'Create Bundle': props<{ payload: CreateBundlePayload }>(),
    'Create Bundle Success': props<{ bundle: Bundle }>(),
    'Create Bundle Failure': props<{ error: string }>(),

    // Update bundle
    'Update Bundle': props<{ bundleId: string; payload: UpdateBundlePayload }>(),
    'Update Bundle Success': props<{ bundle: Bundle }>(),
    'Update Bundle Failure': props<{ error: string }>(),

    // Delete bundle
    'Delete Bundle': props<{ bundleId: string }>(),
    'Delete Bundle Success': props<{ bundleId: string }>(),
    'Delete Bundle Failure': props<{ error: string }>(),

    // Load bundle analytics
    'Load Bundle Analytics': props<{ bundleId: string }>(),
    'Load Bundle Analytics Success': props<{ analytics: BundleAnalytics }>(),
    'Load Bundle Analytics Failure': props<{ error: string }>(),

    // Select bundle
    'Select Bundle': props<{ bundleId: string | null }>(),
  },
});

/**
 * UI Actions
 */
export const SeekerUIActions = createActionGroup({
  source: 'Seeker UI',
  events: {
    'Clear Error': emptyProps(),
    'Reset State': emptyProps(),
  },
});
