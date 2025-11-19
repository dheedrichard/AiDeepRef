/**
 * Verification Result Component (ID-SEEK-03)
 *
 * Display KYC verification status.
 * Features:
 * - Verified/Needs review states
 * - Go to Dashboard button
 * - Rejection reason (if rejected)
 */

import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectKycStatus, selectUser } from '../../store/auth.selectors';
import { KycStatus } from '../../models/auth.models';

@Component({
  selector: 'app-verification-result',
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        @if (kycStatus() === kycStatuses.VERIFIED) {
          <!-- Verified State -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-10 h-10 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-gray-900 mb-2">Identity Verified!</h1>
            <p class="text-gray-600 mb-8">
              Your identity has been successfully verified. You can now access all features.
            </p>

            <div class="bg-white rounded-lg shadow-md p-8 mb-6">
              <div class="space-y-4">
                <div class="flex items-center justify-between py-3 border-b">
                  <span class="text-gray-600">Status</span>
                  <span class="font-semibold text-green-600">Verified</span>
                </div>
                @if (user()) {
                  <div class="flex items-center justify-between py-3 border-b">
                    <span class="text-gray-600">Name</span>
                    <span class="font-semibold text-gray-900">
                      {{ user()!.firstName }} {{ user()!.lastName }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between py-3">
                    <span class="text-gray-600">Email</span>
                    <span class="font-semibold text-gray-900">{{ user()!.email }}</span>
                  </div>
                }
              </div>
            </div>

            <button
              (click)="goToDashboard()"
              class="w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              aria-label="Go to dashboard"
            >
              Go to Dashboard
            </button>
          </div>
        } @else if (kycStatus() === kycStatuses.UNDER_REVIEW) {
          <!-- Under Review State -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-10 h-10 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-gray-900 mb-2">Verification Pending</h1>
            <p class="text-gray-600 mb-8">
              Your documents are being reviewed by our team. This usually takes 1-2 business days.
            </p>

            <div class="bg-white rounded-lg shadow-md p-8 mb-6">
              <div class="space-y-4">
                <div class="flex items-center justify-between py-3 border-b">
                  <span class="text-gray-600">Status</span>
                  <span class="font-semibold text-yellow-600">Under Review</span>
                </div>
                <div class="flex items-center justify-between py-3">
                  <span class="text-gray-600">Estimated Time</span>
                  <span class="font-semibold text-gray-900">1-2 business days</span>
                </div>
              </div>
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 class="font-medium text-blue-900 mb-2">What's next?</h3>
              <ul class="text-sm text-blue-800 space-y-1 text-left">
                <li>• You'll receive an email when verification is complete</li>
                <li>• You can check your status in Settings at any time</li>
                <li>• Some features will be available once verified</li>
              </ul>
            </div>

            <button
              (click)="goToDashboard()"
              class="w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              aria-label="Go to dashboard"
            >
              Continue to Dashboard
            </button>
          </div>
        } @else if (kycStatus() === kycStatuses.REJECTED) {
          <!-- Rejected State -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-10 h-10 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p class="text-gray-600 mb-8">
              We couldn't verify your identity. Please review the issues below and try again.
            </p>

            <div class="bg-white rounded-lg shadow-md p-8 mb-6">
              <div class="space-y-4">
                <div class="flex items-center justify-between py-3 border-b">
                  <span class="text-gray-600">Status</span>
                  <span class="font-semibold text-red-600">Rejected</span>
                </div>
                <div class="py-3">
                  <div class="text-left">
                    <span class="text-gray-600 block mb-2">Reason:</span>
                    <p class="text-gray-900">
                      The submitted documents were unclear or did not match the required format.
                      Please ensure your photos are well-lit and all information is clearly
                      visible.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <button
                (click)="retryVerification()"
                class="w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                aria-label="Try verification again"
              >
                Try Again
              </button>
              <button
                (click)="contactSupport()"
                class="w-full bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                aria-label="Contact support"
              >
                Contact Support
              </button>
            </div>
          </div>
        } @else {
          <!-- Loading/Unknown State -->
          <div class="text-center">
            <div
              class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="animate-spin h-10 w-10 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Checking Status...</h1>
            <p class="text-gray-600">Please wait while we check your verification status.</p>
          </div>
        }

        <!-- Help Link -->
        <div class="mt-8 text-center text-sm text-gray-600">
          <a href="#" class="text-primary-purple hover:underline">Need help? Contact support</a>
        </div>
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
export class VerificationResultComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  // Expose KycStatus enum to template
  kycStatuses = KycStatus;

  // State signals
  kycStatus = this.store.selectSignal(selectKycStatus);
  user = this.store.selectSignal(selectUser);

  ngOnInit(): void {
    // Auto-redirect to dashboard if already verified
    if (this.kycStatus() === KycStatus.VERIFIED) {
      setTimeout(() => {
        this.goToDashboard();
      }, 3000); // Wait 3 seconds before auto-redirect
    }
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard(): void {
    this.router.navigate(['/app/seeker/dashboard']);
  }

  /**
   * Retry verification process
   */
  retryVerification(): void {
    this.router.navigate(['/auth/id-capture']);
  }

  /**
   * Contact support
   */
  contactSupport(): void {
    // In a real app, this would open a support ticket or chat
    window.location.href = 'mailto:support@deepref.com';
  }
}
