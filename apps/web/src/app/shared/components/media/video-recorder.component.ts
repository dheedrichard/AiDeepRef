/**
 * Video Recorder Component
 *
 * WebRTC-based video recording component with preview.
 * Features:
 * - Camera permission handling
 * - Real-time video preview
 * - Recording controls (start, pause, stop)
 * - Video preview before submission
 * - Browser compatibility checks
 */

import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RecordedVideo {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

@Component({
  selector: 'app-video-recorder',
  imports: [CommonModule],
  template: `
    <div class="video-recorder">
      <!-- Browser Compatibility Warning -->
      @if (!isSupported()) {
        <div
          class="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          role="alert"
        >
          <p class="font-medium">Browser Not Supported</p>
          <p class="text-sm mt-1">
            Your browser doesn't support video recording. Please use a modern browser like
            Chrome, Firefox, or Safari.
          </p>
        </div>
      }

      <!-- Permission Denied Warning -->
      @if (permissionDenied()) {
        <div
          class="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700"
          role="alert"
        >
          <p class="font-medium">Camera Permission Required</p>
          <p class="text-sm mt-1">
            Please allow camera access to record video. Check your browser settings if you
            previously denied permission.
          </p>
        </div>
      }

      <!-- Error Message -->
      @if (error()) {
        <div
          class="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          role="alert"
        >
          <p class="font-medium">Error</p>
          <p class="text-sm mt-1">{{ error() }}</p>
        </div>
      }

      <!-- Video Preview / Recording View -->
      <div class="relative bg-black rounded-lg overflow-hidden" style="aspect-ratio: 16/9;">
        <video
          #videoElement
          [srcObject]="stream()"
          autoplay
          playsinline
          muted
          class="w-full h-full object-cover"
          [class.hidden]="hasRecording()"
        ></video>

        <video
          #playbackElement
          [src]="recordedVideo()?.url || ''"
          controls
          class="w-full h-full object-cover"
          [class.hidden]="!hasRecording()"
        ></video>

        <!-- Recording Indicator -->
        @if (isRecording()) {
          <div class="absolute top-4 left-4 flex items-center space-x-2">
            <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span class="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
              Recording {{ formattedDuration() }}
            </span>
          </div>
        }

        <!-- Paused Indicator -->
        @if (isPaused()) {
          <div
            class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
          >
            <div class="text-white text-center">
              <svg
                class="w-16 h-16 mx-auto mb-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <p class="text-lg font-medium">Paused</p>
            </div>
          </div>
        }
      </div>

      <!-- Controls -->
      <div class="mt-4 flex items-center justify-center space-x-4">
        @if (!hasRecording()) {
          <!-- Start Recording Button -->
          @if (!isRecording() && !isPaused()) {
            <button
              (click)="startRecording()"
              [disabled]="!isSupported() || permissionDenied() || isInitializing()"
              class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>{{ isInitializing() ? 'Initializing...' : 'Start Recording' }}</span>
            </button>
          }

          <!-- Pause/Resume Button -->
          @if (isRecording() || isPaused()) {
            <button
              (click)="togglePause()"
              class="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              @if (isPaused()) {
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Resume</span>
              } @else {
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Pause</span>
              }
            </button>

            <!-- Stop Button -->
            <button
              (click)="stopRecording()"
              class="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Stop</span>
            </button>
          }
        } @else {
          <!-- Re-record Button -->
          <button
            (click)="reRecord()"
            class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Re-record</span>
          </button>

          <!-- Use Recording Button -->
          <button
            (click)="useRecording()"
            class="px-6 py-3 bg-primary-purple hover:bg-primary-purple-hover text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Use This Recording</span>
          </button>
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
export class VideoRecorderComponent implements OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('playbackElement') playbackElement!: ElementRef<HTMLVideoElement>;

  @Output() recordingComplete = new EventEmitter<RecordedVideo>();
  @Output() recordingError = new EventEmitter<string>();

  // Signals
  isSupported = signal(this.checkBrowserSupport());
  permissionDenied = signal(false);
  isInitializing = signal(false);
  isRecording = signal(false);
  isPaused = signal(false);
  hasRecording = signal(false);
  stream = signal<MediaStream | null>(null);
  recordedVideo = signal<RecordedVideo | null>(null);
  duration = signal(0);
  error = signal<string | null>(null);

  formattedDuration = computed(() => {
    const seconds = this.duration();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;

  /**
   * Check if browser supports MediaRecorder API
   */
  private checkBrowserSupport(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  /**
   * Start recording video
   */
  async startRecording(): Promise<void> {
    try {
      this.isInitializing.set(true);
      this.error.set(null);

      // Request camera permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
        audio: true,
      });

      this.stream.set(mediaStream);
      this.permissionDenied.set(false);

      // Initialize MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      this.recordedChunks = [];

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Handle stop event
      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording.set(true);
      this.isInitializing.set(false);
      this.startTime = Date.now();
      this.startDurationTimer();
    } catch (err: any) {
      this.isInitializing.set(false);
      console.error('Error starting recording:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionDenied.set(true);
        this.error.set('Camera permission denied');
      } else {
        this.error.set('Failed to start recording: ' + err.message);
      }

      this.recordingError.emit(err.message);
    }
  }

  /**
   * Toggle pause/resume recording
   */
  togglePause(): void {
    if (!this.mediaRecorder) return;

    if (this.isPaused()) {
      this.mediaRecorder.resume();
      this.isPaused.set(false);
      this.isRecording.set(true);
    } else {
      this.mediaRecorder.pause();
      this.isPaused.set(true);
      this.isRecording.set(false);
    }
  }

  /**
   * Stop recording video
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      this.isPaused.set(false);
      this.stopDurationTimer();

      // Stop all tracks
      const currentStream = this.stream();
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    }
  }

  /**
   * Handle recording stop
   */
  private handleRecordingStop(): void {
    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);

    const video: RecordedVideo = {
      blob,
      url,
      duration: this.duration(),
      mimeType,
    };

    this.recordedVideo.set(video);
    this.hasRecording.set(true);
  }

  /**
   * Re-record video
   */
  reRecord(): void {
    // Clean up previous recording
    const prevVideo = this.recordedVideo();
    if (prevVideo) {
      URL.revokeObjectURL(prevVideo.url);
    }

    this.recordedVideo.set(null);
    this.hasRecording.set(false);
    this.duration.set(0);
    this.recordedChunks = [];

    // Start new recording
    this.startRecording();
  }

  /**
   * Use the recorded video
   */
  useRecording(): void {
    const video = this.recordedVideo();
    if (video) {
      this.recordingComplete.emit(video);
    }
  }

  /**
   * Start duration timer
   */
  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.duration.set(elapsed);
    }, 1000);
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy(): void {
    this.stopRecording();
    this.stopDurationTimer();

    // Revoke object URL
    const video = this.recordedVideo();
    if (video) {
      URL.revokeObjectURL(video.url);
    }
  }
}
