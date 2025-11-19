/**
 * Reference Detail Component
 *
 * Displays full reference details including:
 * - Video/audio player with controls
 * - Text responses with formatting
 * - Referrer information (anonymized if needed)
 * - RCS score breakdown
 * - Authenticity verification badge
 * - Download/export options
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { EmployerActions } from '../../store/employer.actions';
import {
  selectCurrentReference,
  selectBundleSettings,
  selectIsLoading,
} from '../../store/employer.selectors';
import { Reference, ReferenceFormat } from '../../models/employer.models';
import { VideoPlayerComponent } from '../../../../shared/components/players/video-player.component';

@Component({
  selector: 'app-reference-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, VideoPlayerComponent],
  templateUrl: './reference-detail.component.html',
  styleUrls: ['./reference-detail.component.scss'],
})
export class ReferenceDetailComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly ReferenceFormat = ReferenceFormat;

  // Store selectors
  readonly reference$ = this.store.select(selectCurrentReference);
  readonly bundleSettings$ = this.store.select(selectBundleSettings);
  readonly isLoading$ = this.store.select(selectIsLoading);

  // Local state
  readonly showTranscription = signal(false);
  readonly showFullMetadata = signal(false);

  ngOnInit(): void {
    this.loadReference();
    this.subscribeToReference();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReference(): void {
    const referenceId = this.route.snapshot.paramMap.get('id');
    if (referenceId) {
      this.store.dispatch(EmployerActions.loadReference({ referenceId }));
    }
  }

  private subscribeToReference(): void {
    this.reference$
      .pipe(
        takeUntil(this.destroy$),
        filter((ref) => ref === null)
      )
      .subscribe(() => {
        // Reference not found or access denied
        const bundleId = this.route.snapshot.queryParamMap.get('bundleId');
        if (bundleId) {
          this.router.navigate(['/employer/bundle-viewer', bundleId]);
        } else {
          this.router.navigate(['/employer/bundle-access']);
        }
      });
  }

  goBack(): void {
    const bundleId = this.route.snapshot.queryParamMap.get('bundleId');
    if (bundleId) {
      this.router.navigate(['/employer/bundle-viewer', bundleId]);
    } else {
      this.router.navigate(['/employer/bundle-access']);
    }
  }

  onPlaybackEvent(event: { type: string; position: number }, referenceId: string): void {
    if (event.type === 'play') {
      this.store.dispatch(
        EmployerActions.trackReferencePlay({
          referenceId,
          position: event.position,
        })
      );
    }
  }

  downloadReference(referenceId: string, format: string): void {
    this.store.dispatch(
      EmployerActions.trackReferenceDownload({ referenceId, format })
    );
    this.store.dispatch(EmployerActions.exportReference({ referenceId, format }));
  }

  requestReachBack(referenceId: string): void {
    this.router.navigate(['/employer/reach-back', referenceId], {
      queryParams: {
        bundleId: this.route.snapshot.queryParamMap.get('bundleId'),
      },
    });
  }

  getRcsColorClass(score: number): string {
    if (score >= 80) return 'rcs-excellent';
    if (score >= 60) return 'rcs-good';
    if (score >= 40) return 'rcs-fair';
    return 'rcs-poor';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  toggleTranscription(): void {
    this.showTranscription.update((show) => !show);
  }

  toggleMetadata(): void {
    this.showFullMetadata.update((show) => !show);
  }
}
