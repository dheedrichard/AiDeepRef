/**
 * Bundle Viewer Component
 *
 * Main viewing interface for reference bundles.
 * Features:
 * - Seeker information summary
 * - Aggregated RCS score visualization
 * - Reference list with filters
 * - Individual reference cards
 * - Bundle statistics
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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EmployerActions } from '../../store/employer.actions';
import {
  selectBundleViewData,
  selectFilteredReferences,
  selectFilterOptions,
  selectSeekerInfo,
  selectAggregatedRcs,
  selectBundleStatistics,
  selectIsLoading,
  selectError,
} from '../../store/employer.selectors';
import {
  Bundle,
  Reference,
  ReferenceFormat,
  ReferenceFilterOptions,
} from '../../models/employer.models';

@Component({
  selector: 'app-bundle-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './bundle-viewer.component.html',
  styleUrls: ['./bundle-viewer.component.scss'],
})
export class BundleViewerComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // Reference Format Enum for template
  readonly ReferenceFormat = ReferenceFormat;

  // Store selectors
  readonly bundleViewData$ = this.store.select(selectBundleViewData);
  readonly filteredReferences$ = this.store.select(selectFilteredReferences);
  readonly seekerInfo$ = this.store.select(selectSeekerInfo);
  readonly aggregatedRcs$ = this.store.select(selectAggregatedRcs);
  readonly statistics$ = this.store.select(selectBundleStatistics);
  readonly filterOptions$ = this.store.select(selectFilterOptions);
  readonly isLoading$ = this.store.select(selectIsLoading);
  readonly error$ = this.store.select(selectError);

  // Local state signals
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly showFilters = signal(false);
  readonly selectedFormat = signal<ReferenceFormat | 'all'>('all');
  readonly searchQuery = signal('');
  readonly sortBy = signal<'date' | 'rcsScore' | 'format'>('date');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly minRcsScore = signal<number>(0);

  ngOnInit(): void {
    this.initializeBundle();
    this.startBundleViewTracking();
  }

  ngOnDestroy(): void {
    this.endBundleViewTracking();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize Bundle
   */
  private initializeBundle(): void {
    const bundleId = this.route.snapshot.paramMap.get('id');
    if (!bundleId) {
      this.router.navigate(['/employer/bundle-access']);
      return;
    }

    // Load bundle data
    this.store.dispatch(EmployerActions.loadBundle({ bundleId }));
  }

  /**
   * Start Bundle View Tracking
   */
  private startBundleViewTracking(): void {
    const bundleId = this.route.snapshot.paramMap.get('id');
    if (bundleId) {
      this.store.dispatch(EmployerActions.startBundleView({ bundleId }));
    }
  }

  /**
   * End Bundle View Tracking
   */
  private endBundleViewTracking(): void {
    const bundleId = this.route.snapshot.paramMap.get('id');
    if (bundleId) {
      this.store.dispatch(EmployerActions.endBundleView({ bundleId }));
    }
  }

  /**
   * Toggle View Mode
   */
  toggleViewMode(): void {
    this.viewMode.update((mode) => (mode === 'grid' ? 'list' : 'grid'));
  }

  /**
   * Toggle Filters Panel
   */
  toggleFilters(): void {
    this.showFilters.update((show) => !show);
  }

  /**
   * Apply Filters
   */
  applyFilters(): void {
    const filters: Partial<ReferenceFilterOptions> = {
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      minRcsScore: this.minRcsScore(),
      searchQuery: this.searchQuery() || undefined,
      format:
        this.selectedFormat() !== 'all'
          ? (this.selectedFormat() as ReferenceFormat)
          : undefined,
    };

    this.store.dispatch(EmployerActions.updateFilterOptions({ filterOptions: filters }));
  }

  /**
   * Clear Filters
   */
  clearFilters(): void {
    this.selectedFormat.set('all');
    this.searchQuery.set('');
    this.sortBy.set('date');
    this.sortOrder.set('desc');
    this.minRcsScore.set(0);
    this.store.dispatch(EmployerActions.clearFilters());
  }

  /**
   * View Reference Detail
   */
  viewReference(referenceId: string): void {
    this.router.navigate(['/employer/reference-detail', referenceId], {
      queryParams: { bundleId: this.route.snapshot.paramMap.get('id') },
    });
  }

  /**
   * Get RCS Color Class
   */
  getRcsColorClass(score: number): string {
    if (score >= 80) return 'rcs-excellent';
    if (score >= 60) return 'rcs-good';
    if (score >= 40) return 'rcs-fair';
    return 'rcs-poor';
  }

  /**
   * Get Format Icon
   */
  getFormatIcon(format: ReferenceFormat): string {
    switch (format) {
      case ReferenceFormat.VIDEO:
        return 'video';
      case ReferenceFormat.AUDIO:
        return 'audio';
      case ReferenceFormat.TEXT:
        return 'text';
      default:
        return 'document';
    }
  }

  /**
   * Get Format Label
   */
  getFormatLabel(format: ReferenceFormat): string {
    switch (format) {
      case ReferenceFormat.VIDEO:
        return 'Video';
      case ReferenceFormat.AUDIO:
        return 'Audio';
      case ReferenceFormat.TEXT:
        return 'Text';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format Date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  }

  /**
   * Format Duration
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Export Bundle
   */
  exportBundle(): void {
    const bundleId = this.route.snapshot.paramMap.get('id');
    if (bundleId) {
      this.store.dispatch(
        EmployerActions.exportBundle({ bundleId, format: 'pdf' })
      );
    }
  }

  /**
   * Print Bundle
   */
  printBundle(): void {
    window.print();
  }

  /**
   * Share Bundle
   */
  shareBundle(): void {
    if (navigator.share) {
      const bundleId = this.route.snapshot.paramMap.get('id');
      navigator
        .share({
          title: 'Reference Bundle',
          text: 'Check out this reference bundle',
          url: window.location.href,
        })
        .catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }

  /**
   * Track Reference Card Click
   */
  onReferenceCardClick(reference: Reference): void {
    const bundleId = this.route.snapshot.paramMap.get('id');
    if (bundleId) {
      this.store.dispatch(EmployerActions.viewReference({ referenceId: reference.id }));
    }
    this.viewReference(reference.id);
  }
}
