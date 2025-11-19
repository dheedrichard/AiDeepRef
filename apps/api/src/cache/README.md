# DeepRef Redis Caching Module

Production-ready Redis caching implementation for the DeepRef API with comprehensive features including cache-aside pattern, write-through invalidation, distributed rate limiting, and automatic cache warming.

## Features

- ✅ **Flexible Caching Strategies**: Cache-aside, write-through, read-through
- ✅ **Easy Integration**: Simple decorators (@Cacheable, @CacheInvalidate)
- ✅ **Circuit Breaker**: Graceful degradation on Redis failures
- ✅ **Cache Warming**: Automatic and scheduled warming of hot data
- ✅ **Distributed Rate Limiting**: Redis-backed request throttling
- ✅ **Real-time Metrics**: Hit rate, latency, memory usage monitoring
- ✅ **Health Checks**: Connection, latency, and memory monitoring
- ✅ **Pattern-based Invalidation**: Wildcard key deletion support
- ✅ **Comprehensive Testing**: Unit, integration, and load tests

## Quick Start

### 1. Install Dependencies

```bash
cd apps/api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
CACHE_ENABLED=true
```

### 3. Start Redis

```bash
docker-compose up -d redis redis-commander
```

### 4. Import CacheModule

```typescript
// app.module.ts
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CacheModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 5. Use Caching in Your Service

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { Cacheable } from './cache/decorators/cacheable.decorator';
import { CacheInvalidate } from './cache/decorators/cache-invalidate.decorator';
import { CacheKeys, CacheTTL } from './cache/cache.config';

@Injectable()
export class UserService {
  // IMPORTANT: CacheService must be public for decorators to work
  constructor(public readonly cacheService: CacheService) {}

  // Cache user profile for 10 minutes
  @Cacheable({
    key: CacheKeys.USER_PROFILE,
    ttl: CacheTTL.MEDIUM, // 600 seconds
  })
  async getUserProfile(userId: string): Promise<UserProfile> {
    console.log('Fetching from database...');
    return await this.userRepository.findOne({ where: { id: userId } });
  }

  // Invalidate cache on update
  @CacheInvalidate({
    keys: ['user:profile:{0}', 'user:permissions:{0}'],
  })
  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    return await this.userRepository.update(userId, data);
  }

  // Manual cache management
  async customCaching(userId: string): Promise<void> {
    const cacheKey = `${CacheKeys.USER_PROFILE}:${userId}`;

    // Check if exists
    const exists = await this.cacheService.exists(cacheKey);

    if (exists) {
      // Get cached value
      const cached = await this.cacheService.get<UserProfile>(cacheKey);
    } else {
      // Fetch and cache
      const user = await this.getUserProfile(userId);
      await this.cacheService.set(cacheKey, user, CacheTTL.MEDIUM);
    }
  }
}
```

## Usage Examples

### Basic Caching

```typescript
// Get from cache
const value = await cacheService.get<User>('user:profile:123');

// Set in cache with 5-minute TTL
await cacheService.set('user:profile:123', userData, 300);

// Delete from cache
await cacheService.delete('user:profile:123');

// Check if exists
const exists = await cacheService.exists('user:profile:123');

// Increment counter
const count = await cacheService.increment('login:attempts:user123', 1);
```

### Cache-Aside with getOrSet

```typescript
const user = await cacheService.getOrSet(
  'user:profile:123',
  async () => {
    // This function only runs on cache miss
    return await userRepository.findOne({ where: { id: '123' } });
  },
  600 // TTL in seconds
);
```

### Pattern-Based Invalidation

```typescript
// Delete all user-related cache
await cacheService.deletePattern('user:*:123');

// Delete all bundle cache
await cacheService.deletePattern('bundle:*');

// Delete specific pattern
await cacheService.deletePattern('user:permissions:*');
```

### Rate Limiting

```typescript
import { RateLimit } from './common/guards/redis-rate-limit.guard';

@Controller('api')
export class ApiController {
  // Rate limit: 100 requests per 60 seconds per user
  @RateLimit({ limit: 100, window: 60, scope: 'user' })
  @Get('data')
  async getData() {
    return { data: 'some data' };
  }

  // Global rate limit (all users combined)
  @RateLimit({ limit: 1000, window: 60, scope: 'global' })
  @Get('public')
  async getPublic() {
    return { data: 'public data' };
  }

  // IP-based rate limit
  @RateLimit({ limit: 50, window: 60, scope: 'ip' })
  @Get('no-auth')
  async getNoAuth() {
    return { data: 'no auth data' };
  }
}
```

### Cache Warming

```typescript
import { CacheWarmingService } from './cache/jobs/cache-warming.service';

@Injectable()
export class AppBootstrapService {
  constructor(private warmingService: CacheWarmingService) {}

  async onApplicationBootstrap() {
    // Automatic warming is configured in CacheWarmingService
    // You can also manually trigger warming:

    // Warm specific bundle
    await this.warmingService.warmBundle('bundle-123');

    // Warm specific user
    await this.warmingService.warmUser('user-456');

    // Warm multiple targets
    await this.warmingService.warmCache(['bundles', 'ai-prompts', 'popular-users']);
  }
}
```

## Configuration

### Cache Keys

Defined in `cache.config.ts`:

```typescript
export const CacheKeys = {
  USER_PROFILE: 'user:profile',
  USER_PERMISSIONS: 'user:permissions',
  AUTH_SESSION: 'auth:session',
  AUTH_BLACKLIST: 'auth:blacklist',
  AI_PROMPT: 'ai:prompt',
  BUNDLE: 'bundle',
  BUNDLE_RCS: 'bundle:rcs',
  RATE_LIMIT: 'ratelimit',
} as const;
```

