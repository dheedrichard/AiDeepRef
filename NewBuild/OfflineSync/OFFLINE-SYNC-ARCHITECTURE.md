# AiDeepRef Offline-First Sync Architecture
**React Native + WatermelonDB Implementation**

---

## 1. Sync Algorithm

### Core Sync Flow (Pseudocode)

```javascript
async function syncWithServer() {
  if (!isOnline()) return queueSync();

  const lastSync = await getLastSyncTimestamp();

  try {
    // 1. PUSH: Upload local changes
    const localChanges = await database.getChangesAfter(lastSync);
    const pushResult = await api.push({
      created: localChanges.created,
      updated: localChanges.updated,
      deleted: localChanges.deleted,
      lastSync
    });

    // 2. PULL: Get server changes
    const serverChanges = await api.pull({ since: lastSync });

    // 3. RESOLVE: Handle conflicts (last-write-wins)
    const resolved = await resolveConflicts({
      local: localChanges,
      server: serverChanges,
      strategy: 'last-write-wins'
    });

    // 4. APPLY: Update local database
    await database.batch(() => {
      resolved.toCreate.forEach(r => database.create(r));
      resolved.toUpdate.forEach(r => database.update(r));
      resolved.toDelete.forEach(r => database.delete(r));
    });

    // 5. UPDATE: Save sync timestamp
    await setLastSyncTimestamp(serverChanges.timestamp);

    return { success: true, conflicts: resolved.conflicts };

  } catch (error) {
    await queueRetry(error);
    throw error;
  }
}

function resolveConflicts({ local, server, strategy }) {
  const conflicts = [];
  const toUpdate = [];
  const toCreate = server.created;
  const toDelete = server.deleted;

  // Last-write-wins conflict resolution
  server.updated.forEach(serverRecord => {
    const localRecord = local.updated.find(l => l.id === serverRecord.id);

    if (localRecord) {
      // Conflict detected
      if (serverRecord.updatedAt > localRecord.updatedAt) {
        // Server wins
        toUpdate.push(serverRecord);
        conflicts.push({ id: serverRecord.id, winner: 'server' });
      } else {
        // Local wins (already pushed)
        conflicts.push({ id: serverRecord.id, winner: 'local' });
      }
    } else {
      // No conflict
      toUpdate.push(serverRecord);
    }
  });

  return { toCreate, toUpdate, toDelete, conflicts };
}
```

---

## 2. Data Model

### WatermelonDB Schema with Sync Metadata

```typescript
// schema.ts
export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'email', type: 'string' },
        { name: 'name', type: 'string' },
        // Sync metadata
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' }, // 'synced' | 'pending' | 'error'
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_deleted', type: 'boolean' }
      ]
    }),
    tableSchema({
      name: 'references',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'referee_name', type: 'string' },
        { name: 'referee_email', type: 'string' },
        { name: 'status', type: 'string' },
        // Sync metadata
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_deleted', type: 'boolean' }
      ]
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'operation', type: 'string' }, // 'create' | 'update' | 'delete'
        { name: 'payload', type: 'string' }, // JSON stringified
        { name: 'retry_count', type: 'number' },
        { name: 'status', type: 'string' }, // 'pending' | 'processing' | 'failed'
        { name: 'error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }),
    tableSchema({
      name: 'sync_metadata',
      columns: [
        { name: 'key', type: 'string' },
        { name: 'value', type: 'string' },
        { name: 'updated_at', type: 'number' }
      ]
    })
  ]
});

// Model with sync methods
@immutableRelation('users', 'user_id')
class Reference extends Model {
  static table = 'references';

  @field('referee_name') refereeName!: string;
  @field('referee_email') refereeEmail!: string;
  @field('status') status!: string;
  @field('server_id') serverId?: string;
  @field('sync_status') syncStatus!: 'synced' | 'pending' | 'error';
  @field('last_synced_at') lastSyncedAt?: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  @field('is_deleted') isDeleted!: boolean;

  @writer async markForSync() {
    await this.update(reference => {
      reference.syncStatus = 'pending';
    });
  }

  @writer async markSynced(serverId: string) {
    await this.update(reference => {
      reference.serverId = serverId;
      reference.syncStatus = 'synced';
      reference.lastSyncedAt = Date.now();
    });
  }
}
```

### SQLite Sync Metadata Structure

```sql
-- Automatically handled by WatermelonDB, shown for reference
CREATE TABLE sync_metadata (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at INTEGER
);

-- Track last successful sync
INSERT INTO sync_metadata (key, value) VALUES ('last_sync_timestamp', '0');

-- Track sync state
INSERT INTO sync_metadata (key, value) VALUES ('sync_in_progress', 'false');
```

---

## 3. Network Handling

### Queue Management

