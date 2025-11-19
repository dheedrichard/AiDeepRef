# Redis Caching Strategy for DeepRef

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Caching Strategies](#caching-strategies)
4. [Feature-Specific Caching](#feature-specific-caching)
5. [Key Naming Conventions](#key-naming-conventions)
6. [TTL Configuration](#ttl-configuration)
7. [Cache Invalidation](#cache-invalidation)
8. [Performance Monitoring](#performance-monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

## Overview

The DeepRef platform uses Redis 7.4 as a distributed caching layer to improve performance and scalability. This document outlines the caching strategy, implementation details, and best practices.

### Goals
- **Reduce database queries by 60%** for frequently accessed data
- **Reduce API response time by 40%** for cacheable endpoints
- **Improve scalability** by reducing database load
- **Provide consistent performance** during traffic spikes

### Key Features
- **Multi-layer caching**: In-memory + Redis
- **Circuit breaker pattern**: Graceful degradation on Redis failures
- **Cache warming**: Proactive loading of hot data
- **Distributed rate limiting**: Redis-backed request throttling
- **Comprehensive metrics**: Real-time cache performance monitoring

## Architecture

### Components

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│      NestJS API Server          │
│  ┌───────────────────────────┐  │
│  │   Cache Decorators        │  │
│  │   (@Cacheable, etc.)      │  │
│  └─────────────┬─────────────┘  │
│                │                 │
│  ┌─────────────▼─────────────┐  │
│  │     CacheService          │  │
│  │  - Get/Set/Delete         │  │
│  │  - Circuit Breaker        │  │
│  └─────────────┬─────────────┘  │
└────────────────┼─────────────────┘
                 │
                 ▼
┌────────────────────────────────┐
│       Redis 7.4 Cluster        │
│  - Persistence (RDB + AOF)     │
│  - Eviction Policy: allkeys-lru│
│  - Max Memory: 256MB           │
└────────────────────────────────┘
```

### Redis Configuration

**File**: `/infrastructure/docker/redis.conf`

Key settings:
- **Persistence**: RDB snapshots + AOF for durability
- **Eviction**: `allkeys-lru` (least recently used)
- **Max Memory**: 256MB (configurable)
- **Security**: Password authentication, disabled dangerous commands
- **Performance**: Multi-threading, lazy freeing, pipelining

## Caching Strategies

### 1. Cache-Aside (Lazy Loading)

Most common pattern. Data is loaded on-demand.

**Flow**:
1. Check cache
2. If miss, fetch from database
3. Store in cache
4. Return data

**Implementation**:
```typescript
@Cacheable({ key: 'user:profile', ttl: 600 })
async getUserProfile(userId: string): Promise<UserProfile> {
  return await this.userRepository.findOne({ where: { id: userId } });
}
```

**Best for**: Read-heavy data that doesn't change frequently

### 2. Write-Through

Data is written to cache and database simultaneously.

**Flow**:
1. Write to database
2. Invalidate or update cache
3. Return success

**Implementation**:
```typescript
@CacheInvalidate({ keys: ['user:profile:{0}'] })
async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
  return await this.userRepository.update(userId, data);
}
```

**Best for**: Data that must be consistent

### 3. Cache Warming

Proactively load frequently accessed data into cache.

**Implementation**:
- Automatic on startup
- Scheduled every 15 minutes
- Manual trigger via API

**Best for**: Predictable hot data (popular bundles, active users)

### 4. Read-Through

Cache automatically loads data on miss.

**Implementation**:
```typescript
const user = await this.cacheService.getOrSet(
  'user:profile:123',
  () => this.userRepository.findOne({ where: { id: '123' } }),
  600
);
```

**Best for**: Simple single-item lookups

## Feature-Specific Caching

### User Profiles

**Strategy**: Cache-aside
**TTL**: 10 minutes (600s)
**Key**: `user:profile:{userId}`

```typescript
@Cacheable({ key: CacheKeys.USER_PROFILE, ttl: CacheTTL.MEDIUM })
async getUserProfile(userId: string): Promise<UserProfile> {
  // Database query
}
```

**Invalidation**: On profile update, role change

### Authentication

#### JWT Blacklist (Revoked Tokens)

**Strategy**: Write-through
**TTL**: Matches JWT expiration
**Key**: `auth:blacklist:{jti}`

```typescript
async revokeToken(jti: string, expiresIn: number): Promise<void> {
  await this.cacheService.set(`auth:blacklist:${jti}`, true, expiresIn);
}
```

#### User Sessions

**Strategy**: Write-through
**TTL**: 1 hour (3600s)
**Key**: `auth:session:{sessionId}`

**Storage**: Redis with `connect-redis`

#### Permission Checks

**Strategy**: Cache-aside
**TTL**: 5 minutes (300s)
**Key**: `user:permissions:{userId}:{resource}:{action}`

**Invalidation**: On role change, permission update

### AI Prompts

**Strategy**: Cache-aside + warming
**TTL**: 1 hour (3600s)
**Key**: `ai:prompt:{promptId}`

**Rationale**: AI prompts rarely change, accessed frequently

```typescript
@Cacheable({ key: CacheKeys.AI_PROMPT, ttl: CacheTTL.VERY_LONG })
async getAIPrompt(promptId: string): Promise<AIPrompt> {
  // Fetch decrypted prompt
}
```

**Invalidation**: On prompt update

### Reference Bundles

**Strategy**: Cache-aside + warming
**TTL**: 15 minutes (900s)
**Key**: `bundle:{bundleId}`

**Additional caching**:
- `bundle:rcs:{bundleId}` - Aggregated RCS scores

```typescript
@Cacheable({ key: CacheKeys.BUNDLE, ttl: CacheTTL.LONG })
async getBundle(bundleId: string): Promise<Bundle> {
  // Database query with relations
}
```

**Invalidation**: On bundle update, new reference added

### Rate Limiting

**Strategy**: Counter with TTL (sliding window)
**TTL**: Rate limit window (60s, 900s, etc.)
**Key**: `ratelimit:{scope}:{identifier}`

**Scopes**:
- Per user: `ratelimit:user:{userId}`
- Per IP: `ratelimit:ip:{ipAddress}`
- Global: `ratelimit:global:all`

```typescript
@RateLimit({ limit: 100, window: 60, scope: 'user' })
async getSomething(): Promise<any> {
  // Endpoint logic
}
```

## Key Naming Conventions

**Format**: `{service}:{entity}:{id}:{optional-qualifier}`

### Examples

| Pattern | Example | Description |
|---------|---------|-------------|
| `user:profile:{id}` | `user:profile:123` | User profile data |
| `user:permissions:{id}` | `user:permissions:123` | User permission list |
| `auth:session:{id}` | `auth:session:abc123` | User session data |
| `auth:blacklist:{jti}` | `auth:blacklist:xyz789` | Revoked JWT token |
| `bundle:{id}` | `bundle:bundle-456` | Bundle data |
| `bundle:rcs:{id}` | `bundle:rcs:bundle-456` | Bundle RCS scores |
| `ai:prompt:{id}` | `ai:prompt:prompt-1` | AI prompt template |
| `ratelimit:{scope}:{id}` | `ratelimit:user:123` | Rate limit counter |

### Patterns for Invalidation

Use wildcards for pattern-based invalidation:

```typescript
// Invalidate all user-related cache
await cacheService.deletePattern('user:*:123');

// Invalidate all bundle cache
await cacheService.deletePattern('bundle:*');

// Invalidate all permissions
await cacheService.deletePattern('user:permissions:*');
```

## TTL Configuration

### Standard TTLs

```typescript
export const CacheTTL = {
  VERY_SHORT: 60,      // 1 minute - volatile data
  SHORT: 300,          // 5 minutes - frequently changing
  MEDIUM: 600,         // 10 minutes - standard caching
  LONG: 900,           // 15 minutes - relatively static
  VERY_LONG: 3600,     // 1 hour - rarely changing
  DAY: 86400,          // 24 hours - static reference data
} as const;
```

### TTL Selection Guidelines

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| User profiles | 10 min | Balance freshness and performance |
| User permissions | 5 min | Security-sensitive, needs freshness |
| Auth sessions | 1 hour | Matches session lifetime |
| AI prompts | 1 hour | Rarely change |
| Bundles | 15 min | Frequently accessed, moderate changes |
| Static config | 24 hours | Never changes during runtime |
| Rate limit counters | Window size | Matches rate limit window |

### Dynamic TTL

Adjust TTL based on data characteristics:

```typescript
const ttl = isPopularBundle(bundleId)
  ? CacheTTL.LONG
  : CacheTTL.MEDIUM;

await cacheService.set(`bundle:${bundleId}`, bundle, ttl);
```

## Cache Invalidation

### Strategies

#### 1. Time-Based (TTL)
Automatic expiration after TTL.

**Pros**: Simple, no manual management
**Cons**: May serve stale data until expiration

#### 2. Event-Based
Invalidate on specific events (create, update, delete).

**Implementation**:
```typescript
@CacheInvalidate({ keys: ['user:profile:{0}'] })
async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
  // Update logic
}
```

#### 3. Pattern-Based
Invalidate multiple related keys.

**Implementation**:
```typescript
// Invalidate all user cache
await cacheService.deletePattern('user:*:123');
```

#### 4. Version-Based
Include version in key, invalidate by changing version.

**Implementation**:
```typescript
const version = await this.getSchemaVersion();
const key = `bundle:${version}:${bundleId}`;
```

### Invalidation Best Practices

1. **Be precise**: Invalidate only affected keys
2. **Use patterns**: For related data
3. **Consider dependencies**: Invalidate dependent caches
4. **Avoid over-invalidation**: Reduces cache effectiveness
5. **Log invalidations**: For debugging

### Common Invalidation Patterns

```typescript
// Single key
await cacheService.delete('user:profile:123');

// User-related data
await cacheService.deletePattern('user:*:123');

// All bundles
await cacheService.deletePattern('bundle:*');

// Specific bundle and related
await cacheService.deletePattern('bundle:*:bundle-456');
```

## Performance Monitoring

### Built-in Metrics

Access via `/api/cache/metrics`:

```json
{
  "metrics": {
    "hits": 1523,
    "misses": 477,
    "sets": 512,
    "deletes": 45,
    "errors": 2,
    "hitRate": 0.7615,
    "avgLatency": 3.42
  },
  "summary": "Cache Metrics - Hit Rate: 76.15%, Avg Latency: 3.42ms, ..."
}
```

### Health Check

Access via `/api/cache/health`:

```json
{
  "connected": true,
  "latency": 2.5,
  "status": "healthy",
  "memoryUsage": "45.23%",
  "memoryUsed": "115.84 MB",
  "memoryMax": "256 MB",
  "keyCount": 1234
}
```

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Hit Rate | > 70% | < 50% |
| Avg Latency | < 5ms | > 50ms |
| p95 Latency | < 10ms | > 100ms |
| Memory Usage | < 80% | > 90% |
| Error Rate | < 0.1% | > 1% |
| Connection Status | Connected | Disconnected |

### Prometheus Integration

Expose metrics for Prometheus:

```typescript
// Add to cache metrics service
async getPrometheusMetrics(): Promise<string> {
  const metrics = this.getMetrics();
  return `
# HELP cache_hits_total Total cache hits
# TYPE cache_hits_total counter
cache_hits_total ${metrics.hits}

# HELP cache_misses_total Total cache misses
# TYPE cache_misses_total counter
cache_misses_total ${metrics.misses}

# HELP cache_hit_rate Cache hit rate
# TYPE cache_hit_rate gauge
cache_hit_rate ${metrics.hitRate}

# HELP cache_latency_ms Average cache latency in milliseconds
# TYPE cache_latency_ms gauge
cache_latency_ms ${metrics.avgLatency}
  `;
}
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: cache
    rules:
      - alert: LowCacheHitRate
        expr: cache_hit_rate < 0.5
        for: 5m
        annotations:
          summary: "Cache hit rate is below 50%"

      - alert: HighCacheLatency
        expr: cache_latency_ms > 50
        for: 5m
        annotations:
          summary: "Cache latency is above 50ms"

      - alert: HighMemoryUsage
        expr: redis_memory_usage_percentage > 90
        for: 5m
        annotations:
          summary: "Redis memory usage is above 90%"
```

## Troubleshooting

### Low Cache Hit Rate

**Symptoms**: Hit rate < 50%

**Possible causes**:
1. TTL too short
2. Cache not warmed
3. Keys not generated consistently
4. High cache churn

**Solutions**:
```bash
# Check cache metrics
curl http://localhost:3000/api/cache/metrics

# Review recent operations
curl http://localhost:3000/api/cache/operations

# Trigger cache warming
curl -X POST http://localhost:3000/api/cache/warming/trigger

# Check TTL configuration
grep TTL apps/api/src/cache/cache.config.ts
```

### High Latency

**Symptoms**: Avg latency > 50ms, slow operations

**Possible causes**:
1. Redis memory full (evictions)
2. Network issues
3. Large objects cached
4. Redis under heavy load

**Solutions**:
```bash
# Check Redis stats
redis-cli --stat

# Check slow operations
curl http://localhost:3000/api/cache/operations/slow

# Check memory usage
redis-cli INFO memory

# Monitor in real-time
redis-cli MONITOR
```

### Circuit Breaker Open

**Symptoms**: Cache disabled, all requests go to database

**Possible causes**:
1. Redis connection failed
2. Multiple consecutive errors
3. Network issues

**Solutions**:
```bash
# Check Redis connection
redis-cli PING

# Check API logs
docker-compose logs api | grep "circuit breaker"

# Restart Redis
docker-compose restart redis

# Manual reset (circuit breaker auto-resets after 1 min)
```

### Memory Evictions

**Symptoms**: Keys disappearing, cache misses increasing

**Possible causes**:
1. Max memory reached
2. Eviction policy too aggressive
3. Too many keys cached

**Solutions**:
```bash
# Check evictions
redis-cli INFO stats | grep evicted

# Increase max memory in .env
REDIS_MAX_MEMORY=512mb

# Review and optimize TTLs
# Remove unused keys
redis-cli --scan --pattern "unused:*" | xargs redis-cli DEL
```

### Key Naming Issues

**Symptoms**: Invalidation not working, duplicate keys

**Solutions**:
```bash
# List keys by pattern
redis-cli KEYS "user:*"

# Check key generation logic
grep -r "CacheKeys" apps/api/src/

# Validate key format
redis-cli --scan --pattern "*" | head -20
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Redis password set and rotated
- [ ] TLS/SSL configured (if required)
- [ ] Backup strategy defined (RDB + AOF)
- [ ] Monitoring and alerting configured
- [ ] Load testing completed
- [ ] Circuit breaker thresholds tuned
- [ ] Cache warming configured
- [ ] Key expiration policies reviewed
- [ ] Memory limits set appropriately
- [ ] Network security configured

### Redis Cluster Setup (HA)

For production, consider Redis Sentinel or Cluster:

```yaml
# docker-compose.prod.yml (simplified)
services:
  redis-master:
    image: redis:7.4-alpine
    command: redis-server /usr/local/etc/redis/redis.conf

  redis-replica-1:
    image: redis:7.4-alpine
    command: redis-server /usr/local/etc/redis/redis.conf --replicaof redis-master 6379

  redis-sentinel-1:
    image: redis:7.4-alpine
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
```

### Monitoring Stack

Recommended monitoring setup:

1. **Prometheus** - Metrics collection
2. **Grafana** - Visualization
3. **Redis Exporter** - Redis metrics
4. **Alertmanager** - Alerting

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
# backup-redis.sh

BACKUP_DIR="/backups/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Trigger RDB snapshot
redis-cli BGSAVE

# Wait for snapshot to complete
while [ $(redis-cli LASTSAVE) -eq $LAST_SAVE ]; do
  sleep 1
done

# Copy snapshot
cp /data/dump.rdb "$BACKUP_DIR/dump_$TIMESTAMP.rdb"

# Keep only last 7 days
find $BACKUP_DIR -name "dump_*.rdb" -mtime +7 -delete
```

### Capacity Planning

**Current Configuration**: 256MB Redis

**Scaling Guidelines**:

| Key Count | Memory | Recommendation |
|-----------|--------|----------------|
| < 100K | 256MB | Current config OK |
| 100K - 500K | 512MB - 1GB | Increase memory |
| 500K - 1M | 1GB - 2GB | Consider sharding |
| > 1M | 2GB+ | Redis Cluster |

**Formula**: `Average key size × Expected key count × 1.2 (overhead)`

### Performance Tuning

**Redis Configuration**:
```conf
# redis.conf for production
maxmemory 1gb
maxmemory-policy allkeys-lru
io-threads 4
io-threads-do-reads yes
lazyfree-lazy-eviction yes
```

**Application Configuration**:
```env
REDIS_TTL_DEFAULT=300
CACHE_USER_PROFILES_TTL=600
CACHE_AI_PROMPTS_TTL=3600
CACHE_BUNDLES_TTL=900
```

### Security Best Practices

1. **Authentication**: Always require password
2. **Network**: Use private network or VPN
3. **Encryption**: Enable TLS for data in transit
4. **Commands**: Disable dangerous commands (FLUSHALL, etc.)
5. **Firewall**: Restrict access to Redis port
6. **Updates**: Keep Redis updated
7. **Monitoring**: Log all access attempts

### Disaster Recovery

**RTO (Recovery Time Objective)**: < 5 minutes
**RPO (Recovery Point Objective)**: < 5 minutes (AOF)

**Recovery Procedure**:
1. Stop Redis
2. Restore latest RDB snapshot
3. Replay AOF if available
4. Start Redis
5. Verify data integrity
6. Resume traffic

---

## Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [Cache-Manager Documentation](https://github.com/node-cache-manager/node-cache-manager)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)

## Support

For questions or issues:
- Check logs: `docker-compose logs redis api`
- View metrics: http://localhost:3000/api/cache/metrics
- Redis Commander: http://localhost:8081
- Team Slack: #backend-support
