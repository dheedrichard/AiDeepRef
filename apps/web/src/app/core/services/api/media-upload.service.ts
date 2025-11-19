/**
 * Media Upload Service
 *
 * Handles media file uploads with chunking for large files.
 * Supports progress tracking and deepfake verification.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  MediaUploadPayload,
  MediaUploadResponse,
  UploadProgress,
} from '../../../features/referrer/models/referrer.models';
import { Store } from '@ngrx/store';
import { ReferrerActions } from '../../../features/referrer/store';

@Injectable({
  providedIn: 'root',
})
export class MediaUploadService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);
  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  // Chunk size for large file uploads (5MB)
  private readonly CHUNK_SIZE = 5 * 1024 * 1024;

  // Maximum file sizes
  private readonly MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Upload media file with progress tracking
   */
  uploadMedia(payload: MediaUploadPayload): Observable<MediaUploadResponse> {
    const file = payload.file;

    // Validate file size
    if (!this.validateFileSize(file)) {
      return throwError(() => new Error('File size exceeds maximum allowed size'));
    }

    // Determine if chunked upload is needed
    if (file.size > this.CHUNK_SIZE) {
      return this.uploadInChunks(payload);
    } else {
      return this.uploadDirect(payload);
    }
  }

  /**
   * Direct upload for smaller files
   */
  private uploadDirect(payload: MediaUploadPayload): Observable<MediaUploadResponse> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('referenceRequestId', payload.referenceRequestId);
    if (payload.questionId) {
      formData.append('questionId', payload.questionId);
    }

    return this.http
      .post<MediaUploadResponse>(`${this.baseUrl}/media/upload`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        tap((event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round((100 * event.loaded) / event.total);
            this.store.dispatch(
              ReferrerActions.uploadMediaProgress({
                progress: {
                  fileId: payload.file.name,
                  fileName: payload.file.name,
                  progress,
                  status: 'uploading',
                },
              })
            );
          }
        }),
        map((event: HttpEvent<any>) => {
          if (event.type === HttpEventType.Response) {
            return event.body;
          }
          return null as any;
        }),
        map((response) => ({
          fileId: payload.file.name,
          url: response.url,
          authenticityScore: response.authenticityScore,
          deepfakeProbability: response.deepfakeProbability,
        })),
        catchError((error) => {
          console.error('Upload error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Chunked upload for larger files
   */
  private uploadInChunks(payload: MediaUploadPayload): Observable<MediaUploadResponse> {
    const file = payload.file;
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    let uploadedChunks = 0;

    // Initialize upload session
    return this.initializeChunkedUpload(payload).pipe(
      map((response) => {
        const uploadId = response.uploadId;

        // Upload chunks sequentially
        const uploadPromises: Promise<void>[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const start = i * this.CHUNK_SIZE;
          const end = Math.min(start + this.CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const promise = this.uploadChunk(
            uploadId,
            chunk,
            i,
            totalChunks,
            payload.file.name
          ).then(() => {
            uploadedChunks++;
            const progress = Math.round((uploadedChunks / totalChunks) * 100);
            this.store.dispatch(
              ReferrerActions.uploadMediaProgress({
                progress: {
                  fileId: payload.file.name,
                  fileName: payload.file.name,
                  progress,
                  status: 'uploading',
                },
              })
            );
          });

          uploadPromises.push(promise);
        }

        // Wait for all chunks to upload
        return Promise.all(uploadPromises).then(() => {
          // Finalize upload
          return this.finalizeChunkedUpload(uploadId).toPromise();
        });
      }),
      map((finalizePromise: any) => finalizePromise as MediaUploadResponse)
    );
  }

  /**
   * Initialize chunked upload session
   */
  private initializeChunkedUpload(
    payload: MediaUploadPayload
  ): Observable<{ uploadId: string }> {
    return this.http.post<{ uploadId: string }>(`${this.baseUrl}/media/upload/init`, {
      fileName: payload.file.name,
      fileSize: payload.file.size,
      fileType: payload.file.type,
      referenceRequestId: payload.referenceRequestId,
      questionId: payload.questionId,
    });
  }

  /**
   * Upload a single chunk
   */
  private uploadChunk(
    uploadId: string,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    fileName: string
  ): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());

    return this.http
      .post<void>(`${this.baseUrl}/media/upload/${uploadId}/chunk`, formData)
      .toPromise() as Promise<void>;
  }

  /**
   * Finalize chunked upload
   */
  private finalizeChunkedUpload(uploadId: string): Observable<MediaUploadResponse> {
    return this.http.post<MediaUploadResponse>(
      `${this.baseUrl}/media/upload/${uploadId}/finalize`,
      {}
    );
  }

  /**
   * Validate file size based on type
   */
  private validateFileSize(file: File): boolean {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (isVideo && file.size > this.MAX_VIDEO_SIZE) {
      return false;
    }

    if (isAudio && file.size > this.MAX_AUDIO_SIZE) {
      return false;
    }

    return true;
  }

  /**
   * Get upload progress for a file
   */
  getUploadProgress(fileId: string): Observable<UploadProgress> {
    return this.http.get<UploadProgress>(`${this.baseUrl}/media/upload/${fileId}/progress`);
  }

  /**
   * Cancel an ongoing upload
   */
  cancelUpload(uploadId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/media/upload/${uploadId}`);
  }

  /**
   * Compress video before upload (client-side)
   * Note: This is a placeholder - actual implementation would use a library like FFmpeg.js
   */
  compressVideo(file: File): Promise<File> {
    // TODO: Implement video compression
    // For now, return the original file
    return Promise.resolve(file);
  }

  /**
   * Verify media authenticity (deepfake detection)
   */
  verifyAuthenticity(mediaUrl: string, mediaType: 'video' | 'audio'): Observable<{
    authenticityScore: number;
    deepfakeProbability: number;
  }> {
    return this.http.post<{
      authenticityScore: number;
      deepfakeProbability: number;
    }>(`${this.baseUrl}/ai/verify-authenticity`, {
      mediaUrl,
      mediaType,
    });
  }
}
