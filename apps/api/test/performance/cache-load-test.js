/**
 * K6 Load Test for Cache Performance
 *
 * Tests cache performance under various load conditions.
 * Compares performance with and without caching enabled.
 *
 * Usage:
 * k6 run --vus 100 --duration 30s cache-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const cacheHitRate = new Rate('cache_hit_rate');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 200 },  // Ramp up to 200 users
    { duration: '1m', target: 200 },   // Stay at 200 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
    cache_hit_rate: ['rate>0.7'],     // Cache hit rate should be above 70%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || '';

// Test data: simulate realistic user behavior
const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
const bundleIds = Array.from({ length: 50 }, (_, i) => `bundle-${i}`);

export default function () {
  // Test 1: User Profile Caching (hot data)
  testUserProfileCache();
  sleep(1);

  // Test 2: Bundle Caching
  testBundleCache();
  sleep(1);

  // Test 3: AI Prompt Caching
  testAIPromptCache();
  sleep(1);

  // Test 4: Mixed workload
  testMixedWorkload();
  sleep(2);
}

/**
 * Test user profile caching
 * Should have high cache hit rate for popular users
 */
function testUserProfileCache() {
  // Access popular users (should be cached)
  const popularUserId = userIds[Math.floor(Math.random() * 10)]; // Top 10 users

  const response = http.get(`${BASE_URL}/api/users/${popularUserId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  const success = check(response, {
    'user profile status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Check for cache hit header (if your API provides it)
  const cacheHit = response.headers['X-Cache-Hit'] === 'true';
  cacheHitRate.add(cacheHit);
  apiResponseTime.add(response.timings.duration);

  if (!success) {
    console.error(`User profile fetch failed: ${response.status}`);
  }
}

/**
 * Test bundle caching
 * Bundles should be cached for 15 minutes
 */
function testBundleCache() {
  const bundleId = bundleIds[Math.floor(Math.random() * 20)]; // Top 20 bundles

  const response = http.get(`${BASE_URL}/api/bundles/${bundleId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  check(response, {
    'bundle status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  const cacheHit = response.headers['X-Cache-Hit'] === 'true';
  cacheHitRate.add(cacheHit);
  apiResponseTime.add(response.timings.duration);
}

/**
 * Test AI prompt caching
 * AI prompts should be cached for 1 hour
 */
function testAIPromptCache() {
  const response = http.get(`${BASE_URL}/api/ai/prompts`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  check(response, {
    'ai prompts status is 200': (r) => r.status === 200,
    'response time < 150ms': (r) => r.timings.duration < 150,
  });

  const cacheHit = response.headers['X-Cache-Hit'] === 'true';
  cacheHitRate.add(cacheHit);
  apiResponseTime.add(response.timings.duration);
}

/**
 * Test mixed workload
 * Simulates realistic user behavior with various endpoints
 */
function testMixedWorkload() {
  const endpoints = [
    `/api/users/${userIds[Math.floor(Math.random() * 30)]}`,
    `/api/bundles/${bundleIds[Math.floor(Math.random() * 30)]}`,
    `/api/ai/prompts`,
    `/api/health`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const response = http.get(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  check(response, {
    'mixed workload status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  const cacheHit = response.headers['X-Cache-Hit'] === 'true';
  cacheHitRate.add(cacheHit);
  apiResponseTime.add(response.timings.duration);
}

/**
 * Test summary function
 * Runs at the end of the test
 */
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;

  const results = {
    'Total Requests': data.metrics.http_reqs.values.count,
    'Failed Requests': data.metrics.http_req_failed.values.rate.toFixed(2) + '%',
    'Avg Response Time': data.metrics.http_req_duration.values.avg.toFixed(2) + 'ms',
    'p95 Response Time': data.metrics.http_req_duration.values['p(95)'].toFixed(2) + 'ms',
    'Cache Hit Rate': data.metrics.cache_hit_rate.values.rate.toFixed(2) + '%',
  };

  let summary = '\n' + indent + '=== Load Test Summary ===\n';
  for (const [key, value] of Object.entries(results)) {
    summary += indent + `${key}: ${value}\n`;
  }

  return summary;
}
