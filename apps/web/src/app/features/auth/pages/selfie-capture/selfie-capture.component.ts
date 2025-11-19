/**
 * Selfie Capture Component (ID-SEEK-02)
 *
 * Selfie and liveness verification for seekers (KYC Step 2).
 * Features:
 * - Camera selfie capture
 * - Liveness detection prompts
 * - Submit for verification
 */

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../store/auth.actions';
import { selectIsLoading, selectError, selectUser } from '../../store/auth.selectors';

@Component({
  selector: 'app-selfie-capture',
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div class="w-full max-w-2xl">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Take a Selfie</h1>
          <p class="text-gray-600">
            Take a clear photo of your face to complete verification (Step 2 of 2)
          </p>
        </div>

        <!-- Progress Indicator -->
        <div class="mb-8">
          <div class="flex items-center justify-center">
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold"
              >
                <svg
                  class="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="w-32 h-1 bg-primary-purple mx-2"></div>
              <div
                class="w-10 h-10 bg-primary-purple text-white rounded-full flex items-center justify-center font-semibold"
              >
                2
              </div>
            </div>
          </div>
          <div class="flex justify-between max-w-xs mx-auto mt-2 text-sm text-gray-600">
            <span class="text-green-600 font-medium">ID Document</span>
            <span class="font-medium text-primary-purple">Selfie</span>
          </div>
        </div>

        <!-- Error Message -->
        @if (error()) {
          <div
            class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
            role="alert"
          >
            {{ error() }}
          </div>
        }

        <!-- Main Card -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <!-- Instructions -->
          <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 class="font-medium text-blue-900 mb-2">Instructions:</h3>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>• Remove glasses, hats, or face coverings</li>
              <li>• Ensure good lighting on your face</li>
              <li>• Look directly at the camera</li>
              <li>• Keep a neutral expression</li>
            </ul>
          </div>

          <!-- Camera Preview / Selfie Display -->
          <div class="mb-6">
            <div
              class="relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
            >
              @if (selfieImage()) {
                <img
                  [src]="selfiePreview()"
                  alt="Selfie preview"
                  class="w-full h-full object-cover"
                />
              } @else {
                <div class="text-center">
                  <svg
                    class="w-24 h-24 mx-auto text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p class="text-gray-300 text-lg">Camera Preview</p>
                </div>
              }

              <!-- Oval Guide Overlay -->
              @if (!selfieImage()) {
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    class="w-64 h-80 border-4 border-white border-opacity-50 rounded-full"
                  ></div>
                </div>
              }
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-4">
            @if (!selfieImage()) {
              <!-- Capture/Upload Buttons -->
              <div class="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  (click)="captureFromCamera()"
                  class="bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  aria-label="Capture from camera"
                >
                  <svg
                    class="w-5 h-5 inline-block mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Use Camera
                </button>
                <button
                  type="button"
                  (click)="fileInput.click()"
                  class="bg-white border-2 border-primary-purple text-primary-purple hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                  aria-label="Upload photo"
                >
                  <svg
                    class="w-5 h-5 inline-block mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Upload Photo
                </button>
              </div>
              <input
                #fileInput
                type="file"
                accept="image/*"
                capture="user"
                class="hidden"
                (change)="onImageSelect($event)"
                aria-label="Upload selfie"
              />
            } @else {
              <!-- Retake and Submit Buttons -->
              <div class="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  (click)="retake()"
                  class="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                  aria-label="Retake photo"
                >
                  Retake
                </button>
                <button
                  type="button"
                  (click)="onSubmit()"
                  [disabled]="isLoading()"
                  class="bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Submit for verification"
                >
                  @if (isLoading()) {
                    <span class="flex items-center justify-center">
                      <svg
                        class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      Submitting...
                    </span>
                  } @else {
                    Submit for Verification
                  }
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Security Notice -->
        <div class="mt-8 text-center text-sm text-gray-600">
          <p>
            <svg
              class="w-4 h-4 inline-block mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clip-rule="evenodd"
              />
            </svg>
            Your photo is encrypted and used only for identity verification
          </p>
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
export class SelfieCaptureComponent {
  private readonly store = inject(Store);

  // State signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);
  user = this.store.selectSignal(selectUser);
  selfieImage = signal<File | null>(null);
  selfiePreview = signal<string>('');

  /**
   * Capture from camera (opens file input with camera mode)
   */
  captureFromCamera(): void {
    // In a real implementation, this would use the getUserMedia API
    // For now, we'll use the file input with capture attribute
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = (event) => this.onImageSelect(event);
    input.click();
  }

  /**
   * Handle image selection
   */
  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selfieImage.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selfiePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Retake photo
   */
  retake(): void {
    this.selfieImage.set(null);
    this.selfiePreview.set('');
  }

  /**
   * Submit selfie for verification
   */
  onSubmit(): void {
    if (this.selfieImage() && this.user()) {
      const userId = this.user()!.id;
      const selfieImage = this.selfieImage()!;

      this.store.dispatch(
        AuthActions.uploadKycSelfie({
          request: {
            userId,
            selfieImage,
          },
        })
      );
    }
  }
}
