/**
 * Requests List Component (Stub)
 *
 * Placeholder for requests list functionality
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-requests-list',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold text-gray-900">My Requests</h1>
        <a
          routerLink="/app/seeker/requests/new"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Request
        </a>
      </div>
      <p class="text-gray-600">Requests list coming soon...</p>
    </div>
  `,
})
export class RequestsListComponent {}
