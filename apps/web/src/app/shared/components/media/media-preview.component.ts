/**
 * Media Preview Component
 *
 * Universal media preview component for video, audio, and text content.
 * Displays uploaded or recorded media with playback controls.
 */

import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MediaType = 'video' | 'audio' | 'text';

export interface MediaPreview {
  type: MediaType;
  url?: string;
  text?: string;
  mimeType?: string;
  duration?: number;
  size?: number;
}

@Component({
  selector: 'app-media-preview',
  imports: [CommonModule],
  template: `
    <div class="media-preview">
      @if (media()) {
        <div class="rounded-lg overflow-hidden shadow-md">
          @switch (media()!.type) {
            @case ('video') {
              <div class="bg-black">
                <video
                  [src]="media()!.url"
                  controls
                  class="w-full"
                  style="max-height: 500px;"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            }
            @case ('audio') {
              <div class="bg-gray-100 p-8">
                <div class="flex flex-col items-center space-y-4">
                  <div
                    class="w-24 h-24 bg-primary-purple rounded-full flex items-center justify-center"
                  >
                    <svg
                      class="w-12 h-12 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"
                      />
                    </svg>
                  </div>
                  <audio [src]="media()!.url" controls class="w-full">
                    Your browser does not support the audio tag.
                  </audio>
                  @if (media()!.duration) {
                    <p class="text-sm text-gray-600">
                      Duration: {{ formatDuration(media()!.duration!) }}
                    </p>
                  }
                </div>
              </div>
            }
            @case ('text') {
              <div class="bg-white p-6">
                <div
                  class="prose max-w-none"
                  [innerHTML]="media()!.text || ''"
                ></div>
              </div>
            }
          }

          <!-- Media Info -->
          @if (showInfo()) {
            <div class="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div class="flex items-center justify-between text-sm text-gray-600">
                <span class="font-medium">
                  {{ getMediaTypeLabel(media()!.type) }}
                </span>
                <div class="flex items-center space-x-4">
                  @if (media()!.duration) {
                    <span>{{ formatDuration(media()!.duration!) }}</span>
                  }
                  @if (media()!.size) {
                    <span>{{ formatFileSize(media()!.size!) }}</span>
                  }
                  @if (media()!.mimeType) {
                    <span class="text-xs">{{ media()!.mimeType }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div
          class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center"
        >
          <svg
            class="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p class="text-gray-600">No media to preview</p>
        </div>
      }
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
export class MediaPreviewComponent {
  @Input() set mediaData(value: MediaPreview | null) {
    this.media.set(value);
  }

  @Input() showInfo = signal(true);

  media = signal<MediaPreview | null>(null);

  /**
   * Format duration in seconds to MM:SS
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size in bytes to human readable
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get media type label
   */
  getMediaTypeLabel(type: MediaType): string {
    switch (type) {
      case 'video':
        return 'Video Recording';
      case 'audio':
        return 'Audio Recording';
      case 'text':
        return 'Text Response';
      default:
        return 'Media';
    }
  }
}
