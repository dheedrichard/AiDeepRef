/**
 * K6 Load Test for Redis Rate Limiting
 *
 * Tests distributed rate limiting performance and accuracy.
 *
 * Usage:
 * k6 run --vus 50 --duration 30s rate-limit-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const rateLimitHitRate = new Rate('rate_limit_hit_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp up
    { duration: '20s', target: 50 },  // Steady state
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],
    rate_limit_hit_rate: ['rate<0.3'], // Less than 30% should hit rate limit
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Test rate-limited endpoint
  const response = http.get(`${BASE_URL}/api/bundles/popular`, {
    headers: {
      'X-User-ID': `user-${__VU}`, // Virtual User ID
    },
  });

  const rateLimited = response.status === 429;
  rateLimitHitRate.add(rateLimited);

  check(response, {
    'not rate limited': (r) => r.status !== 429,
    'rate limit header present': (r) => r.headers['X-RateLimit-Limit'] !== undefined,
    'rate limit remaining header present': (r) => r.headers['X-RateLimit-Remaining'] !== undefined,
  });

  if (rateLimited) {
    const retryAfter = response.headers['Retry-After'];
    console.log(`Rate limited. Retry after: ${retryAfter}s`);
  }

  sleep(0.1); // 10 requests per second per VU
}

export function handleSummary(data) {
  const rateLimitRate = data.metrics.rate_limit_hit_rate.values.rate;
  const avgDuration = data.metrics.http_req_duration.values.avg;

  console.log('\n=== Rate Limit Test Summary ===');
  console.log(`Rate Limit Hit Rate: ${(rateLimitRate * 100).toFixed(2)}%`);
  console.log(`Average Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);

  return {
    'rate-limit-summary.json': JSON.stringify(data, null, 2),
  };
}
