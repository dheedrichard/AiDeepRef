# Cache Performance Testing

This directory contains load tests for evaluating Redis caching performance.

## Prerequisites

1. Install k6: https://k6.io/docs/getting-started/installation/
2. Start the API server with Redis enabled
3. Ensure test data is seeded

## Running Tests

### Basic Load Test
Tests overall caching performance with realistic workloads.

```bash
# Run with default settings (100 VUs for 30s)
k6 run cache-load-test.js

# Run with custom load
k6 run --vus 200 --duration 1m cache-load-test.js

# Run with custom API URL
k6 run --env API_URL=http://api.example.com cache-load-test.js
```

### Rate Limiting Test
Tests distributed rate limiting accuracy and performance.

```bash
# Run rate limit test
k6 run rate-limit-test.js

# Run with high concurrency
k6 run --vus 100 --duration 30s rate-limit-test.js
```

## Test Scenarios

### 1. Cache Load Test (`cache-load-test.js`)

**Purpose**: Measure caching effectiveness and performance improvements

**Scenarios**:
- User profile caching (hot data)
- Bundle caching (warm data)
- AI prompt caching (very long TTL)
- Mixed workload

**Success Criteria**:
- p95 response time < 500ms
- Error rate < 1%
- Cache hit rate > 70%

### 2. Rate Limit Test (`rate-limit-test.js`)

**Purpose**: Validate distributed rate limiting using Redis

**Scenarios**:
- Concurrent requests from multiple VUs
- Rate limit enforcement accuracy
- Rate limit header validation

**Success Criteria**:
- p95 response time < 100ms
- Rate limit hit rate < 30% (normal load)
- Consistent rate limiting across all instances

## Performance Targets

### With Caching Enabled

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 500ms | TBD |
| Cache Hit Rate | > 70% | TBD |
| Database Query Reduction | 60% | TBD |
| Redis Latency (p95) | < 5ms | TBD |

### Comparing With/Without Cache

To compare performance:

1. Run test with caching enabled:
```bash
k6 run --env CACHE_ENABLED=true cache-load-test.js > results-with-cache.txt
```

2. Run test with caching disabled:
```bash
k6 run --env CACHE_ENABLED=false cache-load-test.js > results-without-cache.txt
```

3. Compare results:
```bash
diff results-with-cache.txt results-without-cache.txt
```

## Interpreting Results

### Cache Hit Rate
- **> 80%**: Excellent - Most requests served from cache
- **60-80%**: Good - Caching is effective
- **< 60%**: Poor - Review caching strategy

### Response Time Improvement
Expected improvements with caching:
- User profiles: 40-60% faster
- Bundles: 30-50% faster
- AI prompts: 60-80% faster

### Rate Limiting
- Should handle 100+ req/s per endpoint
- Rate limit enforcement should be consistent
- No performance degradation under rate limiting

## Monitoring During Tests

While tests are running, monitor:

1. **Redis metrics**:
```bash
redis-cli --stat
```

2. **API logs**:
```bash
docker-compose logs -f api
```

3. **Cache metrics endpoint**:
```bash
curl http://localhost:3000/api/cache/metrics
```

## Troubleshooting

### High Error Rate
- Check Redis connection
- Verify database capacity
- Review API logs for errors

### Low Cache Hit Rate
- Verify cache warming is running
- Check TTL configuration
- Review key generation logic

### Slow Response Times
- Check Redis memory usage
- Monitor database query performance
- Review slow operation logs

## Example Results

```
=== Load Test Summary ===
Total Requests: 12,450
Failed Requests: 0.12%
Avg Response Time: 142.33ms
p95 Response Time: 287.54ms
Cache Hit Rate: 76.23%
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
performance-test:
  stage: test
  script:
    - docker-compose up -d
    - sleep 10 # Wait for services
    - k6 run --quiet cache-load-test.js
    - k6 run --quiet rate-limit-test.js
  artifacts:
    reports:
      performance: summary.json
```
