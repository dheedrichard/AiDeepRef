#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../apps/web/dist/deepref-web/browser');

function formatBytes(bytes) {
  return Math.round(bytes / 1024);
}

function analyzeBundle() {
  if (!fs.existsSync(distPath)) {
    console.error(`Error: Distribution path not found: ${distPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(distPath);

  const bundles = files
    .filter(f => f.endsWith('.js') && !f.startsWith('.'))
    .map(f => {
      const fullPath = path.join(distPath, f);
      const stats = fs.statSync(fullPath);
      return {
        name: f,
        size: stats.size,
        sizeKB: formatBytes(stats.size)
      };
    })
    .sort((a, b) => b.size - a.size);

  const totalJS = bundles.reduce((sum, b) => sum + b.size, 0);

  const cssFiles = files
    .filter(f => f.endsWith('.css') && !f.startsWith('.'))
    .map(f => {
      const fullPath = path.join(distPath, f);
      const stats = fs.statSync(fullPath);
      return {
        name: f,
        size: stats.size,
        sizeKB: formatBytes(stats.size)
      };
    })
    .sort((a, b) => b.size - a.size);

  const totalCSS = cssFiles.reduce((sum, c) => sum + c.size, 0);

  console.log('\n📦 Bundle Analysis Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n📊 Summary:');
  console.log(`  Total JavaScript: ${formatBytes(totalJS)} KB`);
  console.log(`  Total CSS: ${formatBytes(totalCSS)} KB`);
  console.log(`  Total Bundles: ${formatBytes(totalJS + totalCSS)} KB`);

  console.log('\n📄 JavaScript Bundles:');
  if (bundles.length === 0) {
    console.log('  (no JS files found)');
  } else {
    bundles.forEach(b => {
      const percentage = ((b.size / totalJS) * 100).toFixed(1);
      console.log(`  ${b.name}: ${b.sizeKB} KB (${percentage}%)`);
    });
  }

  console.log('\n🎨 CSS Files:');
  if (cssFiles.length === 0) {
    console.log('  (no CSS files found)');
  } else {
    cssFiles.forEach(c => {
      const percentage = ((c.size / totalCSS) * 100).toFixed(1);
      console.log(`  ${c.name}: ${c.sizeKB} KB (${percentage}%)`);
    });
  }

  // Performance budgets
  const budgets = {
    initial: 500,
    vendor: 400,
    main: 500,
    totalCSS: 50
  };

  console.log('\n📋 Budget Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let budgetsPassed = true;

  // Check JS budgets
  const jsKB = formatBytes(totalJS);
  const jsStatus = jsKB <= budgets.initial ? '✅' : '❌';
  console.log(`${jsStatus} Total JavaScript: ${jsKB} KB / ${budgets.initial} KB`);
  if (jsKB > budgets.initial) budgetsPassed = false;

  // Check CSS budgets
  const cssKB = formatBytes(totalCSS);
  const cssStatus = cssKB <= budgets.totalCSS ? '✅' : '❌';
  console.log(`${cssStatus} Total CSS: ${cssKB} KB / ${budgets.totalCSS} KB`);
  if (cssKB > budgets.totalCSS) budgetsPassed = false;

  // Check individual bundles
  bundles.forEach(b => {
    let budgetLimit = budgets.initial;
    if (b.name.includes('vendor')) {
      budgetLimit = budgets.vendor;
    } else if (b.name.includes('main')) {
      budgetLimit = budgets.main;
    }

    const status = b.sizeKB <= budgetLimit ? '✅' : '❌';
    console.log(`${status} ${b.name}: ${b.sizeKB} KB / ${budgetLimit} KB`);
    if (b.sizeKB > budgetLimit) budgetsPassed = false;
  });

  // Save to JSON for tracking
  const report = {
    timestamp: new Date().toISOString(),
    bundles: {
      js: bundles,
      css: cssFiles,
      totalJS: formatBytes(totalJS),
      totalCSS: formatBytes(totalCSS),
      total: formatBytes(totalJS + totalCSS)
    },
    budgets: {
      js: {
        limit: budgets.initial,
        current: formatBytes(totalJS),
        pass: formatBytes(totalJS) <= budgets.initial
      },
      css: {
        limit: budgets.totalCSS,
        current: formatBytes(totalCSS),
        pass: formatBytes(totalCSS) <= budgets.totalCSS
      }
    },
    allPassed: budgetsPassed
  };

  const reportPath = path.join(__dirname, '../performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n✅ Performance report saved to performance-report.json');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Exit with error code if budgets were exceeded
  if (!budgetsPassed) {
    console.error('⚠️  Performance budgets exceeded!');
    process.exit(1);
  }
}

analyzeBundle();
