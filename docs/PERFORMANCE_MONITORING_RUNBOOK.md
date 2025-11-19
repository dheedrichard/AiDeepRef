# Performance Monitoring Runbook

## Quick Reference

| Issue | Symptom | Action | Urgency |
|-------|---------|--------|---------|
| Bundle too large | Build fails with size error | See [Bundle Size Exceeded](#bundle-size-exceeded) | Critical |
| LCP too high | Pages load slowly | See [Slow Initial Load](#slow-initial-load) | High |
| TBT too high | Page becomes unresponsive | See [High Total Blocking Time](#high-total-blocking-time) | High |
| CLS too high | Content shifts after load | See [Layout Shift Issues](#layout-shift-issues) | Medium |

## Monitoring Dashboards

### GitHub Actions
1. Go to Actions tab
2. Filter by workflow type:
   - **bundle-size.yml** - Bundle size checks
   - **lighthouse-ci.yml** - Lighthouse audits
   - **performance-monitoring.yml** - Daily reports

### Artifacts
- `bundle-report-*` - Bundle size analysis
- `lighthouse-results-*` - Lighthouse audit reports
- `performance-history` - Historical data

### Local Monitoring

```bash
# Generate current bundle analysis
npm run analyze:bundle

# View performance report
cat performance-report.json | jq '.'
```

## Common Issues & Solutions

### Bundle Size Exceeded

**Symptom:**
```
❌ Performance budgets exceeded!
JavaScript: 520 KB / 500 KB
```

**Quick Diagnosis:**

```bash
# See what changed
npm run analyze:bundle

# Check bundle breakdown
npm run --workspace=apps/web analyze:size
```

**Solutions (in priority order):**

1. **Check Recent Dependencies**
   ```bash
   # View installed packages sorted by size
   npm ls --depth 0 | sort

   # Check specific package
   npm ls @package-name
   ```

2. **Enable Code Splitting**
   ```typescript
   // routes.ts
   {
     path: 'feature',
     loadChildren: () => import('./features/feature.module')
       .then(m => m.FeatureModule)
   }
   ```

3. **Remove Unused Dependencies**
   ```bash
   # Find unused imports with static analysis
   npm install -g unimported
   unimported
   ```

4. **Replace Heavy Dependencies**
   - **Moment.js** (67 KB) → **date-fns** (13 KB)
   - **Lodash** (71 KB) → **lodash-es** (24 KB) with tree shaking
   - **jQuery** (30 KB) → Remove or use modern APIs

5. **Optimize Imports**
   ```typescript
   // ❌ BAD
   import * as lodash from 'lodash';

   // ✅ GOOD
   import { debounce } from 'lodash-es';
   ```

### Slow Initial Load (LCP > 2.0s)

**Symptom:**
- Lighthouse LCP audit: > 2000 ms
- Users report slow page loads
- Core Web Vitals: LCP failing

**Diagnosis Steps:**

```bash
# 1. Run Lighthouse locally
lighthouse http://localhost:4200/welcome --view

# 2. Check what's blocking rendering
# In Chrome DevTools:
# - Performance tab → Record → Load page → Analyze
# - Look for long tasks, render blocking resources
```

**Solutions:**

1. **Optimize Images**
   ```typescript
   // Use modern formats with fallback
   <picture>
     <source srcset="image.webp" type="image/webp">
     <img src="image.jpg" alt="Hero">
   </picture>

   // Preload hero image
   <link rel="preload" as="image" href="hero.webp">
   ```

2. **Defer Non-Critical JavaScript**
   ```typescript
   // In main.ts
   if ('requestIdleCallback' in window) {
     requestIdleCallback(() => {
       import('@sentry/angular'); // Load Sentry lazily
     });
   }
   ```

3. **Inline Critical CSS**
   ```typescript
   // Extract critical styles for above-fold content
   import { CRITICAL_STYLES } from './styles/critical.css';

   @Component({
     styles: [CRITICAL_STYLES]
   })
   export class AppComponent {}
   ```

4. **Preload Critical Fonts**
   ```html
   <link rel="preload" as="font" href="font-family.woff2"
         type="font/woff2" crossorigin>
   <link rel="dns-prefetch" href="//api.example.com">
   ```

5. **Enable Brotli Compression**
   ```typescript
   // server.ts or main.ts
   import compression from 'compression';
   app.use(compression({ algorithm: 'br' }));
   ```

### High Total Blocking Time (TBT > 200ms)

**Symptom:**
- Lighthouse TBT audit: > 200 ms
- Page becomes unresponsive after load
- Users report jank or stuttering

**Diagnosis:**

```bash
# 1. Check for long tasks
lighthouse http://localhost:4200 --view
# Look for: "Main-thread work breakdown" section

# 2. Performance profiling in Chrome DevTools
# - Performance tab → Record → Interact → Analyze
# - Look for yellow/red bars > 50ms
```

**Solutions:**

1. **Break Up Long Tasks**
   ```typescript
   // ❌ BAD - Blocks thread
   for (let i = 0; i < 10000; i++) {
     expensiveCalculation();
   }

   // ✅ GOOD - Yields to browser
   async function processItems(items: any[]) {
     for (const item of items) {
       await new Promise(resolve => {
         setTimeout(resolve, 0); // Yield
       });
       expensiveCalculation(item);
     }
   }
   ```

2. **Use Web Workers**
   ```typescript
   // heavy-computation.worker.ts
   self.onmessage = ({ data }) => {
     const result = expensiveCalculation(data);
     self.postMessage(result);
   };

   // component.ts
   const worker = new Worker(
     new URL('./heavy-computation.worker.ts', import.meta.url)
   );
   worker.postMessage(largeDataset);
   worker.onmessage = ({ data }) => {
     this.result = data;
   };
   ```

3. **Optimize Change Detection**
   ```typescript
   import { ChangeDetectionStrategy } from '@angular/core';

   @Component({
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   export class OptimizedComponent {}
   ```

4. **Defer Analytics**
   ```typescript
   // Load analytics only after user interaction
   document.addEventListener('click', () => {
     import('./analytics').then(m => m.initAnalytics());
   }, { once: true });
   ```

### Layout Shift Issues (CLS > 0.1)

**Symptom:**
- Content shifts after images/ads load
- Text moves while reading
- CLS audit failure

**Diagnosis:**

```bash
# 1. Run Lighthouse
lighthouse http://localhost:4200 --view
# Look for "Cumulative Layout Shift" section

# 2. Visual inspection
# Open DevTools → More tools → Rendering → Paint flashing
# Look for layout shifts after page load
```

**Solutions:**

1. **Reserve Space for Images**
   ```html
   <!-- Explicit dimensions -->
   <img src="image.jpg" width="640" height="480" alt="Image">

   <!-- Or aspect-ratio -->
   <div style="aspect-ratio: 16 / 9;">
     <img src="image.jpg" alt="Image">
   </div>
   ```

2. **Reserve Space for Ads**
   ```html
   <!-- Container with fixed dimensions -->
   <div style="width: 300px; height: 250px;">
     <script async src="https://ads.example.com/ad.js"></script>
   </div>
   ```

3. **Fix Font Loading Shifts**
   ```css
   /* Font display: swap prevents FOUT */
   @font-face {
     font-family: 'Main Font';
     src: url('font.woff2') format('woff2');
     font-display: swap; /* Show fallback while loading */
   }
   ```

4. **Avoid Inserting Content Above Fold**
   ```typescript
   // ❌ BAD
   const banner = document.createElement('div');
   document.body.insertBefore(banner, document.body.firstChild);

   // ✅ GOOD - Use fixed positioning
   const banner = document.createElement('div');
   banner.style.position = 'fixed';
   banner.style.top = '0';
   banner.style.width = '100%';
   document.body.appendChild(banner);
   ```

## Performance Regression Detection

### Automated Detection

1. **Bundle Size Regression**
   ```bash
   # Build compare
   npm run analyze:bundle
   # Check performance-report.json against baseline
   ```

2. **Historical Comparison**
   ```bash
   # GitHub Actions artifacts retain 90 days of history
   # Download previous reports to compare
   ```

### Manual Investigation

```bash
# 1. Build current version
npm run build:web -- --configuration=production

# 2. Compare sizes
npm run analyze:bundle

# 3. Identify culprit
npm ls --all | grep "package-name"

# 4. Check commit history
git log --oneline --all -- apps/web/package.json | head -5
```

## Lighthouse CI Debugging

### Failed Lighthouse Run

**Check logs:**
```bash
# View workflow logs
gh run view <run_id> --log
```

**Common Issues:**

1. **Port already in use**
   ```bash
   # Kill process using port 4200
   lsof -i :4200
   kill -9 <PID>
   ```

2. **Build failed**
   ```bash
   # Check build logs
   npm run build:web -- --configuration=production --verbose
   ```

3. **Connection timeout**
   - Ensure server is running
   - Check firewall rules
   - Verify URL is correct in `.lighthouserc.json`

### Manual Lighthouse Run

```bash
# Install
npm install -g @lhci/cli

# Configure server
npm run --workspace=apps/web serve:ssr &

# Run audits
lhci autorun --config=.lighthouserc.json

# View results
open .lighthouseci/lhr-0.html
```

## Monitoring Metrics

### Key Metrics to Watch

```json
{
  "performance": {
    "totalJS": "< 500 KB",
    "totalCSS": "< 50 KB",
    "fcp": "< 1500 ms",
    "lcp": "< 2000 ms",
    "tbt": "< 200 ms",
    "cls": "< 0.1"
  }
}
```

### Checking Current Status

```bash
# Generate report
npm run analyze:bundle

# View summary
cat performance-report.json | jq '{
  js: .bundles.totalJS,
  css: .bundles.totalCSS,
  passed: .allPassed
}'
```

## Escalation Guide

### When to Alert

1. **Immediate Escalation (Critical)**
   - Bundle size > 500 KB (error threshold)
   - Lighthouse Performance < 70
   - Multiple Core Web Vitals failing

2. **Same-Day Review (High)**
   - Bundle approaching limit (> 450 KB)
   - LCP or FID degradation
   - New performance regression detected

3. **Weekly Review (Medium)**
   - Accumulated small regressions
   - Trend analysis shows decline
   - Preventive optimization opportunities

### Escalation Contacts

- **Performance Team**: #performance
- **Lead Developer**: In code review
- **DevOps**: For deployment performance issues
- **Product**: For feature scope vs. performance trade-offs

## Performance Tuning Workflow

### Step 1: Establish Baseline
```bash
npm run analyze:bundle
# Document current sizes
```

### Step 2: Identify Issues
```bash
# Run Lighthouse
npm install -g lighthouse
lighthouse http://localhost:4200 --view

# Check bundles
npm run --workspace=apps/web analyze:size
```

### Step 3: Implement Fixes
- Address highest impact items first
- Document changes in PR description
- Include performance metrics in commits

### Step 4: Verify Improvements
```bash
npm run build:web -- --configuration=production
npm run analyze:bundle

# Should show: ✅ All performance budgets passed!
```

### Step 5: Monitor Trend
- Archive report for trend analysis
- Compare against previous builds
- Ensure no regressions on main

## Useful Commands Reference

```bash
# Bundle analysis
npm run analyze:bundle          # Full report with budgets
npm run analyze:size            # Detailed size breakdown

# Lighthouse audits
lighthouse http://localhost:4200 --view
lhci autorun --config=.lighthouserc.json

# Size comparison
npm ls --depth=0 --all
npm ls @package-name

# Tree shake check
npm run build -- --stats-json
webpack-bundle-analyzer dist/stats.json

# Performance profiling
npm run build -- --configuration=production --verbose
time npm run build:web

# Git history
git log --oneline --all -- performance-report.json
```

## Resources

- [Performance Dashboard](./PERFORMANCE_BUDGETS.md)
- [Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Lighthouse Docs](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Angular Performance](https://angular.io/guide/performance-best-practices)
