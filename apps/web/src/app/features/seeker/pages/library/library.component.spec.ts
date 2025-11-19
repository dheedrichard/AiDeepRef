/**
 * Library Component Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { LibraryComponent } from './library.component';
import { ReferenceActions } from '../../store/seeker.actions';
import { ReferenceRequestStatus, ReferenceFormat } from '../../models/seeker.models';

describe('LibraryComponent', () => {
  let component: LibraryComponent;
  let fixture: ComponentFixture<LibraryComponent>;
  let store: MockStore;

  const initialState = {
    seeker: {
      references: [
        {
          id: '1',
          requestId: '1',
          seekerId: '123',
          referrerId: '456',
          referrerName: 'John Doe',
          referrerEmail: 'john@example.com',
          company: 'Acme Corp',
          role: 'Manager',
          format: ReferenceFormat.VIDEO,
          rcsScore: 90,
          status: ReferenceRequestStatus.COMPLETED,
          isVerified: true,
          responses: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      referenceFilters: {},
      isLoadingReferences: false,
      error: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryComponent],
      providers: [provideMockStore({ initialState })],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadReferences action on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(ReferenceActions.loadReferences({}));
  });

  it('should apply filters when search query changes', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.searchQuery.set('test');
    component.applyFilters();
    expect(dispatchSpy).toHaveBeenCalledWith(
      ReferenceActions.applyFilters({
        filters: { searchQuery: 'test' },
      })
    );
  });

  it('should clear filters', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.searchQuery.set('test');
    component.selectedStatuses.set([ReferenceRequestStatus.COMPLETED]);
    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedStatuses().length).toBe(0);
    expect(dispatchSpy).toHaveBeenCalledWith(ReferenceActions.clearFilters());
  });

  it('should toggle status filter', () => {
    component.toggleStatus(ReferenceRequestStatus.COMPLETED);
    expect(component.selectedStatuses()).toContain(ReferenceRequestStatus.COMPLETED);

    component.toggleStatus(ReferenceRequestStatus.COMPLETED);
    expect(component.selectedStatuses()).not.toContain(ReferenceRequestStatus.COMPLETED);
  });

  it('should get correct RCS score class', () => {
    expect(component.getRCSScoreClass(90)).toBe('text-green-600');
    expect(component.getRCSScoreClass(70)).toBe('text-yellow-600');
    expect(component.getRCSScoreClass(50)).toBe('text-red-600');
  });
});
