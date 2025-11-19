/**
 * Employer Actions
 *
 * Defines all NgRx actions for employer feature.
 * Using createActionGroup for type-safe action creators.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  Bundle,
  BundleAccessRequest,
  BundleAccessResponse,
  Reference,
  ReachBackRequest,
  ReachBackResponse,
  ReferenceFilterOptions,
  AnalyticsEvent,
  BundleAccessSession,
} from '../models/employer.models';

/**
 * Employer Actions Group
 */
export const EmployerActions = createActionGroup({
  source: 'Employer',
  events: {
    // Bundle Access Actions
    'Request Bundle Access': props<{ request: BundleAccessRequest }>(),
    'Request Bundle Access Success': props<{ response: BundleAccessResponse }>(),
    'Request Bundle Access Failure': props<{ error: string }>(),

    // Load Bundle Actions
    'Load Bundle': props<{ bundleId: string }>(),
    'Load Bundle Success': props<{ bundle: Bundle }>(),
    'Load Bundle Failure': props<{ error: string }>(),

    // Reference Actions
    'Load Reference': props<{ referenceId: string }>(),
    'Load Reference Success': props<{ reference: Reference }>(),
    'Load Reference Failure': props<{ error: string }>(),

    'View Reference': props<{ referenceId: string }>(),
    'Close Reference': emptyProps(),

    // Filter Actions
    'Update Filter Options': props<{ filterOptions: Partial<ReferenceFilterOptions> }>(),
    'Clear Filters': emptyProps(),

    // Reach-Back Actions
    'Request Reach Back': props<{ request: ReachBackRequest }>(),
    'Request Reach Back Success': props<{ response: ReachBackResponse }>(),
    'Request Reach Back Failure': props<{ error: string; referenceId: string }>(),

    // Analytics Actions
    'Track Event': props<{ event: AnalyticsEvent }>(),
    'Track Event Success': emptyProps(),
    'Track Event Failure': props<{ error: string }>(),

    'Start Bundle View': props<{ bundleId: string }>(),
    'End Bundle View': props<{ bundleId: string }>(),

    'Track Reference Play': props<{ referenceId: string; position: number }>(),
    'Track Reference Download': props<{ referenceId: string; format: string }>(),

    // Session Actions
    'Update Session': props<{ session: BundleAccessSession }>(),
    'Clear Session': emptyProps(),
    'Check Session Validity': emptyProps(),
    'Session Expired': emptyProps(),

    // Media Actions
    'Request Media Stream': props<{ referenceId: string; mediaId: string }>(),
    'Request Media Stream Success': props<{ streamUrl: string }>(),
    'Request Media Stream Failure': props<{ error: string }>(),

    // Export Actions
    'Export Bundle': props<{ bundleId: string; format: string }>(),
    'Export Reference': props<{ referenceId: string; format: string }>(),
    'Export Success': props<{ downloadUrl: string }>(),
    'Export Failure': props<{ error: string }>(),

    // Error Handling
    'Clear Error': emptyProps(),
    'Handle Expired Bundle': emptyProps(),
    'Handle Access Denied': props<{ reason: string }>(),
  },
});
