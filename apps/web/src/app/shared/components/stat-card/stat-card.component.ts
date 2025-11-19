/**
 * Stat Card Component
 *
 * Displays a statistic with an icon, title, value, and optional trend.
 * Used in dashboards and summary views.
 */

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Stat Card Component
 */
@Component({
  selector: 'app-stat-card',
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-600">{{ title() }}</p>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ value() }}</p>
          @if (subtitle()) {
            <p class="text-sm text-gray-500 mt-1">{{ subtitle() }}</p>
          }
        </div>
        @if (icon()) {
          <div
            class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
            [ngClass]="iconBgClass()"
          >
            <i [class]="icon()" [ngClass]="iconColorClass()"></i>
          </div>
        }
      </div>
      @if (trend() !== undefined && trend() !== null) {
        <div class="mt-4 flex items-center">
          @if (trend()! > 0) {
            <i class="pi pi-arrow-up text-green-600 text-sm mr-1"></i>
            <span class="text-sm font-medium text-green-600">+{{ trend() }}%</span>
          } @else if (trend()! < 0) {
            <i class="pi pi-arrow-down text-red-600 text-sm mr-1"></i>
            <span class="text-sm font-medium text-red-600">{{ trend() }}%</span>
          } @else {
            <i class="pi pi-minus text-gray-600 text-sm mr-1"></i>
            <span class="text-sm font-medium text-gray-600">{{ trend() }}%</span>
          }
          <span class="text-sm text-gray-500 ml-2">vs last month</span>
        </div>
      }
    </div>
  `,
})
export class StatCardComponent {
  title = input.required<string>();
  value = input.required<string | number>();
  subtitle = input<string>();
  icon = input<string>();
  iconBgClass = input<string>('bg-blue-100');
  iconColorClass = input<string>('text-blue-600');
  trend = input<number>();
}
