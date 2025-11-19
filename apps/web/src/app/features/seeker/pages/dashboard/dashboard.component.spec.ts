/**
 * Dashboard Component Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardActions } from '../../store/seeker.actions';
import { ReferenceRequestStatus } from '../../models/seeker.models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let store: MockStore;

  const initialState = {
    seeker: {
      dashboardStats: {
        totalReferences: 5,
        completedReferences: 4,
        pendingReferences: 1,
        averageRCS: 85,
        totalBundles: 2,
        activeBundles: 2,
        totalRequests: 10,
        pendingRequests: 3,
      },
      recentActivity: [],
      requests: [],
      references: [],
      bundles: [],
      isLoading: false,
      error: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideMockStore({ initialState })],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadDashboard action on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(DashboardActions.loadDashboard());
  });

  it('should dispatch loadDashboard action on refresh', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.refreshDashboard();
    expect(dispatchSpy).toHaveBeenCalledWith(DashboardActions.loadDashboard());
  });

  it('should format dates correctly', () => {
    const today = new Date().toISOString();
    expect(component.formatDate(today)).toBe('Today');

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(component.formatDate(yesterday)).toBe('Yesterday');

    expect(component.formatDate(undefined)).toBe('N/A');
  });
});
