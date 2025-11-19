/**
 * Create Bundle Component
 *
 * Form for creating a new reference bundle.
 * Allows selection of references, setting title, description, expiry, and password.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { BundleActions, ReferenceActions } from '../../../store/seeker.actions';
import {
  selectAllReferences,
  selectIsLoadingBundles,
  selectError,
} from '../../../store/seeker.selectors';
import { Reference, CreateBundlePayload } from '../../../models/seeker.models';

/**
 * Create Bundle Component
 */
@Component({
  selector: 'app-create-bundle',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-bundle.component.html',
  styleUrls: ['./create-bundle.component.scss'],
})
export class CreateBundleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);

  // Form
  bundleForm!: FormGroup;

  // Data
  references$ = this.store.select(selectAllReferences);
  selectedReferences = signal<Reference[]>([]);

  // Loading states
  isLoading$ = this.store.select(selectIsLoadingBundles);
  error$ = this.store.select(selectError);

  // Password visibility
  showPassword = signal(false);

  ngOnInit(): void {
    this.initializeForm();
    this.loadReferences();
  }

  initializeForm(): void {
    this.bundleForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      expiryDate: [''],
      password: [''],
      hasPassword: [false],
    });

    // Watch hasPassword changes
    this.bundleForm.get('hasPassword')?.valueChanges.subscribe((hasPassword) => {
      const passwordControl = this.bundleForm.get('password');
      if (hasPassword) {
        passwordControl?.setValidators([Validators.required, Validators.minLength(8)]);
      } else {
        passwordControl?.clearValidators();
        passwordControl?.setValue('');
      }
      passwordControl?.updateValueAndValidity();
    });
  }

  loadReferences(): void {
    this.store.dispatch(ReferenceActions.loadReferences({}));
  }

  toggleReferenceSelection(reference: Reference): void {
    const selected = this.selectedReferences();
    const index = selected.findIndex((r) => r.id === reference.id);

    if (index > -1) {
      this.selectedReferences.set(selected.filter((r) => r.id !== reference.id));
    } else {
      this.selectedReferences.set([...selected, reference]);
    }
  }

  isReferenceSelected(reference: Reference): boolean {
    return this.selectedReferences().some((r) => r.id === reference.id);
  }

  calculateAggregatedRCS(): number {
    const selected = this.selectedReferences();
    if (selected.length === 0) return 0;

    const total = selected.reduce((sum, ref) => sum + ref.rcsScore, 0);
    return Math.round((total / selected.length) * 10) / 10;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submitBundle(): void {
    if (!this.bundleForm.valid || this.selectedReferences().length === 0) {
      this.bundleForm.markAllAsTouched();
      return;
    }

    const formValue = this.bundleForm.value;
    const payload: CreateBundlePayload = {
      title: formValue.title,
      description: formValue.description || undefined,
      referenceIds: this.selectedReferences().map((r) => r.id),
      expiryDate: formValue.expiryDate || undefined,
      password: formValue.hasPassword ? formValue.password : undefined,
    };

    this.store.dispatch(BundleActions.createBundle({ payload }));
  }

  cancel(): void {
    this.router.navigate(['/app/seeker/bundles']);
  }
}
