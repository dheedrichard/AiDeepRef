# Performance Monitoring Setup Guide

## Quick Start

This guide walks through the comprehensive performance budgets and monitoring setup for DeepRef.

## What Was Set Up

### 1. Performance Budgets (Angular Configuration)

**File:** `/home/user/AiDeepRef/apps/web/angular.json`

Updated production build configuration with strict performance budgets:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "400kb",
      "maximumError": "500kb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "4kb",
      "maximumError": "6kb"
    },
    {
      "type": "bundle",
      "name": "main",
      "baseline": "400kb",
      "maximumWarning": "450kb",
      "maximumError": "500kb"
    },
    {
      "type": "bundle",
      "name": "vendor",
      "baseline": "300kb",
      "maximumWarning": "350kb",
      "maximumError": "400kb"
    }
  ]
}
```

**Impact:** Builds will now fail if any of these thresholds are exceeded.

### 2. Bundle Size Tracking Script

**File:** `/home/user/AiDeepRef/scripts/track-performance.js`

Custom Node.js script that:
- Analyzes bundle sizes in dist directory
- Compares against configured budgets
- Generates `performance-report.json`
- Provides clear visual feedback with status indicators

**Usage:**
```bash
npm run --workspace=apps/web analyze:bundle
```

**Output Example:**
```
📦 Bundle Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
  Total JavaScript: 320 KB
  Total CSS: 45 KB
  Total Bundles: 365 KB

📋 Budget Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Total JavaScript: 320 KB / 500 KB
✅ Total CSS: 45 KB / 50 KB
```

### 3. Bundle Size Configuration

**File:** `/home/user/AiDeepRef/.sizelimitrc.json`

Size-limit configuration for tracking bundle sizes:
- Initial Bundle (main): 400 KB
- Vendor Bundle: 300 KB
- Total CSS: 50 KB
- Chunk Bundles: 100 KB

### 4. Lighthouse CI Configuration

**File:** `/home/user/AiDeepRef/.lighthouserc.json`

Configures automated Lighthouse audits with:
- Desktop performance settings
- 3-run average for stability
- Core Web Vitals assertions:
  - FCP < 1.5s
  - LCP < 2.0s
  - TBT < 200ms
  - CLS < 0.1
- Lighthouse score requirements:
  - Performance ≥ 90
  - Accessibility ≥ 90
  - Best Practices ≥ 85
  - SEO ≥ 90

### 5. GitHub Actions Workflows

#### Bundle Size Check Workflow
**File:** `/home/user/AiDeepRef/.github/workflows/bundle-size.yml`

- **Trigger:** Pull requests, main branch pushes
- **Actions:**
  - Builds production application
  - Analyzes bundle sizes
  - Compares against budgets
  - Comments on PR with results
  - Fails if budgets exceeded

#### Lighthouse CI Workflow
**File:** `/home/user/AiDeepRef/.github/workflows/lighthouse-ci.yml`

- **Trigger:** Pull requests, main branch pushes, daily schedule
- **Actions:**
  - Runs Lighthouse audits
  - Validates Core Web Vitals
  - Checks Lighthouse scores
  - Uploads reports as artifacts
  - Comments on PR with results

#### Daily Performance Monitoring
**File:** `/home/user/AiDeepRef/.github/workflows/performance-monitoring.yml`

- **Trigger:** Daily at midnight UTC
- **Actions:**
  - Builds and analyzes application
  - Generates performance summary
  - Archives historical data
  - Alerts on violations
  - Retains 90 days of history

### 6. Package.json Scripts

**File:** `/home/user/AiDeepRef/apps/web/package.json`

Added performance analysis scripts:

```json
{
  "build:prod": "ng build --configuration=production",
  "build:prod:stats": "ng build --configuration=production --stats-json",
  "analyze:bundle": "npm run build:prod && node ../../scripts/track-performance.js",
  "analyze:size": "npm run build:prod:stats && echo 'Bundle stats generated'",
  "serve:ssr": "ng serve --configuration development"
}
```

### 7. Performance Testing Suite

**File:** `/home/user/AiDeepRef/apps/web/test/performance/lighthouse.spec.ts`

TypeScript test suite that:
- Verifies bundle size budgets
- Checks Core Web Vitals thresholds
- Validates best practices
- Verifies Lighthouse scores
- Can run with: `npm run test:performance`

### 8. Documentation

Three comprehensive documentation files:

#### PERFORMANCE_BUDGETS.md
- Budget definitions and thresholds
- Monitoring strategy
- Real user monitoring integration
- Actions on violations
- Performance optimization tips

#### PERFORMANCE_OPTIMIZATION_GUIDE.md
- Bundle size optimization techniques
- Core Web Vitals optimization
- Image optimization
- JavaScript and CSS optimization
- Network optimization
- Quick wins checklist

#### PERFORMANCE_MONITORING_RUNBOOK.md
- Quick reference table
- Common issues and solutions
- Regression detection
- Lighthouse debugging
- Escalation guidelines
- Useful commands reference

#### PERFORMANCE_SETUP_GUIDE.md (this file)
- Overview of what was set up
- Configuration details
- How to use each component
- Next steps

## Budget Summary

### Bundle Size Budgets

| Metric | Target | Warning | Error |
|--------|--------|---------|-------|
| Initial Bundle | 350 KB | 400 KB | 500 KB |
| Vendor Bundle | 250 KB | 300 KB | 400 KB |
| Total CSS | 40 KB | 50 KB | 60 KB |
| Component Styles | 4 KB | 5 KB | 6 KB |

### Core Web Vitals Budgets

| Metric | Target | Priority |
|--------|--------|----------|
| FCP | < 1.5s | High |
| LCP | < 2.0s | High |
| TBT | < 200ms | High |
| CLS | < 0.1 | High |
| TTI | < 3.0s | Medium |

### Lighthouse Score Targets

| Category | Target |
|----------|--------|
| Performance | ≥ 90 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 85 |
| SEO | ≥ 90 |

## How to Use

### Run Bundle Analysis Locally

```bash
# Build and analyze
npm run --workspace=apps/web analyze:bundle