```typescript
// syncQueue.ts
class SyncQueue {
  private processing = false;
  private retryDelays = [1000, 5000, 15000, 60000]; // Exponential backoff

  async addToQueue(operation: SyncOperation) {
    await database.write(async () => {
      await syncQueueCollection.create(queue => {
        queue.tableName = operation.table;
        queue.recordId = operation.id;
        queue.operation = operation.type;
        queue.payload = JSON.stringify(operation.data);
        queue.retryCount = 0;
        queue.status = 'pending';
      });
    });

    // Trigger processing if online
    if (isOnline()) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await syncQueueCollection
        .query(Q.where('status', 'pending'))
        .fetch();

      for (const item of pending) {
        await this.processQueueItem(item);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processQueueItem(item: SyncQueueItem) {
    try {
      await database.write(async () => {
        await item.update(q => { q.status = 'processing'; });
      });

      const payload = JSON.parse(item.payload);
      await this.syncToServer(item.operation, payload);

      // Success - remove from queue
      await database.write(async () => {
        await item.destroyPermanently();
      });

    } catch (error) {
      await this.handleRetry(item, error);
    }
  }

  private async handleRetry(item: SyncQueueItem, error: Error) {
    const nextRetry = item.retryCount + 1;
    const maxRetries = this.retryDelays.length;

    if (nextRetry >= maxRetries) {
      // Max retries exceeded
      await database.write(async () => {
        await item.update(q => {
          q.status = 'failed';
          q.error = error.message;
        });
      });
      return;
    }

    // Schedule retry
    await database.write(async () => {
      await item.update(q => {
        q.status = 'pending';
        q.retryCount = nextRetry;
      });
    });

    const delay = this.retryDelays[nextRetry];
    setTimeout(() => this.processQueue(), delay);
  }
}
```

### Network State Management

```typescript
// networkManager.ts
import NetInfo from '@react-native-community/netinfo';

class NetworkManager {
  private isOnline = false;
  private listeners: Set<(online: boolean) => void> = new Set();

  init() {
    NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;

      if (online !== this.isOnline) {
        this.isOnline = online;
        this.notifyListeners(online);

        // Auto-sync when coming online
        if (online) {
          this.triggerSync();
        }
      }
    });
  }

  subscribe(listener: (online: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach(listener => listener(online));
  }

  private async triggerSync() {
    await syncService.sync();
  }

  getStatus() {
    return this.isOnline;
  }
}

export const networkManager = new NetworkManager();
```

### Background Sync

```typescript
// backgroundSync.ts
import BackgroundFetch from 'react-native-background-fetch';

export function initBackgroundSync() {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // minutes
      stopOnTerminate: false,
      enableHeadless: true,
      startOnBoot: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY
    },
    async (taskId) => {
      console.log('[BackgroundFetch] Event received:', taskId);

      try {
        if (networkManager.getStatus()) {
          await syncService.sync();
        }
        BackgroundFetch.finish(taskId);
      } catch (error) {
        console.error('[BackgroundFetch] Error:', error);
        BackgroundFetch.finish(taskId);
      }
    },
    (error) => {
      console.error('[BackgroundFetch] Failed to start:', error);
    }
  );
}
```

---

## 4. Implementation

### Sync Service

```typescript
// services/syncService.ts
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';

class SyncService {
  private syncInProgress = false;

  async sync() {
    if (this.syncInProgress) {
      console.log('[Sync] Already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          const response = await api.get('/sync/pull', {
            params: { since: lastPulledAt || 0 }
          });

          return {
            changes: response.data.changes,
            timestamp: response.data.timestamp
          };
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          await api.post('/sync/push', {
            changes,
            lastPulledAt
          });
        },
        migrationsEnabledAtVersion: 1
      });

      console.log('[Sync] Completed successfully');

    } catch (error) {
      console.error('[Sync] Failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async getUnsyncedCount() {
    const count = await database.get('references')
      .query(Q.where('sync_status', 'pending'))
      .fetchCount();
    return count;
  }
}

export const syncService = new SyncService();
```

### Network Detection Hook

```typescript
// hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { networkManager } from '../services/networkManager';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(networkManager.getStatus());

  useEffect(() => {
    return networkManager.subscribe(setIsOnline);
  }, []);

  return isOnline;
}

// hooks/useSyncStatus.ts
import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';

export function useSyncStatus() {
  const [syncing, setSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    loadUnsyncedCount();

    const interval = setInterval(loadUnsyncedCount, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadUnsyncedCount() {
    const count = await syncService.getUnsyncedCount();
    setUnsyncedCount(count);
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await syncService.sync();
      await loadUnsyncedCount();
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, unsyncedCount, triggerSync };
}
```

### Optimistic UI Pattern

