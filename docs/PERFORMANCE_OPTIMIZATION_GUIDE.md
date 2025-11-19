# Performance Optimization Guide

## Table of Contents

1. [Bundle Size Optimization](#bundle-size-optimization)
2. [Core Web Vitals](#core-web-vitals)
3. [Code Splitting Strategies](#code-splitting-strategies)
4. [Image Optimization](#image-optimization)
5. [JavaScript Optimization](#javascript-optimization)
6. [CSS Optimization](#css-optimization)
7. [Network Optimization](#network-optimization)
8. [Monitoring & Debugging](#monitoring--debugging)

## Bundle Size Optimization

### 1. Understanding Your Bundle

Start by analyzing your current bundle:

```bash
# Generate statistics
npm run --workspace=apps/web analyze:size

# View bundle composition
npm run --workspace=apps/web analyze:bundle
```

### 2. Code Splitting

Split code by routes to reduce initial bundle:

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.component')
      .then(m => m.AuthComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  },
  {
    path: 'verify',
    loadChildren: () => import('./features/verify/verify.routes')
      .then(m => m.VERIFY_ROUTES)
  }
];
```

### 3. Lazy Loading Features

Load modules only when needed:

```typescript
// Feature module with lazy loading
export const VERIFY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./verify-list.component')
      .then(m => m.VerifyListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./verify-detail.component')
      .then(m => m.VerifyDetailComponent)
  }
];
```

### 4. Remove Unused Dependencies

```bash
# Find unused packages
npm ls --depth 0

# Audit dependencies
npm audit

# Check bundle size impact
npm ls @package-name
```

Common optimization opportunities:

- **Polyfills**: Only include necessary polyfills
- **Lodash**: Use lodash-es for tree shaking
- **DateFns**: Prefer over Moment.js (smaller)
- **RxJS**: Import only needed operators

### 5. Optimize Third-Party Libraries

```typescript
// ❌ AVOID - Loads entire library
import * as moment from 'moment';

// ✅ GOOD - Loads only needed modules
import { format } from 'date-fns';

// ✅ GOOD - Lazy load heavy libraries
async function useChart() {
  const { Chart } = await import('chart.js');
  return Chart;
}
```

## Core Web Vitals

### 1. Largest Contentful Paint (LCP)

**Target: < 2.0 seconds**

#### Optimize Images

```html
<!-- ✅ Use modern formats with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>

<!-- ✅ Set explicit dimensions -->
<img src="image.jpg" width="640" height="480" alt="Description">

<!-- ✅ Use lazy loading for below-fold -->
<img src="image.jpg" loading="lazy" alt="Description">
```

#### Preload Critical Resources

```html
<!-- Preload critical images -->
<link rel="preload" as="image" href="hero.webp">

<!-- Preload fonts -->
<link rel="preload" as="font" href="font.woff2" type="font/woff2" crossorigin>

<!-- DNS prefetch for external domains -->
<link rel="dns-prefetch" href="//api.example.com">
```

#### Minimize Critical CSS

```typescript
// Extract critical CSS inline
import { CRITICAL_STYLES } from './styles/critical.css';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  styles: [CRITICAL_STYLES] // Inline critical styles
})
export class AppComponent {}
```

### 2. First Input Delay (FID) / Interaction to Next Paint (INP)

**Target: < 100ms**

#### Break Up Long Tasks

```typescript
// ❌ AVOID - Blocks main thread
for (let i = 0; i < 1000000; i++) {
  expensiveCalculation();
}

// ✅ GOOD - Use requestIdleCallback
async function processItems(items: any[]) {
  for (const item of items) {
    await new Promise(resolve => {
      requestIdleCallback(() => {
        expensiveCalculation(item);
        resolve(null);
      });
    });
  }
}
```

#### Use Web Workers

```typescript
// service/heavy-computation.service.ts
@Injectable({ providedIn: 'root' })
export class HeavyComputationService {
  private worker = new Worker(
    new URL('./heavy-computation.worker.ts', import.meta.url)
  );

  processData(data: any[]): Observable<any> {
    return new Observable(subscriber => {
      this.worker.onmessage = ({ data }) => {
        subscriber.next(data);
        subscriber.complete();
      };
      this.worker.postMessage(data);
    });
  }
}
```

#### Defer Non-Critical JavaScript

```typescript
// Load analytics asynchronously
function initializeAnalytics() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      loadAnalyticsScript();
    });
  } else {
    setTimeout(loadAnalyticsScript, 2000);
  }
}

function loadAnalyticsScript() {
  const script = document.createElement('script');
  script.src = 'https://analytics.example.com/track.js';
  script.async = true;
  document.head.appendChild(script);
}
```

### 3. Cumulative Layout Shift (CLS)

**Target: < 0.1**

#### Reserve Space for Ads and Embeds

```html
<!-- Reserve space to prevent layout shift -->
<div style="width: 300px; height: 250px;">
  <script async src="https://ads.example.com/ad.js"></script>
</div>

<!-- Or use aspect-ratio -->
<div style="aspect-ratio: 16 / 9;">
  <iframe src="..."></iframe>
</div>
```

#### Font Loading Strategy

```typescript
// Add font-display: swap to prevent FOUT
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

// Or in CSS
@font-face {
  font-family: 'Custom Font';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}
```

#### Avoid Inserting Content Above Existing

```typescript
// ❌ BAD - Inserts banner above content
document.body.insertAdjacentHTML('afterbegin', '<banner>...</banner>');