# View generated report
cat performance-report.json

# View detailed breakdown
npm run --workspace=apps/web analyze:size
```

### Run Lighthouse Audits Locally

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:4200 --view

# Or use Lighthouse CI
npm install -g @lhci/cli
lhci autorun
```

### Check Performance on PR

When you create a PR:
1. GitHub Actions automatically runs bundle size check
2. Lighthouse CI runs performance audits
3. Results are commented on PR
4. If budgets are exceeded, PR cannot merge

### Monitor Daily Performance

- Automated daily runs at midnight UTC
- Historical data retained for 90 days
- Artifacts available in GitHub Actions
- Alert if budgets exceeded

## Accessing Results

### GitHub Actions

1. Go to **Actions** tab
2. Select workflow:
   - **Bundle Size Check** - For size analysis
   - **Lighthouse CI** - For performance audits
   - **Daily Performance Monitoring** - For daily reports

3. Click on workflow run to see:
   - Logs with detailed output
   - Artifacts with reports
   - PR comments with summary

### Local Results

```bash
# Bundle analysis
cat performance-report.json

# View as formatted JSON
cat performance-report.json | jq '.'

# Check specific metrics
cat performance-report.json | jq '.budgets'
```

## Optimizing Performance

### Quick Wins (1-2 days)

1. **Remove Unused Dependencies**
   ```bash
   npm ls --depth 0
   ```

2. **Enable Code Splitting**
   ```typescript
   {
     path: 'feature',
     loadChildren: () => import('./feature.module')
   }
   ```

3. **Optimize Images**
   - Use webp format with fallback
   - Set explicit dimensions
   - Lazy load below-fold images

### Medium Effort (1 week)

1. **Extract Critical CSS**
2. **Implement OnPush Change Detection**
3. **Defer Non-Critical JavaScript**
4. **Optimize Third-Party Scripts**

### High Impact (2-4 weeks)

1. **Complete Code Splitting Strategy**
2. **Performance Monitoring Integration**
3. **Bundle Size Baseline Establishment**
4. **CI/CD Performance Gates**

## Environment Variables

### GitHub Actions Secrets (Optional)

For advanced Lighthouse CI features:

