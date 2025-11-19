/**
 * Audio Recorder Component
 *
 * Audio recording component with waveform visualization.
 * Features:
 * - Microphone permission handling
 * - Real-time waveform visualization
 * - Recording controls (start, pause, stop)
 * - Audio playback preview
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
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RecordedAudio {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

@Component({
  selector: 'app-audio-recorder',
  imports: [CommonModule],
  template: `
    <div class="audio-recorder">
      <!-- Browser Compatibility Warning -->
      @if (!isSupported()) {
        <div
          class="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          role="alert"
        >
          <p class="font-medium">Browser Not Supported</p>
          <p class="text-sm mt-1">
            Your browser doesn't support audio recording. Please use a modern browser like
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
          <p class="font-medium">Microphone Permission Required</p>
          <p class="text-sm mt-1">
            Please allow microphone access to record audio. Check your browser settings if
            you previously denied permission.
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

      <!-- Waveform Visualization / Playback -->
      <div class="relative bg-gray-100 rounded-lg p-8 mb-4">
        <div class="flex flex-col items-center justify-center space-y-4">
          <!-- Microphone Icon -->
          @if (!hasRecording()) {
            <div
              class="w-24 h-24 rounded-full flex items-center justify-center"
              [class.bg-red-500]="isRecording()"
              [class.bg-gray-300]="!isRecording()"
              [class.animate-pulse]="isRecording()"
            >
              <svg
                class="w-12 h-12"
                [class.text-white]="isRecording()"
                [class.text-gray-600]="!isRecording()"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          }

          <!-- Waveform Canvas -->
          <canvas
            #waveformCanvas
            width="600"
            height="100"
            class="w-full max-w-2xl"
            [class.hidden]="hasRecording()"
          ></canvas>

          <!-- Audio Playback -->
          @if (hasRecording()) {
            <div class="w-full max-w-2xl">
              <audio
                #audioElement
                [src]="recordedAudio()?.url || ''"
                controls
                class="w-full"
              ></audio>
            </div>
          }

          <!-- Duration Display -->
          <div class="text-center">
            @if (isRecording() || isPaused()) {
              <div class="flex items-center space-x-2">
                @if (isRecording()) {
                  <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                }
                <span class="text-2xl font-mono font-bold text-gray-800">
                  {{ formattedDuration() }}
                </span>
              </div>
            } @else if (hasRecording()) {
              <p class="text-lg text-gray-600">
                Duration: {{ formattedDuration() }}
              </p>
            } @else {
              <p class="text-lg text-gray-600">Ready to record</p>
            }
          </div>

          <!-- Paused State -->
          @if (isPaused()) {
            <p class="text-lg font-medium text-yellow-600">Recording Paused</p>
          }
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center justify-center space-x-4">
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
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
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
export class AudioRecorderComponent implements OnDestroy, AfterViewInit {
  @ViewChild('waveformCanvas') waveformCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('audioElement') audioElement!: ElementRef<HTMLAudioElement>;

  @Output() recordingComplete = new EventEmitter<RecordedAudio>();
  @Output() recordingError = new EventEmitter<string>();

  // Signals
  isSupported = signal(this.checkBrowserSupport());
  permissionDenied = signal(false);
  isInitializing = signal(false);
  isRecording = signal(false);
  isPaused = signal(false);
  hasRecording = signal(false);
  recordedAudio = signal<RecordedAudio | null>(null);
  duration = signal(0);
  error = signal<string | null>(null);

  formattedDuration = computed(() => {
    const seconds = this.duration();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recordedChunks: Blob[] = [];
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private animationFrameId: number | null = null;
  private startTime: number = 0;

  ngAfterViewInit(): void {
    // Initialize canvas for waveform
    if (this.waveformCanvas) {
      this.clearWaveform();
    }
  }

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
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      this.isInitializing.set(true);
      this.error.set(null);

      // Request microphone permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.permissionDenied.set(false);

      // Setup audio context for visualization
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      // Initialize MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps
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
      this.drawWaveform();
    } catch (err: any) {
      this.isInitializing.set(false);
      console.error('Error starting recording:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionDenied.set(true);
        this.error.set('Microphone permission denied');
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
      this.drawWaveform();
    } else {
      this.mediaRecorder.pause();
      this.isPaused.set(true);
      this.isRecording.set(false);
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    }
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      this.isPaused.set(false);
      this.stopDurationTimer();

      // Stop visualization
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

      // Stop media stream
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      // Close audio context
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    }
  }

  /**
   * Handle recording stop
   */
  private handleRecordingStop(): void {
    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);

    const audio: RecordedAudio = {
      blob,
      url,
      duration: this.duration(),
      mimeType,
    };

    this.recordedAudio.set(audio);
    this.hasRecording.set(true);
  }

  /**
   * Re-record audio
   */
  reRecord(): void {
    // Clean up previous recording
    const prevAudio = this.recordedAudio();
    if (prevAudio) {
      URL.revokeObjectURL(prevAudio.url);
    }

    this.recordedAudio.set(null);
    this.hasRecording.set(false);
    this.duration.set(0);
    this.recordedChunks = [];
    this.clearWaveform();

    // Start new recording
    this.startRecording();
  }

  /**
   * Use the recorded audio
   */
  useRecording(): void {
    const audio = this.recordedAudio();
    if (audio) {
      this.recordingComplete.emit(audio);
    }
  }

  /**
   * Draw waveform visualization
   */
  private drawWaveform(): void {
    if (!this.analyser || !this.waveformCanvas) return;

    const canvas = this.waveformCanvas.nativeElement;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isRecording()) return;

      this.animationFrameId = requestAnimationFrame(draw);

      this.analyser!.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(243, 244, 246)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(239, 68, 68)';
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  }

  /**
   * Clear waveform canvas
   */
  private clearWaveform(): void {
    if (!this.waveformCanvas) return;

    const canvas = this.waveformCanvas.nativeElement;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.fillStyle = 'rgb(243, 244, 246)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(209, 213, 219)';
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, canvas.height / 2);
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
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
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy(): void {
    this.stopRecording();
    this.stopDurationTimer();

    // Revoke object URL
    const audio = this.recordedAudio();
    if (audio) {
      URL.revokeObjectURL(audio.url);
    }

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