```typescript
// components/ReferenceCreate.tsx
import { useState } from 'react';
import { database } from '../database';

export function ReferenceCreate() {
  const [saving, setSaving] = useState(false);
  const isOnline = useNetworkStatus();

  async function handleSubmit(data: ReferenceInput) {
    setSaving(true);

    try {
      // 1. Create local record immediately (optimistic)
      const reference = await database.write(async () => {
        return await database.get('references').create(ref => {
          ref.refereeName = data.name;
          ref.refereeEmail = data.email;
          ref.status = 'pending';
          ref.syncStatus = 'pending';
          ref.createdAt = Date.now();
          ref.updatedAt = Date.now();
          ref.isDeleted = false;
        });
      });

      // 2. UI updates immediately - no waiting
      navigation.goBack();

      // 3. Sync in background
      if (isOnline) {
        syncQueue.addToQueue({
          table: 'references',
          id: reference.id,
          type: 'create',
          data: reference._raw
        });
      }

    } catch (error) {
      // Rollback on error
      console.error('Failed to create reference:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      {!isOnline && (
        <Banner type="warning">
          Offline - Changes will sync when connected
        </Banner>
      )}
      {/* Form fields */}
    </Form>
  );
}
```

### WebSocket Real-Time Updates

```typescript
// services/websocketService.ts
import { io, Socket } from 'socket.io-client';
import { database } from '../database';

class WebSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
    });

    // Real-time updates
    this.socket.on('reference:updated', async (data) => {
      await this.handleReferenceUpdate(data);
    });

    this.socket.on('reference:created', async (data) => {
      await this.handleReferenceCreate(data);
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
    });
  }

  private async handleReferenceUpdate(data: any) {
    await database.write(async () => {
      const reference = await database
        .get('references')
        .find(data.id);

      await reference.update(ref => {
        ref.status = data.status;
        ref.syncStatus = 'synced';
        ref.lastSyncedAt = Date.now();
      });
    });
  }

  private async handleReferenceCreate(data: any) {
    const exists = await database
      .get('references')
      .query(Q.where('server_id', data.id))
      .fetchCount();

    if (exists === 0) {
      await database.write(async () => {
        await database.get('references').create(ref => {
          ref.serverId = data.id;
          ref.refereeName = data.name;
          ref.refereeEmail = data.email;
          ref.status = data.status;
          ref.syncStatus = 'synced';
          ref.lastSyncedAt = Date.now();
        });
      });
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const wsService = new WebSocketService();
```

### Sync Status Indicator

```typescript
// components/SyncIndicator.tsx
import { useNetworkStatus, useSyncStatus } from '../hooks';

export function SyncIndicator() {
  const isOnline = useNetworkStatus();
  const { syncing, unsyncedCount, triggerSync } = useSyncStatus();

  if (!isOnline) {
    return (
      <View style={styles.offline}>
        <Icon name="cloud-offline" />
        <Text>Offline - {unsyncedCount} unsynced</Text>
      </View>
    );
  }

  if (syncing) {
    return (
      <View style={styles.syncing}>
        <ActivityIndicator />
        <Text>Syncing...</Text>
      </View>
    );
  }

  if (unsyncedCount > 0) {
    return (
      <TouchableOpacity onPress={triggerSync} style={styles.pending}>
        <Icon name="cloud-upload" />
        <Text>Tap to sync ({unsyncedCount})</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.synced}>
      <Icon name="cloud-check" />
      <Text>Synced</Text>
    </View>
  );
}
```

---

## Key Features

1. **Offline-First**: All operations work offline, sync automatically when online
2. **Conflict Resolution**: Last-write-wins with timestamp comparison
3. **Queue Management**: Failed syncs retry with exponential backoff
4. **Optimistic UI**: Immediate feedback, background sync
5. **Real-Time**: WebSocket updates for live data
6. **Background Sync**: Periodic sync every 15 minutes
7. **Network Detection**: Auto-sync on reconnection

---

## Testing Strategy

```typescript
// __tests__/sync.test.ts
describe('Sync Service', () => {
  it('should push local changes', async () => {
    const reference = await createLocalReference();
    await syncService.sync();
    expect(reference.syncStatus).toBe('synced');
  });

  it('should resolve conflicts with last-write-wins', async () => {
    const local = await createReference({ updatedAt: 1000 });
    const server = { ...local, updatedAt: 2000, name: 'Server Update' };

    await syncService.sync();

    const result = await database.get('references').find(local.id);
    expect(result.name).toBe('Server Update'); // Server wins
  });

  it('should queue operations when offline', async () => {
    networkManager.setOffline();
    await createReference({ name: 'Test' });

    const queueCount = await syncQueue.getPendingCount();
    expect(queueCount).toBe(1);
  });
});
```

---

**Implementation Time**: 1 week
**Dependencies**: WatermelonDB, NetInfo, BackgroundFetch, Socket.IO
