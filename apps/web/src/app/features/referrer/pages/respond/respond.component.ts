/**
 * Response Recording Component
 *
 * Multi-format response submission page.
 * Supports video, audio, and text responses with draft saving.
 */

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ReferrerActions } from '../../store/referrer.actions';
import {
  selectSelectedRequest,
  selectIsLoading,
  selectIsSubmitting,
  selectDraftForRequest,
} from '../../store/referrer.selectors';
import { VideoRecorderComponent, RecordedVideo } from '../../../../shared/components/media/video-recorder.component';
import { AudioRecorderComponent, RecordedAudio } from '../../../../shared/components/media/audio-recorder.component';
import { MediaPreviewComponent } from '../../../../shared/components/media/media-preview.component';
import { ReferenceFormat, QuestionResponse } from '../../models/referrer.models';

@Component({
  selector: 'app-respond',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    VideoRecorderComponent,
    AudioRecorderComponent,
    MediaPreviewComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 pb-20">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 class="text-3xl font-bold text-gray-900">Provide Reference</h1>
          @if (request()) {
            <p class="mt-2 text-gray-600">
              For {{ request()!.seeker.firstName }} {{ request()!.seeker.lastName }}
            </p>
          }
        </div>

        @if (isLoading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
          </div>
        } @else if (request()) {
          <!-- Format Selection -->
          <div class="bg-white rounded-lg shadow mb-6 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Choose Response Format</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              @for (format of request()!.allowedFormats; track format) {
                <button
                  (click)="selectFormat(format)"
                  [class.ring-2]="selectedFormat() === format"
                  [class.ring-primary-purple]="selectedFormat() === format"
                  [class.bg-purple-50]="selectedFormat() === format"
                  class="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-purple transition-colors"
                >
                  @switch (format) {
                    @case ('video') {
                      <svg class="w-12 h-12 mx-auto text-primary-purple mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      <h3 class="font-medium text-gray-900">Video</h3>
                    }
                    @case ('audio') {
                      <svg class="w-12 h-12 mx-auto text-primary-purple mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd" />
                      </svg>
                      <h3 class="font-medium text-gray-900">Audio</h3>
                    }
                    @case ('text') {
                      <svg class="w-12 h-12 mx-auto text-primary-purple mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                      </svg>
                      <h3 class="font-medium text-gray-900">Text</h3>
                    }
                  }
                </button>
              }
            </div>
          </div>

          <!-- Questions & Responses -->
          @if (selectedFormat()) {
            <div class="space-y-6">
              @for (question of request()!.questions; track question.id; let idx = $index) {
                <div class="bg-white rounded-lg shadow p-6">
                  <!-- Question -->
                  <div class="mb-4">
                    <div class="flex items-start space-x-3 mb-3">
                      <span class="flex-shrink-0 w-8 h-8 bg-primary-purple text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {{ idx + 1 }}
                      </span>
                      <div class="flex-1">
                        <h3 class="text-lg font-medium text-gray-900">{{ question.text }}</h3>
                        @if (question.required) {
                          <span class="inline-flex items-center text-xs text-red-600 mt-1">
                            Required
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Response Input Based on Format -->
                  @switch (selectedFormat()) {
                    @case ('video') {
                      <app-video-recorder
                        (recordingComplete)="handleVideoRecording($event, question.id)"
                        (recordingError)="handleRecordingError($event)"
                      ></app-video-recorder>
                    }
                    @case ('audio') {
                      <app-audio-recorder
                        (recordingComplete)="handleAudioRecording($event, question.id)"
                        (recordingError)="handleRecordingError($event)"
                      ></app-audio-recorder>
                    }
                    @case ('text') {
                      <div>
                        <textarea
                          [(ngModel)]="responses[question.id]"
                          rows="6"
                          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent"
                          [placeholder]="'Type your answer here...'"
                        ></textarea>
                      </div>
                    }
                  }
                </div>
              }
            </div>

            <!-- Actions -->
            <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
              <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                  <button
                    (click)="saveDraft()"
                    [disabled]="isSaving()"
                    class="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    @if (isSaving()) {
                      <span class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    } @else {
                      Save Draft
                    }
                  </button>

                  <div class="flex items-center space-x-4">
                    <span class="text-sm text-gray-600">
                      {{ answeredCount() }}/{{ request()!.questions.length }} questions answered
                    </span>
                    <button
                      (click)="submitResponse()"
                      [disabled]="!canSubmit() || isSubmitting()"
                      class="px-6 py-2 bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (isSubmitting()) {
                        <span class="flex items-center">
                          <svg class="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </span>
                      } @else {
                        Submit Reference
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
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
export class RespondComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Selectors
  request = this.store.selectSignal(selectSelectedRequest);
  isLoading = this.store.selectSignal(selectIsLoading);
  isSubmitting = this.store.selectSignal(selectIsSubmitting);

  // Local state
  selectedFormat = signal<ReferenceFormat | null>(null);
  responses: Record<string, string> = {};
  mediaResponses: Record<string, RecordedVideo | RecordedAudio> = {};
  isSaving = signal(false);

  // Computed
  answeredCount = computed(() => {
    const req = this.request();
    if (!req) return 0;

    return req.questions.filter((q) => {
      if (this.selectedFormat() === 'text') {
        return this.responses[q.id]?.trim().length > 0;
      } else {
        return !!this.mediaResponses[q.id];
      }
    }).length;
  });

  canSubmit = computed(() => {
    const req = this.request();
    if (!req) return false;

    // Check all required questions are answered
    return req.questions
      .filter((q) => q.required)
      .every((q) => {
        if (this.selectedFormat() === 'text') {
          return this.responses[q.id]?.trim().length > 0;
        } else {
          return !!this.mediaResponses[q.id];
        }
      });
  });

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('id');
    if (requestId) {
      this.store.dispatch(ReferrerActions.loadRequest({ requestId }));
      this.store.dispatch(ReferrerActions.loadDraft({ referenceRequestId: requestId }));
    }
  }

  /**
   * Select response format
   */
  selectFormat(format: ReferenceFormat): void {
    this.selectedFormat.set(format);
  }

  /**
   * Handle video recording complete
   */
  handleVideoRecording(video: RecordedVideo, questionId: string): void {
    this.mediaResponses[questionId] = video;
  }

  /**
   * Handle audio recording complete
   */
  handleAudioRecording(audio: RecordedAudio, questionId: string): void {
    this.mediaResponses[questionId] = audio;
  }

  /**
   * Handle recording error
   */
  handleRecordingError(error: string): void {
    console.error('Recording error:', error);
    // Could dispatch an error action here
  }

  /**
   * Save draft
   */
  saveDraft(): void {
    const req = this.request();
    const format = this.selectedFormat();
    if (!req || !format) return;

    this.isSaving.set(true);

    const questionResponses: QuestionResponse[] = req.questions.map((q) => ({
      questionId: q.id,
      answer: format === 'text' ? this.responses[q.id] || '' : '',
      // Media URLs would be uploaded separately
    }));

    this.store.dispatch(
      ReferrerActions.saveDraft({
        payload: {
          referenceRequestId: req.id,
          format,
          responses: questionResponses,
        },
      })
    );

    setTimeout(() => {
      this.isSaving.set(false);
    }, 1000);
  }

  /**
   * Submit response
   */
  submitResponse(): void {
    const req = this.request();
    const format = this.selectedFormat();
    if (!req || !format || !this.canSubmit()) return;

    const questionResponses: QuestionResponse[] = req.questions.map((q) => ({
      questionId: q.id,
      answer: format === 'text' ? this.responses[q.id] || '' : '',
      // Media URLs would be from uploaded files
      mediaType: format !== 'text' ? format : undefined,
    }));

    this.store.dispatch(
      ReferrerActions.submitResponse({
        payload: {
          referenceRequestId: req.id,
          format,
          responses: questionResponses,
        },
      })
    );
  }
}
