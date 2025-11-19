import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Welcome/Landing Page Component
 *
 * This is the main entry point for unauthenticated users.
 * Displays DeepRef value proposition and authentication options.
 */
@Component({
  selector: 'app-welcome',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-primary-purple mb-4">
            Welcome to DeepRef
          </h1>
          <p class="text-lg text-gray-600 mb-8">
            AI-Powered Reference Verification Platform
          </p>

          <div class="space-y-4">
            <a
              routerLink="/auth/signin"
              class="block w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Sign In
            </a>

            <a
              routerLink="/auth/signup"
              class="block w-full border-2 border-primary-purple text-primary-purple hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Create Account
            </a>
          </div>

          <p class="mt-6 text-sm text-gray-500">
            Collect, manage, and share verified professional references
          </p>
        </div>
      </div>
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
export class WelcomeComponent {}
