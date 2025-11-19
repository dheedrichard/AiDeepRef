# Performance Budgets & Monitoring

## Overview

DeepRef maintains strict performance budgets to ensure minimal client-side load and optimal user experience. All builds are automatically checked against these budgets.

## Bundle Size Budgets

| Bundle | Target | Warning | Error | Current |
|--------|--------|---------|-------|---------|
| Initial (main.js) | 350 KB | 400 KB | 500 KB | TBD |
| Vendor (vendor.js) | 250 KB | 300 KB | 400 KB | TBD |
| Total CSS | 40 KB | 50 KB | 60 KB | TBD |
| Component Styles | 4 KB | 5 KB | 6 KB | TBD |
| Total JavaScript | 400 KB | 450 KB | 500 KB | TBD |

## Core Web Vitals Budgets

| Metric | Acronym | Target | Description | Priority |
|--------|---------|--------|-------------|----------|
| First Contentful Paint | FCP | < 1.5s | Time to first text/image paint | High |
| Largest Contentful Paint | LCP | < 2.0s | Time to largest content element | High |
| Total Blocking Time | TBT | < 200ms | Total time page is blocked by JS | High |
| Cumulative Layout Shift | CLS | < 0.1 | Visual stability score | High |
| Time to Interactive | TTI | < 3.0s | Time until fully interactive | Medium |
| Speed Index | SI | < 2.5s | Visual progress metric | Medium |
| First Input Delay | FID | < 100ms | Responsiveness to user input | High |

## Lighthouse Score Budgets

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| Performance | ≥ 90 | TBD | |
| Accessibility | ≥ 90 | TBD | |
| Best Practices | ≥ 85 | TBD | |
| SEO | ≥ 90 | TBD | |

## Monitoring Strategy

### 1. Automated Bundle Size Checking

**Trigger:** On every build and PR

```bash
npm run analyze:bundle
```

- Analyzes JavaScript bundle sizes
- Checks CSS file sizes
- Compares against configured budgets
- Generates `performance-report.json`
- Fails build if budgets exceeded

### 2. Lighthouse CI

**Trigger:** On every PR and daily schedule

- Runs 3 iterations of Lighthouse audits
- Tests desktop performance configuration
- Checks against Core Web Vitals thresholds
- Validates Lighthouse score requirements
- Uploads results to artifact storage

### 3. Daily Performance Monitoring

**Trigger:** Daily at midnight UTC

- Builds production application
- Analyzes bundle sizes
- Generates performance summary
- Archives historical data
- Alerts on budget violations

### 4. Real User Monitoring (RUM)

**Integration:** Sentry Performance

- Tracks real user Core Web Vitals
- Monitors API response times
- Captures performance regressions
- Alerts on threshold violations

## Actions on Budget Violations

### Warning Level
- Code review comments on PR
- Notification in GitHub
- Optimization review recommended

### Error Level
- Blocks PR merge
- Requires explanation in PR description
- Forces optimization or budget increase discussion

### Critical Level
- Immediate investigation required
- Escalation to performance team
- Root cause analysis mandatory

## Performance Optimization Tips

### Bundle Size Reduction

1. **Code Splitting**
   ```typescript
   // Lazy load routes
   const routes = [
     {
       path: 'feature',
       loadComponent: () => import('./feature.component')
     }
   ];
   ```

2. **Remove Unused Dependencies**
   - Regular dependency audits
   - Use `npm ls` to find unused packages
   - Review bundle analysis reports

3. **Optimize Third-Party Scripts**
   - Defer non-critical scripts
   - Load tracking scripts asynchronously
   - Use web workers for heavy computation

4. **Tree Shaking**
   - Use ES6 modules
   - Avoid CommonJS imports
   - Enable production builds

### Core Web Vitals Optimization

1. **LCP (Largest Contentful Paint)**
   - Optimize images with next-gen formats
   - Defer non-critical resources
   - Use preload for critical resources
   - Minimize critical CSS