### TTL Values

```typescript
export const CacheTTL = {
  VERY_SHORT: 60,      // 1 minute
  SHORT: 300,          // 5 minutes
  MEDIUM: 600,         // 10 minutes
  LONG: 900,           // 15 minutes
  VERY_LONG: 3600,     // 1 hour
  DAY: 86400,          // 24 hours
} as const;
```

### Environment Variables

```env
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# Cache Configuration
CACHE_ENABLED=true
REDIS_TTL_DEFAULT=300
REDIS_MAX_MEMORY=256mb

# Feature-Specific TTLs
CACHE_USER_PROFILES_TTL=600
CACHE_AI_PROMPTS_TTL=3600
CACHE_BUNDLES_TTL=900
CACHE_AUTH_SESSIONS_TTL=3600

# Cache Warming
CACHE_WARMING_ENABLED=true
```

## Monitoring

### Metrics Endpoint

```bash
# Get cache metrics
curl http://localhost:3000/api/cache/metrics

# Response:
{
  "metrics": {
    "hits": 1523,
    "misses": 477,
    "sets": 512,
    "deletes": 45,
    "errors": 2,
    "hitRate": 0.7615,
    "avgLatency": 3.42
  }
}
```

### Health Check

```bash
# Get cache health
curl http://localhost:3000/api/cache/health

# Response:
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

### Redis Commander

Visual Redis management UI:

- URL: http://localhost:8081
- Username: admin
- Password: admin (configure in .env)

## Testing

### Run Unit Tests

```bash
npm test -- cache
```

### Run Integration Tests

```bash
npm run test:e2e -- cache
```

### Run Load Tests

```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/

# Run cache load test
k6 run test/performance/cache-load-test.js

# Run rate limit test
k6 run test/performance/rate-limit-test.js
```

## Architecture

```
┌─────────────────────────────────┐
│         Application Layer       │
│  ┌─────────────────────────┐   │
│  │  @Cacheable Decorator   │   │
│  │  @CacheInvalidate       │   │
│  └──────────┬──────────────┘   │
└─────────────┼───────────────────┘
              │
┌─────────────▼───────────────────┐
│         Cache Service           │
│  - Get/Set/Delete              │
│  - Pattern Invalidation        │
│  - Circuit Breaker             │
│  - Metrics Collection          │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│      Redis 7.4 (with config)    │
│  - Persistence: RDB + AOF       │
│  - Eviction: allkeys-lru        │
│  - Security: Password + ACL     │
└─────────────────────────────────┘
```

## Best Practices

### 1. Key Naming

Always use consistent, hierarchical keys:

```typescript
// Good
'user:profile:123'
'bundle:data:bundle-456'
'auth:session:abc123'

// Bad
'user123'
'bundleData456'
'session_abc123'
```

### 2. TTL Selection

Choose TTL based on data characteristics:

- **Hot data** (frequently accessed): Longer TTL (15 min - 1 hour)
- **Volatile data** (changes often): Shorter TTL (1-5 min)
- **Static data**: Very long TTL (1 hour - 1 day)

### 3. Cache Invalidation

Be precise with invalidation:

```typescript
// Good: Invalidate specific keys
@CacheInvalidate({ keys: ['user:profile:{0}', 'user:permissions:{0}'] })

// Bad: Over-invalidation
@CacheInvalidate({ keys: ['user:*'] })  // Invalidates all users!
```

### 4. Circuit Breaker

The cache service includes automatic circuit breaker:

- Opens after 5 consecutive failures
- Resets after 1 minute
- Gracefully falls back to database

### 5. Error Handling

Cache operations never throw - they fail gracefully:

```typescript
// On error, returns null (cache miss)
const user = await cacheService.get('user:123');  // null on error

// On error, skips caching
await cacheService.set('key', value);  // No-op on error
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Cache Hit Rate | >70% | For hot data |
| Avg Latency | <5ms | p50 |
| p95 Latency | <10ms | 95th percentile |
| API Response Time Reduction | 40% | With vs without cache |
| Database Query Reduction | 60% | Cacheable queries |

## Troubleshooting

### Low Cache Hit Rate

```bash
# Check metrics
curl http://localhost:3000/api/cache/metrics

# Trigger cache warming
curl -X POST http://localhost:3000/api/cache/warming/trigger

# Check recent operations
curl http://localhost:3000/api/cache/operations
```

### High Latency

```bash
# Check slow operations
curl http://localhost:3000/api/cache/operations/slow

# Check Redis stats
redis-cli --stat

# Monitor Redis in real-time
redis-cli MONITOR
```

### Circuit Breaker Open

```bash
# Check logs
docker-compose logs api | grep "circuit breaker"

# Check Redis connection
redis-cli PING

# Restart Redis if needed
docker-compose restart redis
```

## Documentation

- **Caching Strategy**: `/docs/caching-strategy.md` - Complete caching strategy guide
- **Implementation Report**: `/docs/CACHE_IMPLEMENTATION_REPORT.md` - Detailed implementation report
- **Performance Testing**: `/apps/api/test/performance/README.md` - Load testing guide
- **Redis Config**: `/infrastructure/docker/redis.conf` - Redis configuration

## Examples

Complete working examples:

- **User Caching**: `examples/user-cache.example.ts`
- **Auth Caching**: `examples/auth-cache.example.ts`

## Support

For issues or questions:

1. Check the documentation above
2. Review logs: `docker-compose logs api redis`
3. Check metrics: http://localhost:3000/api/cache/metrics
4. Browse Redis: http://localhost:8081 (Redis Commander)

## License

MIT