// ✅ GOOD - Append to end or use position: fixed
const banner = document.createElement('div');
banner.style.position = 'fixed';
banner.style.top = '0';
document.body.appendChild(banner);
```

## Code Splitting Strategies

### 1. Route-Based Splitting

```typescript
export const routes: Routes = [
  {
    path: 'verify',
    loadChildren: () => import('./features/verify/verify.module')
      .then(m => m.VerifyModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.module')
      .then(m => m.SettingsModule)
  }
];
```

### 2. Component-Based Splitting

```typescript
// Lazy load heavy components
export async function loadHeavyChart() {
  const { ChartComponent } = await import('./components/heavy-chart.component');
  return ChartComponent;
}

// Use in template with ngComponentOutlet
<ng-container *ngComponentOutlet="heavyComponent"></ng-container>
```

### 3. Vendor vs Application Code

Angular CLI automatically splits these. To optimize:

```typescript
// Separate vendor chunk in angular.json
"optimization": {
  "scripts": true,
  "styles": true,
  "fonts": true
},
"vendorChunk": true
```

## Image Optimization

### 1. Image Format Selection

```html
<!-- WebP with fallback -->
<picture>
  <source srcset="image-optimized.webp" type="image/webp">
  <source srcset="image-optimized.avif" type="image/avif">
  <img src="image-fallback.jpg" alt="Description">
</picture>
```

### 2. Responsive Images

```html
<!-- Use srcset for responsive images -->
<img
  srcset="image-320w.jpg 320w,
          image-640w.jpg 640w,
          image-1280w.jpg 1280w"
  sizes="(max-width: 320px) 100vw,
         (max-width: 640px) 100vw,
         1280px"
  src="image-640w.jpg"
  alt="Description">
```

### 3. Image Lazy Loading

```html
<!-- Native lazy loading -->
<img src="image.jpg" loading="lazy" alt="Description">

<!-- With custom offset (load 50px before visible) -->
<img src="image.jpg" loading="lazy" alt="Description">
```

### 4. CDN Integration

```typescript
// Use CDN for image delivery
const imageUrl = `https://cdn.example.com/images/path/to/image?w=640&q=80`;
```

## JavaScript Optimization

### 1. Tree Shaking

```typescript
// ✅ GOOD - Named exports (tree-shakeable)
export function utilityA() {}
export function utilityB() {}

import { utilityA } from './utils'; // Only utilityA included

// ❌ BAD - Default exports (cannot tree-shake)
export default { utilityA, utilityB };
import * as utils from './utils'; // Both included
```

### 2. Change Detection Optimization

```typescript
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-item',
  template: '<div>{{ item.name }}</div>',
  changeDetection: ChangeDetectionStrategy.OnPush // Only check on input changes
})
export class ItemComponent {
  @Input() item: any;
}
```

### 3. OnPush Components with Signals

```typescript
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-item',
  template: '<div>{{ displayName() }}</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemComponent {
  item = input<any>();
  displayName = computed(() => this.item().name.toUpperCase());
}
```

## CSS Optimization

### 1. Critical CSS Inlining

```typescript
// In main.ts or styles configuration
const CRITICAL_CSS = `
  /* Minimal CSS for above-fold content */
  body { font-family: sans-serif; }
  .hero { display: grid; }
`;
```

### 2. CSS Scoping with ViewEncapsulation

```typescript
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-component',
  template: '<div>Content</div>',
  styles: [`
    :host { display: block; }
    div { color: blue; }
  `],
  encapsulation: ViewEncapsulation.ShadowDom // Scoped CSS
})
export class MyComponent {}
```

### 3. Tailwind CSS Optimization

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{html,ts}' // Only scan used classes
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
```

## Network Optimization

### 1. HTTP/2 Server Push

```typescript
// Set Cache-Control headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for static
  next();
});
```

### 2. Compression

```typescript
// Enable gzip compression
import compression from 'compression';
app.use(compression());
```

### 3. Service Worker Caching

```typescript
// angular.json
"serviceWorker": true,
"ngswConfigPath": "ngsw-config.json"

// ngsw-config.json
{
  "version": 1,
  "cacheConfig": {
    "maxAge": "30d",
    "maxSize": 100
  }
}
```

## Monitoring & Debugging

### 1. Chrome DevTools Performance Tab

```javascript
// Mark custom performance metrics
performance.mark('operation-start');
// ... do work ...
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

// Get measurement
const measure = performance.getEntriesByName('operation')[0];
console.log(`Operation took ${measure.duration}ms`);
```

### 2. Web Vitals Library

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 3. Sentry Performance Monitoring

```typescript
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: 'YOUR_DSN',
  tracesSampleRate: 0.1
});

// Automatic performance monitoring enabled
```

### 4. Profiling Components

```typescript
import { NgZone } from '@angular/core';

constructor(private ngZone: NgZone) {
  this.ngZone.onStable.subscribe(() => {
    performance.mark('component-stable');
  });
}
```

## Quick Wins Checklist

- [ ] Enable production builds
- [ ] Set up lazy loading for routes
- [ ] Optimize images with modern formats
- [ ] Remove unused dependencies
- [ ] Implement OnPush change detection
- [ ] Enable gzip compression
- [ ] Set up service worker caching
- [ ] Preload critical resources
- [ ] Defer non-critical JavaScript
- [ ] Monitor Core Web Vitals

## Performance Budget Maintenance

Run monthly performance audits:

```bash
# Generate comprehensive report
npm run analyze:bundle

# Check against budgets
cat performance-report.json | jq '.budgets'
```

## Resources

- [Angular Performance Best Practices](https://angular.io/guide/performance-best-practices)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Chrome DevTools Documentation](https://developers.google.com/web/tools/chrome-devtools)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