2. **FID/TBT (First Input Delay / Total Blocking Time)**
   - Break up long JavaScript tasks
   - Use Web Workers for heavy computation
   - Defer non-critical JavaScript
   - Use `requestIdleCallback` for non-essential work

3. **CLS (Cumulative Layout Shift)**
   - Reserve space for images and iframes
   - Avoid inserting content above existing content
   - Use transform animations instead of position changes
   - Include dimensions on media elements

4. **FCP (First Contentful Paint)**
   - Remove render-blocking resources
   - Inline critical CSS
   - Minimize initial JavaScript
   - Use fonts with `font-display: swap`

## Running Performance Tests

### Local Bundle Analysis

```bash
# Analyze bundle size
npm run --workspace=apps/web analyze:bundle

# Generate detailed statistics
npm run --workspace=apps/web analyze:size
```

### Local Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:4200 --view
```

### Full Performance Test Suite

```bash
# Run all performance checks
npm run build:web -- --configuration=production
npm run --workspace=apps/web analyze:bundle
```

## Continuous Integration

### Bundle Size Check Workflow

File: `.github/workflows/bundle-size.yml`

- Runs on: Pull requests, main branch pushes
- Generates: `performance-report.json`
- Comments on PR with size comparison
- Fails if error budgets exceeded

### Lighthouse CI Workflow

File: `.github/workflows/lighthouse-ci.yml`

- Runs on: Pull requests, main branch pushes, daily schedule
- Generates: Lighthouse reports, performance metrics
- Comments on PR with results
- Uploads artifacts for detailed analysis

### Performance Monitoring Workflow

File: `.github/workflows/performance-monitoring.yml`

- Runs on: Daily schedule, manual trigger
- Generates: Daily performance summaries
- Archives historical data (90 days)
- Fails if budgets exceeded

## Performance Reporting

### Accessing Performance Reports

1. **GitHub Actions Artifacts**
   - Go to workflow run
   - Download `performance-report-*` artifacts
   - Check `lighthouse-results-*` for detailed audits

2. **Local Reports**
   - `performance-report.json` - Bundle size analysis
   - `.lighthouseci/` - Lighthouse CI results

3. **Historical Data**
   - Artifact: `performance-history`
   - Retention: 90 days
   - Used for trend analysis

## Performance Budget Maintenance

### Quarterly Review

Review and adjust budgets based on:
- Actual performance metrics
- Feature additions
- Device capability changes
- Business requirements

### Increase Justification

When increasing a budget:
1. Document the reason (new feature, unavoidable dependency)
2. Propose optimization plan to reduce future impact
3. Get approval from performance team
4. Update this document with rationale

### Decrease Challenges

When budgets cannot be met:
1. Analyze bottlenecks with bundle analyzer
2. Identify optimization opportunities
3. Implement code splitting where possible
4. Consider dependency alternatives
5. Document trade-offs

## Tools & Resources

### Bundle Analysis Tools

- **Angular Build Analyzer**: `ng build --stats-json`
- **Webpack Bundle Analyzer**: `webpack-bundle-analyzer`
- **Source Map Explorer**: `source-map-explorer`

### Performance Testing

- **Lighthouse**: `lighthouse` (CLI)
- **WebPageTest**: https://www.webpagetest.org/
- **GT Metrix**: https://gtmetrix.com/
- **Chrome DevTools**: Built-in Lighthouse

### Documentation

- [Angular Performance Guide](https://angular.io/guide/performance-best-practices)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse Scoring](https://developers.google.com/web/tools/lighthouse/scoring)
- [Best Practices](https://web.dev/)

## Contact & Escalation

For performance-related issues:

1. Check this documentation first
2. Review recent performance reports
3. Compare against historical trends
4. File issue with: Timeline, metrics, reproduction steps
5. Escalate to Performance Team if critical

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2024-11-19 | Initial performance budgets setup | Performance Team |
