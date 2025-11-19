/**
 * Cache Metrics Interfaces
 *
 * Defines types for tracking cache performance and health.
 */

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgLatency: number;
  memoryUsage?: number;
}

export interface CacheOperation {
  type: 'get' | 'set' | 'delete' | 'increment';
  key: string;
  timestamp: number;
  latency: number;
  hit?: boolean;
  error?: boolean;
}

export interface CacheHealth {
  connected: boolean;
  latency: number;
  memoryUsed: number;
  memoryMax: number;
  memoryUsagePercentage: number;
  keyCount: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}
