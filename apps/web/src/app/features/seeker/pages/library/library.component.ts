/**
 * Reference Library Component
 *
 * Displays all references with filtering and search capabilities.
 * Shows list view with ability to navigate to detail view.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { ReferenceActions } from '../../store/seeker.actions';
import {
  selectFilteredReferences,
  selectReferenceFilters,
  selectIsLoadingReferences,
  selectError,
} from '../../store/seeker.selectors';
import {
  Reference,
  ReferenceFilters,
  ReferenceRequestStatus,
  ReferenceFormat,
} from '../../models/seeker.models';

/**
 * Library Component
 */
@Component({
  selector: 'app-library',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
})
export class LibraryComponent implements OnInit {
  private store = inject(Store);

  // Observables
  references$: Observable<Reference[]> = this.store.select(selectFilteredReferences);
  filters$: Observable<ReferenceFilters> = this.store.select(selectReferenceFilters);
  isLoading$ = this.store.select(selectIsLoadingReferences);
  error$ = this.store.select(selectError);

  // Filter state
  searchQuery = signal('');
  selectedStatuses = signal<ReferenceRequestStatus[]>([]);
  selectedFormats = signal<ReferenceFormat[]>([]);
  minRCS = signal<number | undefined>(undefined);
  maxRCS = signal<number | undefined>(undefined);

  // View mode
  viewMode = signal<'grid' | 'list'>('grid');

  // Status and format options
  statusOptions = [
    { value: ReferenceRequestStatus.COMPLETED, label: 'Completed' },
    { value: ReferenceRequestStatus.PENDING, label: 'Pending' },
    { value: ReferenceRequestStatus.DECLINED, label: 'Declined' },
  ];

  formatOptions = [
    { value: ReferenceFormat.VIDEO, label: 'Video', icon: 'pi-video' },
    { value: ReferenceFormat.AUDIO, label: 'Audio', icon: 'pi-microphone' },
    { value: ReferenceFormat.TEXT, label: 'Text', icon: 'pi-file-edit' },
  ];

  ngOnInit(): void {
    this.loadReferences();
  }

  loadReferences(): void {
    this.store.dispatch(ReferenceActions.loadReferences({}));
  }

  applyFilters(): void {
    const filters: ReferenceFilters = {
      searchQuery: this.searchQuery() || undefined,
      status: this.selectedStatuses().length > 0 ? this.selectedStatuses() : undefined,
      format: this.selectedFormats().length > 0 ? this.selectedFormats() : undefined,
      minRCS: this.minRCS(),
      maxRCS: this.maxRCS(),
    };

    this.store.dispatch(ReferenceActions.applyFilters({ filters }));
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatuses.set([]);
    this.selectedFormats.set([]);
    this.minRCS.set(undefined);
    this.maxRCS.set(undefined);
    this.store.dispatch(ReferenceActions.clearFilters());
  }

  toggleStatus(status: ReferenceRequestStatus): void {
    const statuses = this.selectedStatuses();
    const index = statuses.indexOf(status);

    if (index > -1) {
      this.selectedStatuses.set(statuses.filter((s) => s !== status));
    } else {
      this.selectedStatuses.set([...statuses, status]);
    }
    this.applyFilters();
  }

  toggleFormat(format: ReferenceFormat): void {
    const formats = this.selectedFormats();
    const index = formats.indexOf(format);

    if (index > -1) {
      this.selectedFormats.set(formats.filter((f) => f !== format));
    } else {
      this.selectedFormats.set([...formats, format]);
    }
    this.applyFilters();
  }

  downloadReference(referenceId: string, event: Event): void {
    event.stopPropagation();
    this.store.dispatch(ReferenceActions.downloadReference({ referenceId }));
  }

  getStatusBadgeClass(status: ReferenceRequestStatus): string {
    const classes: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      declined: 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getFormatBadgeClass(format: ReferenceFormat): string {
    const classes: Record<string, string> = {
      video: 'bg-purple-100 text-purple-800',
      audio: 'bg-green-100 text-green-800',
      text: 'bg-blue-100 text-blue-800',
    };
    return classes[format] || 'bg-gray-100 text-gray-800';
  }

  getRCSScoreClass(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
