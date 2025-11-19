/**
 * Video Player Component
 *
 * Custom video player with advanced controls:
 * - Playback speed control
 * - Captions/subtitles support
 * - Fullscreen mode
 * - Progress tracking
 * - Watermarking support
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoPlayerState, MediaContent } from '../../../features/employer/models/employer.models';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="video-player" [class.fullscreen]="state().isFullscreen">
      <div class="video-container" (click)="togglePlay()">
        <video
          #videoElement
          [src]="mediaContent?.streamingUrl || mediaContent?.url"
          [poster]="mediaContent?.thumbnailUrl"
          (loadedmetadata)="onLoadedMetadata()"
          (timeupdate)="onTimeUpdate()"
          (ended)="onEnded()"
          (play)="onPlay()"
          (pause)="onPause()"
          class="video-element"
        >
          @if (mediaContent?.captionsUrl) {
            <track
              kind="captions"
              [src]="mediaContent.captionsUrl"
              srclang="en"
              label="English"
            />
          }
        </video>

        @if (watermark) {
          <div class="watermark">{{ watermark }}</div>
        }

        <!-- Play Overlay -->
        @if (!state().isPlaying) {
          <div class="play-overlay">
            <button class="play-button-large" (click)="togglePlay(); $event.stopPropagation()">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="white">
                <circle cx="40" cy="40" r="36" fill="rgba(0,0,0,0.6)" />
                <path d="M32 25l24 15-24 15V25z" />
              </svg>
            </button>
          </div>
        }
      </div>

      <!-- Controls -->
      <div class="video-controls">
        <!-- Progress Bar -->
        <div class="progress-bar-container" (click)="seek($event)">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progress()"></div>
            <div class="progress-handle" [style.left.%]="progress()"></div>
          </div>
        </div>

        <!-- Control Buttons -->
        <div class="controls-row">
          <div class="controls-left">
            <!-- Play/Pause -->
            <button class="control-btn" (click)="togglePlay()">
              @if (state().isPlaying) {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              } @else {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              }
            </button>

            <!-- Volume -->
            <button class="control-btn" (click)="toggleMute()">
              @if (state().isMuted || state().volume === 0) {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              } @else {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              }
            </button>

            <!-- Time -->
            <div class="time-display">
              {{ formatTime(state().currentTime) }} / {{ formatTime(state().duration) }}
            </div>
          </div>

          <div class="controls-right">
            <!-- Playback Speed -->
            <select
              class="playback-speed"
              [ngModel]="state().playbackRate"
              (ngModelChange)="setPlaybackRate($event)"
            >
              <option [value]="0.5">0.5x</option>
              <option [value]="0.75">0.75x</option>
              <option [value]="1">1x</option>
              <option [value]="1.25">1.25x</option>
              <option [value]="1.5">1.5x</option>
              <option [value]="2">2x</option>
            </select>

            <!-- Captions -->
            @if (mediaContent?.captionsUrl) {
              <button
                class="control-btn"
                [class.active]="state().captionsEnabled"
                (click)="toggleCaptions()"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
                </svg>
              </button>
            }

            <!-- Fullscreen -->
            <button class="control-btn" (click)="toggleFullscreen()">
              @if (state().isFullscreen) {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              } @else {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./video-player.component.scss'],
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @Input() mediaContent?: MediaContent;
  @Input() watermark?: string;
  @Input() autoplay = false;

  @Output() playbackEvent = new EventEmitter<{ type: string; position: number }>();
  @Output() stateChange = new EventEmitter<VideoPlayerState>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  state = signal<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isFullscreen: false,
    isMuted: false,
    captionsEnabled: false,
  });

  progress = computed(() => {
    const s = this.state();
    return s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0;
  });

  ngOnInit(): void {
    if (this.autoplay) {
      this.play();
    }
  }

  ngOnDestroy(): void {
    this.pause();
  }

  onLoadedMetadata(): void {
    const video = this.videoElement.nativeElement;
    this.state.update((s) => ({ ...s, duration: video.duration }));
  }

  onTimeUpdate(): void {
    const video = this.videoElement.nativeElement;
    this.state.update((s) => ({ ...s, currentTime: video.currentTime }));
    this.stateChange.emit(this.state());
  }

  onEnded(): void {
    this.state.update((s) => ({ ...s, isPlaying: false }));
    this.playbackEvent.emit({ type: 'ended', position: this.state().currentTime });
  }

  onPlay(): void {
    this.state.update((s) => ({ ...s, isPlaying: true }));
    this.playbackEvent.emit({ type: 'play', position: this.state().currentTime });
  }

  onPause(): void {
    this.state.update((s) => ({ ...s, isPlaying: false }));
    this.playbackEvent.emit({ type: 'pause', position: this.state().currentTime });
  }

  play(): void {
    this.videoElement?.nativeElement.play();
  }

  pause(): void {
    this.videoElement?.nativeElement.pause();
  }

  togglePlay(): void {
    if (this.state().isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  toggleMute(): void {
    const video = this.videoElement.nativeElement;
    video.muted = !video.muted;
    this.state.update((s) => ({ ...s, isMuted: video.muted }));
  }

  setPlaybackRate(rate: number): void {
    const video = this.videoElement.nativeElement;
    video.playbackRate = rate;
    this.state.update((s) => ({ ...s, playbackRate: rate }));
  }

  toggleCaptions(): void {
    const video = this.videoElement.nativeElement;
    const tracks = video.textTracks;
    if (tracks.length > 0) {
      const enabled = !this.state().captionsEnabled;
      tracks[0].mode = enabled ? 'showing' : 'hidden';
      this.state.update((s) => ({ ...s, captionsEnabled: enabled }));
    }
  }

  toggleFullscreen(): void {
    const container = this.videoElement.nativeElement.parentElement;
    if (!document.fullscreenElement) {
      container?.requestFullscreen();
      this.state.update((s) => ({ ...s, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      this.state.update((s) => ({ ...s, isFullscreen: false }));
    }
  }

  seek(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const video = this.videoElement.nativeElement;
    video.currentTime = percent * video.duration;
    this.playbackEvent.emit({ type: 'seek', position: video.currentTime });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
