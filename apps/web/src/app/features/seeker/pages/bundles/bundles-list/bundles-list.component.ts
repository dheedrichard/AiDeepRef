/**
 * Bundles List Component
 *
 * Displays all bundles with options to view, edit, and delete.
 * Shows bundle analytics and share links.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { BundleActions } from '../../../store/seeker.actions';
import {
  selectAllBundles,
  selectActiveBundles,
  selectIsLoadingBundles,
  selectError,
} from '../../../store/seeker.selectors';
import { Bundle, BundleStatus } from '../../../models/seeker.models';

/**
 * Bundles List Component
 */
@Component({
  selector: 'app-bundles-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './bundles-list.component.html',
  styleUrls: ['./bundles-list.component.scss'],
})
export class BundlesListComponent implements OnInit {
  private store = inject(Store);

  // Observables
  bundles$: Observable<Bundle[]> = this.store.select(selectAllBundles);
  activeBundles$: Observable<Bundle[]> = this.store.select(selectActiveBundles);
  isLoading$ = this.store.select(selectIsLoadingBundles);
  error$ = this.store.select(selectError);

  // Filter
  filterStatus = signal<BundleStatus | 'all'>('all');

  ngOnInit(): void {
    this.loadBundles();
  }

  loadBundles(): void {
    this.store.dispatch(BundleActions.loadBundles());
  }

  deleteBundle(bundleId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this bundle?')) {
      this.store.dispatch(BundleActions.deleteBundle({ bundleId }));
    }
  }

  copyShareLink(shareLink: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(shareLink).then(() => {
      // Could show a toast notification here
      alert('Share link copied to clipboard!');
    });
  }

  getStatusBadgeClass(status: BundleStatus): string {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  isExpiringSoon(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 7;
  }
}
