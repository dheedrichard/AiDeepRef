/**
 * Reference Invite Component
 *
 * Page for referrers to review and accept/decline reference requests.
 * Shows seeker information, questions, and format options.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ReferrerActions } from '../../store/referrer.actions';
import { selectSelectedRequest, selectIsLoading, selectError } from '../../store/referrer.selectors';

@Component({
  selector: 'app-reference-invite',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
          </div>
        } @else if (request()) {
          <!-- Header -->
          <div class="mb-8">
            <a
              routerLink="/referrer/dashboard"
              class="text-primary-purple hover:underline flex items-center space-x-2 mb-4"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Back to Dashboard</span>
            </a>
            <h1 class="text-3xl font-bold text-gray-900">Reference Request</h1>
            <p class="mt-2 text-gray-600">Review the details and decide how you'd like to respond</p>
          </div>

          <!-- Error Message -->
          @if (error()) {
            <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700" role="alert">
              <p class="font-medium">Error</p>
              <p class="text-sm mt-1">{{ error() }}</p>
            </div>
          }

          <!-- Request Info Card -->
          <div class="bg-white rounded-lg shadow mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Seeker Information</h2>
            </div>
            <div class="p-6">
              <div class="flex items-start space-x-6">
                <!-- Avatar -->
                <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  @if (request()!.seeker.profileImageUrl) {
                    <img
                      [src]="request()!.seeker.profileImageUrl"
                      [alt]="request()!.seeker.firstName"
                      class="w-20 h-20 rounded-full object-cover"
                    />
                  } @else {
                    <span class="text-2xl font-semibold text-gray-600">
                      {{ request()!.seeker.firstName.charAt(0) }}{{ request()!.seeker.lastName.charAt(0) }}
                    </span>
                  }
                </div>

                <!-- Info -->
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-900">
                    {{ request()!.seeker.firstName }} {{ request()!.seeker.lastName }}
                  </h3>
                  @if (request()!.seeker.company && request()!.seeker.role) {
                    <p class="text-gray-600 mt-1">
                      {{ request()!.seeker.role }} at {{ request()!.seeker.company }}
                    </p>
                  }
                  <p class="text-sm text-gray-500 mt-2">{{ request()!.seeker.email }}</p>

                  <!-- Request Metadata -->
                  <div class="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                    <div class="flex items-center space-x-1">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span>Requested {{ formatDate(request()!.requestedAt) }}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span>Expires {{ formatDate(request()!.expiresAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Context -->
              @if (request()!.context) {
                <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Additional Context</h4>
                  <p class="text-sm text-gray-700">{{ request()!.context }}</p>
                </div>
              }
            </div>
          </div>

          <!-- Questions Card -->
          <div class="bg-white rounded-lg shadow mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Questions to Answer</h2>
              <p class="text-sm text-gray-600 mt-1">
                {{ request()!.questions.length }} question{{ request()!.questions.length !== 1 ? 's' : '' }}
              </p>
            </div>
            <div class="divide-y divide-gray-200">
              @for (question of request()!.questions; track question.id) {
                <div class="px-6 py-4">
                  <div class="flex items-start space-x-3">
                    <span class="flex-shrink-0 w-8 h-8 bg-primary-purple text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {{ question.order + 1 }}
                    </span>
                    <div class="flex-1">
                      <p class="text-gray-900">{{ question.text }}</p>
                      @if (question.required) {
                        <span class="inline-flex items-center text-xs text-red-600 mt-1">
                          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fill-rule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clip-rule="evenodd"
                            />
                          </svg>
                          Required
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Response Format Card -->
          <div class="bg-white rounded-lg shadow mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Response Formats</h2>
              <p class="text-sm text-gray-600 mt-1">Choose how you'd like to provide your reference</p>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                @for (format of request()!.allowedFormats; track format) {
                  <div class="border-2 border-gray-200 rounded-lg p-4 text-center">
                    @switch (format) {
                      @case ('video') {
                        <svg
                          class="w-12 h-12 mx-auto text-primary-purple mb-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        <h3 class="font-medium text-gray-900">Video</h3>
                        <p class="text-xs text-gray-600 mt-1">Record a video message</p>
                      }
                      @case ('audio') {
                        <svg
                          class="w-12 h-12 mx-auto text-primary-purple mb-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <h3 class="font-medium text-gray-900">Audio</h3>
                        <p class="text-xs text-gray-600 mt-1">Record audio only</p>
                      }
                      @case ('text') {
                        <svg
                          class="w-12 h-12 mx-auto text-primary-purple mb-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <h3 class="font-medium text-gray-900">Text</h3>
                        <p class="text-xs text-gray-600 mt-1">Write your responses</p>
                      }
                    }
                  </div>
                }
              </div>

              @if (request()!.allowEmployerReachback) {
                <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div class="flex items-start space-x-3">
                    <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <div class="text-sm text-blue-700">
                      <p class="font-medium">Employer Reachback Allowed</p>
                      <p class="mt-1">
                        The seeker has authorized potential employers to contact you directly for additional verification.
                      </p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Ready to respond?</h3>
                <p class="text-sm text-gray-600 mt-1">Choose an action below</p>
              </div>
            </div>
            <div class="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                (click)="acceptRequest()"
                [disabled]="isSubmitting()"
                class="flex-1 bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                @if (isSubmitting() && actionType() === 'accept') {
                  <svg
                    class="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Accepting...</span>
                } @else {
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>Accept & Start Response</span>
                }
              </button>

              <button
                (click)="toggleDeclineModal()"
                [disabled]="isSubmitting()"
                class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Decline Request</span>
              </button>
            </div>
          </div>

          <!-- Decline Modal -->
          @if (showDeclineModal()) {
            <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <!-- Background overlay -->
                <div
                  class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  (click)="toggleDeclineModal()"
                ></div>

                <!-- Modal panel -->
                <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                      <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fill-rule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </div>
                      <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                          Decline Reference Request
                        </h3>
                        <div class="mt-2">
                          <p class="text-sm text-gray-500">
                            Are you sure you want to decline this reference request? This action cannot be undone.
                          </p>
                          <div class="mt-4">
                            <label for="decline-reason" class="block text-sm font-medium text-gray-700 mb-2">
                              Reason (optional)
                            </label>
                            <textarea
                              id="decline-reason"
                              [(ngModel)]="declineReason"
                              rows="3"
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent"
                              placeholder="Let the seeker know why you're declining..."
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      (click)="declineRequest()"
                      [disabled]="isSubmitting()"
                      class="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (isSubmitting() && actionType() === 'decline') {
                        <svg
                          class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Declining...
                      } @else {
                        Decline Request
                      }
                    </button>
                    <button
                      type="button"
                      (click)="toggleDeclineModal()"
                      [disabled]="isSubmitting()"
                      class="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-purple sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        } @else {
          <div class="text-center py-12">
            <p class="text-gray-600">Request not found</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class InviteComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Selectors
  request = this.store.selectSignal(selectSelectedRequest);
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);

  // Local state
  showDeclineModal = signal(false);
  isSubmitting = signal(false);
  actionType = signal<'accept' | 'decline' | null>(null);
  declineReason = '';

  ngOnInit(): void {
    // Get request ID from route
    const requestId = this.route.snapshot.paramMap.get('id');
    if (requestId) {
      this.store.dispatch(ReferrerActions.loadRequest({ requestId }));
    }
  }

  /**
   * Accept the reference request
   */
  acceptRequest(): void {
    const req = this.request();
    if (!req) return;

    this.isSubmitting.set(true);
    this.actionType.set('accept');
    this.store.dispatch(ReferrerActions.acceptRequest({ requestId: req.id }));

    // Navigate to respond page after acceptance
    setTimeout(() => {
      this.router.navigate(['/referrer/respond', req.id]);
    }, 1000);
  }

  /**
   * Decline the reference request
   */
  declineRequest(): void {
    const req = this.request();
    if (!req) return;

    this.isSubmitting.set(true);
    this.actionType.set('decline');
    this.store.dispatch(
      ReferrerActions.declineRequest({
        requestId: req.id,
        reason: this.declineReason || undefined,
      })
    );

    this.showDeclineModal.set(false);
  }

  /**
   * Toggle decline modal
   */
  toggleDeclineModal(): void {
    this.showDeclineModal.update((v) => !v);
    if (!this.showDeclineModal()) {
      this.declineReason = '';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