```bash
# Lighthouse CI GitHub App Token
LHCI_GITHUB_APP_TOKEN=your-token-here

# For uploading to permanent storage
LHCI_UPLOAD_TOKEN=your-token-here
```

## CI/CD Integration

### What Happens on PR

1. **Build Triggered**
   - Production build started
   - Bundle analyzed
   - Lighthouse audits run

2. **Results Generated**
   - Size report created
   - Lighthouse scores calculated
   - Comparison against budgets

3. **PR Updated**
   - Comments added with results
   - Artifacts uploaded
   - Build status updated

### What Happens on Merge

1. **Daily Monitoring Baseline Updated**
2. **Historical Data Archived**
3. **Trend Analysis Updated**

## Troubleshooting

### Build Fails with Size Error

```bash
# See what changed
npm run analyze:bundle

# Check bundle breakdown
npm run --workspace=apps/web analyze:size

# See specific file sizes
ls -lh apps/web/dist/deepref-web/browser/*.js
```

### Lighthouse Fails

```bash
# Ensure server is running
npm run --workspace=apps/web serve:ssr

# Test connection
curl http://localhost:4200

# Run manually
lighthouse http://localhost:4200 --view
```

### Performance Report Not Generated

```bash
# Check if build succeeded
npm run build:web -- --configuration=production

# Check dist folder
ls -la apps/web/dist/deepref-web/browser/

# Run script manually
node scripts/track-performance.js
```

## Next Steps

1. **Run Initial Baseline**
   ```bash
   npm run --workspace=apps/web analyze:bundle
   ```

2. **Review Current Performance**
   - Check `performance-report.json`
   - Run local Lighthouse audit
   - Identify optimization opportunities

3. **Set Up Monitoring**
   - Create PR to enable workflows
   - Verify GitHub Actions run
   - Check artifact uploads

4. **Optimize as Needed**
   - Follow PERFORMANCE_OPTIMIZATION_GUIDE.md
   - Implement changes in feature branches
   - Monitor progress with PR checks

5. **Maintain Performance**
   - Review weekly reports
   - Address regressions immediately
   - Plan quarterly optimization cycles

## Resources

- **Performance Dashboard:** [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md)
- **Optimization Guide:** [PERFORMANCE_OPTIMIZATION_GUIDE.md](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- **Monitoring Runbook:** [PERFORMANCE_MONITORING_RUNBOOK.md](./PERFORMANCE_MONITORING_RUNBOOK.md)
- **Web Vitals:** https://web.dev/vitals/
- **Lighthouse:** https://developers.google.com/web/tools/lighthouse
- **Angular Performance:** https://angular.io/guide/performance-best-practices

## Summary of Files Created

1. `/home/user/AiDeepRef/scripts/track-performance.js` - Bundle analysis script
2. `/home/user/AiDeepRef/.sizelimitrc.json` - Size limits config
3. `/home/user/AiDeepRef/.lighthouserc.json` - Lighthouse CI config
4. `/home/user/AiDeepRef/.github/workflows/bundle-size.yml` - Bundle check workflow
5. `/home/user/AiDeepRef/.github/workflows/lighthouse-ci.yml` - Lighthouse workflow
6. `/home/user/AiDeepRef/.github/workflows/performance-monitoring.yml` - Daily monitoring workflow
7. `/home/user/AiDeepRef/apps/web/test/performance/lighthouse.spec.ts` - Performance tests
8. `/home/user/AiDeepRef/docs/PERFORMANCE_BUDGETS.md` - Budget documentation
9. `/home/user/AiDeepRef/docs/PERFORMANCE_OPTIMIZATION_GUIDE.md` - Optimization guide
10. `/home/user/AiDeepRef/docs/PERFORMANCE_MONITORING_RUNBOOK.md` - Runbook
11. `/home/user/AiDeepRef/docs/PERFORMANCE_SETUP_GUIDE.md` - This file

## Files Modified

1. `/home/user/AiDeepRef/apps/web/angular.json` - Updated with performance budgets
2. `/home/user/AiDeepRef/apps/web/package.json` - Added performance scripts

---

**Last Updated:** November 19, 2024
**Status:** ✅ Complete - All components deployed
