/**
 * ID Capture Component (ID-SEEK-01)
 *
 * Document verification for seekers (KYC Step 1).
 * Features:
 * - Document type selection (passport/drivers license/national ID)
 * - Front/back image capture
 * - Camera integration or file upload
 * - Consent checkbox
 * - Continue button
 */

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../store/auth.actions';
import { selectIsLoading, selectError, selectUser } from '../../store/auth.selectors';
import { DocumentType } from '../../models/auth.models';

@Component({
  selector: 'app-id-capture',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div class="w-full max-w-2xl">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Verify Your Identity</h1>
          <p class="text-gray-600">
            Upload your ID document to complete verification (Step 1 of 2)
          </p>
        </div>

        <!-- Progress Indicator -->
        <div class="mb-8">
          <div class="flex items-center justify-center">
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-primary-purple text-white rounded-full flex items-center justify-center font-semibold"
              >
                1
              </div>
              <div class="w-32 h-1 bg-gray-300 mx-2"></div>
              <div
                class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold"
              >
                2
              </div>
            </div>
          </div>
          <div class="flex justify-between max-w-xs mx-auto mt-2 text-sm text-gray-600">
            <span class="font-medium text-primary-purple">ID Document</span>
            <span>Selfie</span>
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

        <!-- Form Card -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <form [formGroup]="idCaptureForm" (ngSubmit)="onSubmit()" class="space-y-8">
            <!-- Document Type Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">
                Select Document Type
              </label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label
                  class="flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all"
                  [class.border-primary-purple]="
                    idCaptureForm.get('documentType')?.value === documentTypes.PASSPORT
                  "
                  [class.bg-primary-purple]="
                    idCaptureForm.get('documentType')?.value === documentTypes.PASSPORT
                  "
                  [class.bg-opacity-5]="
                    idCaptureForm.get('documentType')?.value === documentTypes.PASSPORT
                  "
                  [class.border-gray-300]="
                    idCaptureForm.get('documentType')?.value !== documentTypes.PASSPORT
                  "
                >
                  <input
                    type="radio"
                    formControlName="documentType"
                    [value]="documentTypes.PASSPORT"
                    class="sr-only"
                    aria-label="Passport"
                  />
                  <svg
                    class="w-12 h-12 mb-2"
                    [class.text-primary-purple]="
                      idCaptureForm.get('documentType')?.value === documentTypes.PASSPORT
                    "
                    [class.text-gray-400]="
                      idCaptureForm.get('documentType')?.value !== documentTypes.PASSPORT
                    "
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span class="font-medium text-gray-900">Passport</span>
                </label>

                <label
                  class="flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all"
                  [class.border-primary-purple]="
                    idCaptureForm.get('documentType')?.value === documentTypes.DRIVERS_LICENSE
                  "
                  [class.bg-primary-purple]="
                    idCaptureForm.get('documentType')?.value === documentTypes.DRIVERS_LICENSE
                  "
                  [class.bg-opacity-5]="
                    idCaptureForm.get('documentType')?.value === documentTypes.DRIVERS_LICENSE
                  "
                  [class.border-gray-300]="
                    idCaptureForm.get('documentType')?.value !== documentTypes.DRIVERS_LICENSE
                  "
                >
                  <input
                    type="radio"
                    formControlName="documentType"
                    [value]="documentTypes.DRIVERS_LICENSE"
                    class="sr-only"
                    aria-label="Driver's License"
                  />
                  <svg
                    class="w-12 h-12 mb-2"
                    [class.text-primary-purple]="
                      idCaptureForm.get('documentType')?.value === documentTypes.DRIVERS_LICENSE
                    "
                    [class.text-gray-400]="
                      idCaptureForm.get('documentType')?.value !== documentTypes.DRIVERS_LICENSE
                    "
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span class="font-medium text-gray-900">Driver's License</span>
                </label>

                <label
                  class="flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all"
                  [class.border-primary-purple]="
                    idCaptureForm.get('documentType')?.value === documentTypes.NATIONAL_ID
                  "
                  [class.bg-primary-purple]="
                    idCaptureForm.get('documentType')?.value === documentTypes.NATIONAL_ID
                  "
                  [class.bg-opacity-5]="
                    idCaptureForm.get('documentType')?.value === documentTypes.NATIONAL_ID
                  "
                  [class.border-gray-300]="
                    idCaptureForm.get('documentType')?.value !== documentTypes.NATIONAL_ID
                  "
                >
                  <input
                    type="radio"
                    formControlName="documentType"
                    [value]="documentTypes.NATIONAL_ID"
                    class="sr-only"
                    aria-label="National ID"
                  />
                  <svg
                    class="w-12 h-12 mb-2"
                    [class.text-primary-purple]="
                      idCaptureForm.get('documentType')?.value === documentTypes.NATIONAL_ID
                    "
                    [class.text-gray-400]="
                      idCaptureForm.get('documentType')?.value !== documentTypes.NATIONAL_ID
                    "
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                    />
                  </svg>
                  <span class="font-medium text-gray-900">National ID</span>
                </label>
              </div>
            </div>

            <!-- Front Image Upload -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">
                Upload Front of Document
              </label>
              <div
                class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-purple transition-colors"
                [class.border-primary-purple]="frontImage()"
                (click)="frontFileInput.click()"
              >
                @if (frontImage()) {
                  <div class="space-y-4">
                    <img
                      [src]="frontImagePreview()"
                      alt="Front of document preview"
                      class="max-h-48 mx-auto rounded"
                    />
                    <p class="text-sm text-gray-600">{{ frontImage()?.name }}</p>
                    <button
                      type="button"
                      (click)="removeFrontImage(); $event.stopPropagation()"
                      class="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                } @else {
                  <div>
                    <svg
                      class="w-12 h-12 mx-auto text-gray-400 mb-4"
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
                    <p class="text-gray-600">Click to upload or drag and drop</p>
                    <p class="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                }
              </div>
              <input
                #frontFileInput
                type="file"
                accept="image/*"
                class="hidden"
                (change)="onFrontImageSelect($event)"
                aria-label="Upload front of document"
              />
            </div>

            <!-- Back Image Upload (conditional) -->
            @if (needsBackImage()) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Upload Back of Document
                </label>
                <div
                  class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-purple transition-colors"
                  [class.border-primary-purple]="backImage()"
                  (click)="backFileInput.click()"
                >
                  @if (backImage()) {
                    <div class="space-y-4">
                      <img
                        [src]="backImagePreview()"
                        alt="Back of document preview"
                        class="max-h-48 mx-auto rounded"
                      />
                      <p class="text-sm text-gray-600">{{ backImage()?.name }}</p>
                      <button
                        type="button"
                        (click)="removeBackImage(); $event.stopPropagation()"
                        class="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  } @else {
                    <div>
                      <svg
                        class="w-12 h-12 mx-auto text-gray-400 mb-4"
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
                      <p class="text-gray-600">Click to upload or drag and drop</p>
                      <p class="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  }
                </div>
                <input
                  #backFileInput
                  type="file"
                  accept="image/*"
                  class="hidden"
                  (change)="onBackImageSelect($event)"
                  aria-label="Upload back of document"
                />
              </div>
            }

            <!-- Consent Checkbox -->
            <div class="flex items-start">
              <input
                id="consent"
                type="checkbox"
                formControlName="consent"
                class="w-4 h-4 text-primary-purple border-gray-300 rounded focus:ring-primary-purple mt-1"
                aria-label="Consent to identity verification"
              />
              <label for="consent" class="ml-3 text-sm text-gray-700">
                I consent to DeepRef verifying my identity using the provided documents. I
                understand that my information will be processed securely and in accordance with
                the
                <a href="#" class="text-primary-purple hover:underline">Privacy Policy</a>.
              </label>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="!canSubmit() || isLoading()"
              class="w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Continue to next step"
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
                  Uploading...
                </span>
              } @else {
                Continue to Selfie
              }
            </button>
          </form>
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
            Your documents are encrypted and securely stored
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
export class IdCaptureComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  // Expose DocumentType enum to template
  documentTypes = DocumentType;

  // Form
  idCaptureForm = this.fb.nonNullable.group({
    documentType: [DocumentType.PASSPORT, Validators.required],
    consent: [false, Validators.requiredTrue],
  });

  // State signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);
  user = this.store.selectSignal(selectUser);
  frontImage = signal<File | null>(null);
  backImage = signal<File | null>(null);
  frontImagePreview = signal<string>('');
  backImagePreview = signal<string>('');

  // Computed signals
  needsBackImage = computed(() => {
    const docType = this.idCaptureForm.get('documentType')?.value;
    return docType !== DocumentType.PASSPORT;
  });

  canSubmit = computed(() => {
    const hasConsent = this.idCaptureForm.get('consent')?.value;
    const hasFrontImage = this.frontImage() !== null;
    const hasBackImage = this.needsBackImage() ? this.backImage() !== null : true;
    return hasConsent && hasFrontImage && hasBackImage;
  });

  /**
   * Handle front image selection
   */
  onFrontImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.frontImage.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.frontImagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Handle back image selection
   */
  onBackImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.backImage.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.backImagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove front image
   */
  removeFrontImage(): void {
    this.frontImage.set(null);
    this.frontImagePreview.set('');
  }

  /**
   * Remove back image
   */
  removeBackImage(): void {
    this.backImage.set(null);
    this.backImagePreview.set('');
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.canSubmit() && this.user()) {
      const userId = this.user()!.id;
      const documentType = this.idCaptureForm.get('documentType')?.value!;
      const frontImage = this.frontImage()!;
      const backImage = this.backImage();
      const consent = this.idCaptureForm.get('consent')?.value!;

      this.store.dispatch(
        AuthActions.uploadKycDocuments({
          request: {
            userId,
            documentType,
            frontImage,
            backImage: backImage ?? undefined,
            consent,
          },
        })
      );
    }
  }
}
