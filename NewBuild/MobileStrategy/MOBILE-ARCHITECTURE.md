# AiDeepRef Mobile Architecture Strategy
## Practical Implementation Guide

**Version**: 1.0.0
**Date**: November 23, 2025
**Status**: Active
**Classification**: Mobile Architecture & Implementation

---

## Table of Contents

1. [Tech Stack Decision](#tech-stack-decision)
2. [Native App Architecture](#native-app-architecture)
3. [PWA Architecture](#pwa-architecture)
4. [Offline-First Sync Strategy](#offline-first-sync-strategy)
5. [Security Implementation](#security-implementation)
6. [Performance Optimization](#performance-optimization)
7. [Deployment Strategy](#deployment-strategy)
8. [Migration Path](#migration-path)

---

## 1. Tech Stack Decision

### RECOMMENDATION: React Native 0.76+

**Version**: React Native 0.76.9 (Latest stable, New Architecture enabled by default)

### Decision Matrix

| Criteria | React Native 0.76+ | Flutter 3.38+ | Winner |
|----------|-------------------|---------------|---------|
| **Code Sharing with Web** | ✅ 60-70% (React 19 web) | ❌ 0% (Dart vs TS/JS) | **React Native** |
| **Performance** | ⚡ 60 FPS, 15% faster startup | ⚡⚡ 60-120 FPS, Impeller engine | Flutter |
| **Team Skill Transfer** | ✅ Direct (React/TypeScript) | ❌ New language (Dart) | **React Native** |
| **Azure SDK** | ✅ Excellent support | ⚠️ Good but smaller ecosystem | **React Native** |
| **Community** | ✅ 119k GitHub stars, massive | ✅ 166k GitHub stars, growing | Tie |
| **Dev Velocity** | ✅ Fast Refresh, familiar tools | ✅ Hot reload, excellent tooling | Tie |
| **Bundle Size** | ⚠️ Larger (~15-20MB) | ✅ Smaller (~10-15MB) | Flutter |
| **Real-time/WebSocket** | ✅ Native support, proven | ✅ Good support | Tie |
| **Offline-First** | ✅ WatermelonDB, SQLite | ✅ Hive, Drift, Isar | Tie |
| **Enterprise Adoption** | ✅ Meta, Microsoft, Tesla | ✅ Google, Alibaba, BMW | Tie |

### Final Verdict: React Native 0.76+

**Justification**:

1. **Code Reuse**: 60-70% code sharing with React 19 web frontend saves 3-4 weeks development time
2. **Team Skills**: Zero ramp-up time - team already knows React/TypeScript
3. **Azure Integration**: First-class Azure SDKs, proven at scale
4. **New Architecture**: 500-900ms performance improvement, 60 FPS guaranteed, bridge removed
5. **Business Logic Reuse**: Share validation, API clients, state management with web
6. **Tooling**: Unified debugging, testing, and deployment with web
7. **Hiring**: Larger talent pool (React devs >> Dart devs)

**Performance Trade-off**: Flutter has 10-15% better rendering performance, but React Native 0.76's New Architecture closes the gap to acceptable levels (60 FPS). The development velocity and code sharing benefits outweigh the marginal performance difference for our use case.

### Key New Architecture Benefits

- **Fabric Renderer**: Synchronous rendering, no bridge bottleneck
- **TurboModules**: Lazy loading, 15ms (8%) faster startup
- **JSI**: Direct C++ communication, 2-3x faster native calls
- **Metro Improvements**: 15x faster resolver, 4x faster warm builds
- **Concurrent React 18**: Suspense, Transitions, automatic batching
- **Size Reduction**: 3.8MB smaller (20% reduction on Android)

---

## 2. Native App Architecture

### 2.1 Project Structure

```
mobile/
├── apps/
│   ├── seeker/                      # Job Seeker Native App
│   │   ├── android/                 # Android native code
│   │   ├── ios/                     # iOS native code (Swift default)
│   │   ├── src/
│   │   │   ├── app/                 # App entry point
│   │   │   ├── features/            # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── screens/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── types/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── profile/
│   │   │   │   ├── jobs/
│   │   │   │   ├── references/
│   │   │   │   └── verification/
│   │   │   ├── shared/              # Shared code (can be web-shared)
│   │   │   │   ├── components/      # UI components
│   │   │   │   ├── hooks/           # Custom hooks
│   │   │   │   ├── utils/           # Utilities
│   │   │   │   ├── api/             # API clients (shared with web)
│   │   │   │   ├── store/           # State management
│   │   │   │   ├── types/           # TypeScript types
│   │   │   │   └── constants/
│   │   │   ├── navigation/          # React Navigation
│   │   │   ├── services/            # Native services
│   │   │   │   ├── biometrics/
│   │   │   │   ├── encryption/
│   │   │   │   ├── notifications/
│   │   │   │   └── offline/
│   │   │   └── config/
│   │   ├── e2e/                     # Detox tests
│   │   ├── __tests__/               # Jest tests
│   │   └── package.json
│   │
│   └── employer/                    # Employer Native App
│       └── [similar structure]
│
├── packages/                        # Shared packages (monorepo)
│   ├── ui/                          # Shared UI components
│   ├── api-client/                  # API client (shared with web)
│   ├── types/                       # Shared TypeScript types
│   ├── utils/                       # Shared utilities
│   └── crypto/                      # Encryption utilities
│
├── tools/
│   ├── codegen/                     # Code generation scripts
│   └── scripts/
│
└── package.json                     # Workspace root
```

### 2.2 State Management: Zustand + TanStack Query

**Why not Redux?** Too much boilerplate. Zustand is lightweight, performant, and works seamlessly with React 18.

```typescript
// src/shared/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  biometricEnabled: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      biometricEnabled: false,

      login: async (email, password) => {
        const response = await authApi.login(email, password);
        set(state => {
          state.user = response.user;
          state.token = response.token;
          state.isAuthenticated = true;
        });
      },

      logout: async () => {
        await authApi.logout();
        set({ user: null, token: null, isAuthenticated: false });
      },

      enableBiometric: async () => {
        // Store encrypted credentials for biometric login
        const { token } = get();
        await BiometricService.storeCredentials(token);
        set({ biometricEnabled: true });
      },

      refreshToken: async () => {
        const response = await authApi.refreshToken();
        set({ token: response.token });
      }
    })),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        biometricEnabled: state.biometricEnabled
        // Don't persist token - use encrypted keychain
      })
    }
  )
);
```

```typescript
// src/shared/store/offlineStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface OfflineState {
  isOnline: boolean;
  pendingOperations: PendingOperation[];
  lastSyncTimestamp: number;
  syncInProgress: boolean;

  // Actions
  addPendingOperation: (op: PendingOperation) => void;
  removePendingOperation: (id: string) => void;
  setOnlineStatus: (online: boolean) => void;
  startSync: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  devtools((set, get) => ({
    isOnline: true,
    pendingOperations: [],
    lastSyncTimestamp: 0,
    syncInProgress: false,

    addPendingOperation: (op) => {
      set(state => ({
        pendingOperations: [...state.pendingOperations, op]
      }));
    },

    removePendingOperation: (id) => {
      set(state => ({
        pendingOperations: state.pendingOperations.filter(op => op.id !== id)
      }));
    },

    setOnlineStatus: (online) => {
      set({ isOnline: online });
      if (online && !get().syncInProgress) {
        get().startSync();
      }
    },

    startSync: async () => {
      // Sync implementation (see section 4)
    }
  }))
);
```

**Data Fetching: TanStack Query (React Query)**

```typescript
// src/features/jobs/hooks/useJobs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/shared/api/jobs';
import { useOfflineStore } from '@/shared/store/offlineStore';

export const useJobs = () => {
  const { isOnline, addPendingOperation } = useOfflineStore();
  const queryClient = useQueryClient();

  // Query with offline support
  const jobsQuery = useQuery({
    queryKey: ['jobs'],
    queryFn: jobsApi.getJobs,
    enabled: isOnline,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 3
  });

  // Mutation with offline queue
  const applyMutation = useMutation({
    mutationFn: jobsApi.applyToJob,
    onMutate: async (jobId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData(['jobs']);

      queryClient.setQueryData(['jobs'], (old: Job[]) =>
        old.map(job =>
          job.id === jobId
            ? { ...job, applied: true }
            : job
        )
      );

      return { previousJobs };
    },
    onError: (err, jobId, context) => {
      // Rollback on error
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs);
      }

      // Add to offline queue
      if (!isOnline) {
        addPendingOperation({
          id: `apply-${jobId}-${Date.now()}`,
          type: 'APPLY_JOB',
          payload: { jobId },
          timestamp: Date.now()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  return {
    jobs: jobsQuery.data,
    isLoading: jobsQuery.isLoading,
    isError: jobsQuery.isError,
    apply: applyMutation.mutate
  };
};
```

### 2.3 Navigation: React Navigation 7

```typescript
// src/navigation/RootNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/shared/store/authStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { paddingBottom: 5 }
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarIcon: ({ color }) => <DashboardIcon color={color} />
      }}
    />
    <Tab.Screen name="Jobs" component={JobsStack} />
    <Tab.Screen name="References" component={ReferencesStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

export const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### 2.4 Local Database: WatermelonDB

**Why WatermelonDB?** Optimized for React Native, lazy loading, excellent performance with 10,000+ records.

```bash
npm install @nozbe/watermelondb
npm install @nozbe/with-observables
```

```typescript
// src/services/offline/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'jobs',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'company', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'salary_min', type: 'number', isOptional: true },
        { name: 'salary_max', type: 'number', isOptional: true },
        { name: 'location', type: 'string' },
        { name: 'remote', type: 'boolean' },
        { name: 'applied', type: 'boolean' },
        { name: 'saved', type: 'boolean' },
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: '_status', type: 'string' }, // 'synced' | 'created' | 'updated' | 'deleted'
      ]
    }),
    tableSchema({
      name: 'references',
      columns: [
        { name: 'referrer_name', type: 'string' },
        { name: 'referrer_email', type: 'string' },
        { name: 'relationship', type: 'string' },
        { name: 'video_url', type: 'string', isOptional: true },
        { name: 'transcript', type: 'string', isOptional: true },
        { name: 'ai_summary', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'pending' | 'completed' | 'expired'
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: '_status', type: 'string' },
      ]
    }),
    tableSchema({
      name: 'pending_operations',
      columns: [
        { name: 'operation_type', type: 'string' },
        { name: 'entity_type', type: 'string' },
        { name: 'entity_id', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON stringified
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    })
  ]
});
```

```typescript
// src/services/offline/database/models/Job.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Job extends Model {
  static table = 'jobs';

  @field('title') title!: string;
  @field('company') company!: string;
  @field('description') description!: string;
  @field('salary_min') salaryMin?: number;
  @field('salary_max') salaryMax?: number;
  @field('location') location!: string;
  @field('remote') remote!: boolean;
  @field('applied') applied!: boolean;
  @field('saved') saved!: boolean;
  @field('server_id') serverId!: string;
  @field('_status') status!: 'synced' | 'created' | 'updated' | 'deleted';

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  async markAsApplied() {
    await this.update(job => {
      job.applied = true;
      job.status = 'updated';
    });
  }
}
```

```typescript
// src/services/offline/database/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Job, Reference, PendingOperation } from './models';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // Use JSI for 2-3x performance boost
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [Job, Reference, PendingOperation],
});
```

### 2.5 Real-time: WebSocket with Reconnection

```typescript
// src/services/websocket/WebSocketService.ts
import { useAuthStore } from '@/shared/store/authStore';
import { useOfflineStore } from '@/shared/store/offlineStore';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  connect(token: string) {
    const wsUrl = `wss://${API_BASE_URL}/ws?token=${token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      useOfflineStore.getState().setOnlineStatus(true);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      useOfflineStore.getState().setOnlineStatus(false);
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      const token = useAuthStore.getState().token;
      if (token) {
        this.connect(token);
      }
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, message queued');
      // Add to offline queue
      useOfflineStore.getState().addPendingOperation({
        id: `ws-${Date.now()}`,
        type: 'WEBSOCKET_MESSAGE',
        payload: { type, data },
        timestamp: Date.now()
      });
    }
  }

  on(messageType: string, handler: (data: any) => void) {
    this.messageHandlers.set(messageType, handler);
  }

  off(messageType: string) {
    this.messageHandlers.delete(messageType);
  }

  disconnect() {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }
}

export const wsService = new WebSocketService();
```

---

## 3. PWA Architecture (Referrers)

### 3.1 Design Philosophy

**Ultra-simple, frictionless referrer experience:**
- No app store download
- No account creation required initially
- Record video reference in 2 clicks
- Install prompt after first successful submission

### 3.2 Project Structure

```
apps/web/src/
├── pwa/
│   ├── manifest.json               # PWA manifest
│   ├── service-worker.ts           # Service worker
│   ├── install-prompt.ts           # Install banner logic
│   └── offline-page.html           # Offline fallback
│
├── features/
│   └── referrer/
│       ├── components/
│       │   ├── VideoRecorder.tsx   # MediaRecorder API
│       │   ├── RecordingProgress.tsx
│       │   └── SubmitSuccess.tsx
│       ├── screens/
│       │   ├── ReferenceRequest.tsx
│       │   └── RecordScreen.tsx
│       └── hooks/
│           ├── useMediaRecorder.ts
│           └── useOfflineStorage.ts
```

### 3.3 PWA Manifest

```json
// public/manifest.json
{
  "name": "AiDeepRef - Provide Reference",
  "short_name": "DeepRef",
  "description": "Record video references in minutes",
  "start_url": "/referrer",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity", "business"],
  "shortcuts": [
    {
      "name": "Record Reference",
      "url": "/referrer/record",
      "description": "Start recording a video reference"
    }
  ]
}
```

### 3.4 Service Worker (Workbox)

```typescript
// src/pwa/service-worker.ts
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);

// App shell
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
});
registerRoute(navigationRoute);

// API calls - Network First with fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Static assets - Cache First
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Images - Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Background Sync for failed video uploads
const bgSyncPlugin = new BackgroundSyncPlugin('video-upload-queue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
});

registerRoute(
  ({ url }) => url.pathname === '/api/references/upload',
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### 3.5 Media Recording

```typescript
// src/features/referrer/hooks/useMediaRecorder.ts
import { useState, useRef, useCallback } from 'react';
import { openDB, DBSchema } from 'idb';

interface RecordingDB extends DBSchema {
  recordings: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      timestamp: number;
      uploaded: boolean;
    };
  };
}

export const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with optimal settings
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);

        // Store in IndexedDB for offline capability
        await storeRecording(blob);

        // Clean up
        chunksRef.current = [];
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Capture in 1-second chunks
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const storeRecording = async (blob: Blob) => {
    const db = await openDB<RecordingDB>('recordings-db', 1, {
      upgrade(db) {
        db.createObjectStore('recordings', { keyPath: 'id' });
      },
    });

    const id = `recording-${Date.now()}`;
    await db.add('recordings', {
      id,
      blob,
      timestamp: Date.now(),
      uploaded: false
    });
  };

  return {
    isRecording,
    recordingTime,
    videoUrl,
    startRecording,
    stopRecording
  };
};
```

### 3.6 Install Prompt

```typescript
// src/pwa/install-prompt.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show install prompt after first successful submission
      const hasSubmitted = localStorage.getItem('referrer_submitted');
      if (hasSubmitted) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted install');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('install_dismissed', 'true');
  };

  return {
    showInstallPrompt,
    installApp,
    dismissPrompt
  };
};
```

### 3.7 Offline Video Upload

```typescript
// src/features/referrer/services/videoUpload.ts
import { openDB } from 'idb';

export class VideoUploadService {
  private static async uploadVideo(blob: Blob, metadata: any) {
    const formData = new FormData();
    formData.append('video', blob, 'reference.webm');
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/references/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  static async submitReference(blob: Blob, metadata: any) {
    try {
      // Try immediate upload
      const result = await this.uploadVideo(blob, metadata);

      // Mark as submitted for install prompt
      localStorage.setItem('referrer_submitted', 'true');

      return result;
    } catch (error) {
      // Store for background sync
      const db = await openDB('recordings-db', 1);
      const id = `recording-${Date.now()}`;

      await db.add('recordings', {
        id,
        blob,
        timestamp: Date.now(),
        uploaded: false,
        metadata
      });

      // Register background sync
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('upload-videos');
      }

      throw new Error('Offline - video will upload when online');
    }
  }

  static async processPendingUploads() {
    const db = await openDB('recordings-db', 1);
    const recordings = await db.getAll('recordings');

    for (const recording of recordings) {
      if (!recording.uploaded) {
        try {
          await this.uploadVideo(recording.blob, recording.metadata);
          recording.uploaded = true;
          await db.put('recordings', recording);
        } catch (error) {
          console.error('Failed to upload recording:', error);
        }
      }
    }
  }
}
```

---

## 4. Offline-First Sync Strategy

### 4.1 Sync Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (Client)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │ UI Components│◄────►│ State Store  │                │
│  └──────────────┘      │  (Zustand)   │                │
│                        └──────┬───────┘                │
│                               │                          │
│                        ┌──────▼───────┐                │
│                        │  Sync Engine │                │
│                        │              │                │
│                        │ • Pull Delta │                │
│                        │ • Push Delta │                │
│                        │ • Conflict   │                │
│                        │   Resolution │                │
│                        └──────┬───────┘                │
│                               │                          │
│           ┌───────────────────┼───────────────────┐    │
│           │                   │                   │    │
│    ┌──────▼──────┐   ┌────────▼────────┐  ┌──────▼──┐ │
│    │ WatermelonDB│   │ Pending Queue   │  │ Network │ │
│    │   (SQLite)  │   │   (IndexedDB)   │  │ Monitor │ │
│    └─────────────┘   └─────────────────┘  └─────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WebSocket
                              │
┌─────────────────────────────▼─────────────────────────┐
│                    Server (Azure)                      │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐      ┌──────────────┐              │
│  │ Sync Service │◄────►│ Cosmos DB    │              │
│  │              │      │              │              │
│  │ • Last-Write │      │ • Timestamps │              │
│  │   Wins       │      │ • Version    │              │
│  │ • Timestamps │      │ • Soft Delete│              │
│  └──────────────┘      └──────────────┘              │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### 4.2 Sync Algorithm

**Core Principles:**
1. **Local-First**: All writes go to local DB first
2. **Delta Sync**: Only sync changed records since last sync
3. **Last-Write-Wins**: Simple conflict resolution with timestamps
4. **Optimistic UI**: Immediate feedback, sync in background
5. **Retry with Backoff**: Exponential backoff for failed syncs

```typescript
// src/services/offline/SyncEngine.ts
import { database } from './database';
import { Q } from '@nozbe/watermelondb';
import { useAuthStore } from '@/shared/store/authStore';
import { useOfflineStore } from '@/shared/store/offlineStore';

interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

export class SyncEngine {
  private isSyncing = false;
  private syncRetries = 0;
  private maxRetries = 3;

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { pushed: 0, pulled: 0, conflicts: 0, errors: [] };
    }

    this.isSyncing = true;
    useOfflineStore.getState().syncInProgress = true;

    const result: SyncResult = {
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // Step 1: Push local changes to server
      const pushResult = await this.pushChanges();
      result.pushed = pushResult.count;
      result.errors.push(...pushResult.errors);

      // Step 2: Pull server changes
      const pullResult = await this.pullChanges();
      result.pulled = pullResult.count;
      result.conflicts = pullResult.conflicts;
      result.errors.push(...pullResult.errors);

      // Step 3: Update last sync timestamp
      const lastSyncTimestamp = Date.now();
      useOfflineStore.setState({ lastSyncTimestamp });
      await this.persistSyncTimestamp(lastSyncTimestamp);

      // Reset retry counter on success
      this.syncRetries = 0;

      console.log('Sync completed:', result);
      return result;

    } catch (error) {
      console.error('Sync failed:', error);
      result.errors.push(error.message);

      // Retry with exponential backoff
      this.syncRetries++;
      if (this.syncRetries < this.maxRetries) {
        const delay = Math.pow(2, this.syncRetries) * 1000;
        setTimeout(() => this.sync(), delay);
      }

      return result;

    } finally {
      this.isSyncing = false;
      useOfflineStore.getState().syncInProgress = false;
    }
  }

  /**
   * Push local changes to server
   * Delta sync: only send records modified since last sync
   */
  private async pushChanges() {
    const result = { count: 0, errors: [] };
    const lastSyncTimestamp = useOfflineStore.getState().lastSyncTimestamp;

    // Get all locally modified records
    const modifiedJobs = await database.collections
      .get('jobs')
      .query(
        Q.where('_status', Q.oneOf(['created', 'updated', 'deleted'])),
        Q.where('updated_at', Q.gt(lastSyncTimestamp))
      )
      .fetch();

    const modifiedReferences = await database.collections
      .get('references')
      .query(
        Q.where('_status', Q.oneOf(['created', 'updated', 'deleted'])),
        Q.where('updated_at', Q.gt(lastSyncTimestamp))
      )
      .fetch();

    // Batch upload changes
    const changes = {
      jobs: modifiedJobs.map(job => this.serializeRecord(job)),
      references: modifiedReferences.map(ref => this.serializeRecord(ref))
    };

    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(changes)
      });

      if (!response.ok) {
        throw new Error('Push failed');
      }

      const serverResponse = await response.json();

      // Mark records as synced
      await database.write(async () => {
        for (const job of modifiedJobs) {
          await job.update(record => {
            record.status = 'synced';
            record.syncedAt = new Date();
            // Update server_id if it was a new record
            if (serverResponse.jobs[job.id]) {
              record.serverId = serverResponse.jobs[job.id].serverId;
            }
          });
        }

        for (const ref of modifiedReferences) {
          await ref.update(record => {
            record.status = 'synced';
            record.syncedAt = new Date();
            if (serverResponse.references[ref.id]) {
              record.serverId = serverResponse.references[ref.id].serverId;
            }
          });
        }
      });

      result.count = modifiedJobs.length + modifiedReferences.length;

    } catch (error) {
      result.errors.push(`Push error: ${error.message}`);
    }

    return result;
  }

  /**
   * Pull server changes
   * Delta sync: only fetch records modified since last sync
   */
  private async pullChanges() {
    const result = { count: 0, conflicts: 0, errors: [] };
    const lastSyncTimestamp = useOfflineStore.getState().lastSyncTimestamp;

    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(
        `/api/sync/pull?since=${lastSyncTimestamp}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Pull failed');
      }

      const serverData = await response.json();

      // Apply server changes to local database
      await database.write(async () => {
        // Process jobs
        for (const serverJob of serverData.jobs) {
          const conflict = await this.applyServerRecord('jobs', serverJob);
          if (conflict) result.conflicts++;
          result.count++;
        }

        // Process references
        for (const serverRef of serverData.references) {
          const conflict = await this.applyServerRecord('references', serverRef);
          if (conflict) result.conflicts++;
          result.count++;
        }
      });

    } catch (error) {
      result.errors.push(`Pull error: ${error.message}`);
    }

    return result;
  }

  /**
   * Apply server record to local database
   * Handles conflict resolution (Last-Write-Wins)
   */
  private async applyServerRecord(tableName: string, serverRecord: any): Promise<boolean> {
    const collection = database.collections.get(tableName);

    // Find local record by server_id
    const localRecords = await collection
      .query(Q.where('server_id', serverRecord.id))
      .fetch();

    if (localRecords.length === 0) {
      // New record from server - create locally
      await collection.create(record => {
        this.hydrateRecord(record, serverRecord);
        record.serverId = serverRecord.id;
        record.status = 'synced';
        record.syncedAt = new Date();
      });
      return false;
    }

    const localRecord = localRecords[0];

    // Conflict detection: both modified since last sync
    const localModified = localRecord.updatedAt > new Date(serverRecord.syncedAt || 0);
    const serverModified = new Date(serverRecord.updatedAt) > localRecord.syncedAt;

    if (localModified && serverModified) {
      // CONFLICT: Last-Write-Wins
      const serverNewer = new Date(serverRecord.updatedAt) > localRecord.updatedAt;

      if (serverNewer) {
        // Server wins - overwrite local
        await localRecord.update(record => {
          this.hydrateRecord(record, serverRecord);
          record.status = 'synced';
          record.syncedAt = new Date();
        });
      } else {
        // Local wins - keep local, it will be pushed in next sync
        console.log(`Local record newer, keeping local: ${localRecord.id}`);
      }

      return true; // Conflict occurred
    }

    // No conflict - update local with server data
    if (serverModified) {
      await localRecord.update(record => {
        this.hydrateRecord(record, serverRecord);
        record.status = 'synced';
        record.syncedAt = new Date();
      });
    }

    return false;
  }

  private serializeRecord(record: any) {
    return {
      id: record.id,
      serverId: record.serverId,
      ...record._raw,
      updatedAt: record.updatedAt.toISOString()
    };
  }

  private hydrateRecord(record: any, data: any) {
    // Map server fields to local record
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key in record) {
        record[key] = data[key];
      }
    });
  }

  private async persistSyncTimestamp(timestamp: number) {
    // Persist to AsyncStorage for recovery
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('last_sync_timestamp', timestamp.toString());
  }
}

export const syncEngine = new SyncEngine();
```

### 4.3 Network Monitor

```typescript
// src/services/offline/NetworkMonitor.ts
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '@/shared/store/offlineStore';
import { syncEngine } from './SyncEngine';

export class NetworkMonitor {
  private unsubscribe: (() => void) | null = null;

  start() {
    this.unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;

      console.log('Network status changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      });

      useOfflineStore.getState().setOnlineStatus(isOnline);

      // Trigger sync when coming online
      if (isOnline) {
        setTimeout(() => {
          syncEngine.sync();
        }, 1000); // Delay to ensure connection is stable
      }
    });
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async getCurrentStatus() {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  }
}

export const networkMonitor = new NetworkMonitor();
```

### 4.4 Pending Operations Queue

```typescript
// src/services/offline/OperationsQueue.ts
import { database } from './database';
import { useAuthStore } from '@/shared/store/authStore';

export class OperationsQueue {
  async addOperation(type: string, entityType: string, entityId: string, payload: any) {
    await database.write(async () => {
      await database.collections.get('pending_operations').create(op => {
        op.operationType = type;
        op.entityType = entityType;
        op.entityId = entityId;
        op.payload = JSON.stringify(payload);
        op.retryCount = 0;
      });
    });
  }

  async processPendingOperations() {
    const operations = await database.collections
      .get('pending_operations')
      .query()
      .fetch();

    for (const op of operations) {
      try {
        await this.executeOperation(op);

        // Remove from queue on success
        await database.write(async () => {
          await op.destroyPermanently();
        });

      } catch (error) {
        console.error('Failed to execute operation:', error);

        // Increment retry count
        await database.write(async () => {
          await op.update(record => {
            record.retryCount++;
          });
        });

        // Remove if max retries exceeded
        if (op.retryCount >= 5) {
          await database.write(async () => {
            await op.destroyPermanently();
          });
        }
      }
    }
  }

  private async executeOperation(op: any) {
    const token = useAuthStore.getState().token;
    const payload = JSON.parse(op.payload);

    const response = await fetch('/api/operations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: op.operationType,
        entityType: op.entityType,
        entityId: op.entityId,
        payload
      })
    });

    if (!response.ok) {
      throw new Error('Operation failed');
    }

    return response.json();
  }
}

export const operationsQueue = new OperationsQueue();
```

---

## 5. Security Implementation

### 5.1 Biometric Authentication

```bash
npm install react-native-biometrics
npm install @react-native-keychain/react-native-keychain
```

```typescript
// src/services/biometrics/BiometricService.ts
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';

class BiometricService {
  private rnBiometrics = new ReactNativeBiometrics();

  async isBiometricAvailable(): Promise<{ available: boolean; biometryType: string }> {
    const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();

    return {
      available,
      biometryType: biometryType === BiometryTypes.TouchID
        ? 'TouchID'
        : biometryType === BiometryTypes.FaceID
          ? 'FaceID'
          : 'Biometrics'
    };
  }

  async authenticate(promptMessage: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel'
      });

      return success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  async storeCredentials(token: string): Promise<void> {
    try {
      await Keychain.setGenericPassword('auth_token', token, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: 'com.aideepref.auth'
      });
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw error;
    }
  }

  async retrieveCredentials(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'com.aideepref.auth'
      });

      if (credentials) {
        return credentials.password;
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  async deleteCredentials(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: 'com.aideepref.auth'
      });
    } catch (error) {
      console.error('Failed to delete credentials:', error);
    }
  }

  async loginWithBiometric(): Promise<string | null> {
    const authenticated = await this.authenticate('Login with biometrics');

    if (authenticated) {
      return await this.retrieveCredentials();
    }

    return null;
  }
}

export const biometricService = new BiometricService();
```

### 5.2 Client-Side Encryption

```bash
npm install crypto-js
npm install @react-native-community/aes-crypto
```

```typescript
// src/services/encryption/EncryptionService.ts
import CryptoJS from 'crypto-js';
import Aes from '@react-native-community/aes-crypto';
import * as Keychain from 'react-native-keychain';

class EncryptionService {
  private encryptionKey: string | null = null;

  /**
   * Initialize encryption key
   * Key is derived from user password + device ID (never sent to server)
   */
  async initializeKey(userPassword: string, deviceId: string): Promise<void> {
    // Derive key using PBKDF2
    const key = CryptoJS.PBKDF2(userPassword, deviceId, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();

    this.encryptionKey = key;

    // Store in secure keychain
    await Keychain.setGenericPassword('encryption_key', key, {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      service: 'com.aideepref.encryption'
    });
  }

  async loadKey(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'com.aideepref.encryption'
      });

      if (credentials) {
        this.encryptionKey = credentials.password;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to load encryption key:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive data before storing locally
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(16).toString();

    // Encrypt using AES-256-CBC
    const encrypted = await Aes.encrypt(
      plaintext,
      this.encryptionKey,
      iv,
      'aes-256-cbc'
    );

    // Return IV + encrypted data
    return `${iv}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(ciphertext: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const [iv, encrypted] = ciphertext.split(':');

    const decrypted = await Aes.decrypt(
      encrypted,
      this.encryptionKey,
      iv,
      'aes-256-cbc'
    );

    return decrypted;
  }

  /**
   * Hash data for verification (one-way)
   */
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Secure random string generation
   */
  generateRandomString(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }
}

export const encryptionService = new EncryptionService();
```

### 5.3 Secure API Communication

```typescript
// src/services/api/SecureApiClient.ts
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/shared/store/authStore';
import { encryptionService } from '../encryption/EncryptionService';

class SecureApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = useAuthStore.getState().token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = encryptionService.generateRandomString(16);

        // Encrypt sensitive payloads
        if (config.data && config.data.sensitive) {
          const encrypted = await encryptionService.encrypt(
            JSON.stringify(config.data.sensitive)
          );
          config.data.encrypted = encrypted;
          delete config.data.sensitive;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 - refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await useAuthStore.getState().refreshToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout
            await useAuthStore.getState().logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new SecureApiClient();
```

### 5.4 Certificate Pinning

```typescript
// src/services/security/CertificatePinning.ts
// iOS: Configure in Info.plist
// Android: Configure in network_security_config.xml

// network_security_config.xml
/*
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">api.aideepref.com</domain>
    <pin-set expiration="2026-12-31">
      <pin digest="SHA-256">base64_encoded_pin_1</pin>
      <pin digest="SHA-256">base64_encoded_pin_2</pin>
    </pin-set>
  </domain-config>
</network-security-config>
*/
```

---

## 6. Performance Optimization

### 6.1 Code Splitting & Lazy Loading

```typescript
// src/navigation/LazyScreens.tsx
import React, { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

const LoadingFallback = () => (
  <ActivityIndicator size="large" style={{ flex: 1 }} />
);

// Lazy load heavy screens
export const DashboardScreen = lazy(() => import('../features/dashboard/screens/DashboardScreen'));
export const JobsScreen = lazy(() => import('../features/jobs/screens/JobsScreen'));
export const ProfileScreen = lazy(() => import('../features/profile/screens/ProfileScreen'));

export const withSuspense = (Component: React.ComponentType) => {
  return (props: any) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
};
```

### 6.2 Image Optimization

```typescript
// src/shared/components/OptimizedImage.tsx
import React from 'react';
import FastImage from 'react-native-fast-image';

interface OptimizedImageProps {
  source: { uri: string };
  style?: any;
  priority?: 'low' | 'normal' | 'high';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  priority = 'normal'
}) => {
  return (
    <FastImage
      source={source}
      style={style}
      priority={
        priority === 'high'
          ? FastImage.priority.high
          : FastImage.priority.normal
      }
      resizeMode={FastImage.resizeMode.cover}
    />
  );
};
```

### 6.3 List Performance

```typescript
// src/features/jobs/components/JobsList.tsx
import React, { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { JobCard } from './JobCard';

export const JobsList = ({ jobs }) => {
  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(({ item }) => (
    <JobCard job={item} />
  ), []);

  const getItemLayout = useCallback((data, index) => ({
    length: 120, // Fixed height
    offset: 120 * index,
    index,
  }), []);

  return (
    <FlatList
      data={jobs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
    />
  );
};
```

### 6.4 Hermes Engine

```javascript
// android/app/build.gradle
project.ext.react = [
    enableHermes: true,  // Enable Hermes engine
]

// Benefits:
// - 50% faster app startup
// - 40% smaller app size
// - Reduced memory usage
```

---

## 7. Deployment Strategy

### 7.1 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'mobile/**'
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd mobile
          npm ci

      - name: Run tests
        run: |
          cd mobile
          npm test -- --coverage

      - name: Lint
        run: |
          cd mobile
          npm run lint

  build-ios:
    needs: test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd mobile/apps/seeker
          npm ci
          cd ios
          pod install

      - name: Build iOS
        run: |
          cd mobile/apps/seeker/ios
          xcodebuild -workspace AiDeepRef.xcworkspace \
            -scheme AiDeepRef \
            -configuration Release \
            -archivePath AiDeepRef.xcarchive \
            archive

      - name: Upload to TestFlight
        if: github.ref == 'refs/heads/main'
        run: |
          # Upload to TestFlight

  build-android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd mobile/apps/seeker
          npm ci

      - name: Build Android
        run: |
          cd mobile/apps/seeker/android
          ./gradlew assembleRelease

      - name: Upload to Play Store
        if: github.ref == 'refs/heads/main'
        run: |
          # Upload to Play Store
```

### 7.2 Over-the-Air Updates (CodePush)

```bash
npm install react-native-code-push
```

```typescript
// src/app/App.tsx
import CodePush from 'react-native-code-push';

const codePushOptions = {
  checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME,
  installMode: CodePush.InstallMode.ON_NEXT_RESUME,
  mandatoryInstallMode: CodePush.InstallMode.IMMEDIATE,
};

const App = () => {
  // App code
};

export default CodePush(codePushOptions)(App);
```

### 7.3 App Store Optimization

**iOS App Store:**
```
App Name: AiDeepRef - Job References
Subtitle: AI-Powered Reference Verification
Keywords: jobs, references, AI, verification, career, recruitment
```

**Google Play Store:**
```
App Name: AiDeepRef - Job References
Short Description: Get verified references with AI-powered insights
Full Description: [Detailed description with keywords]
```

---

## 8. Migration Path

### Phase 1: Foundation (Weeks 1-2)
- [x] Setup React Native monorepo
- [x] Configure development environment
- [x] Setup state management (Zustand + TanStack Query)
- [x] Configure navigation (React Navigation)
- [x] Setup WatermelonDB
- [x] Implement authentication screens

### Phase 2: Core Features (Weeks 3-4)
- [ ] Implement job seeker features
- [ ] Implement employer features
- [ ] Build offline sync engine
- [ ] Integrate WebSocket for real-time
- [ ] Add biometric authentication

### Phase 3: PWA (Week 5)
- [ ] Setup service worker
- [ ] Implement media recording
- [ ] Add offline video upload
- [ ] Configure install prompt

### Phase 4: Testing & Optimization (Weeks 6-7)
- [ ] Write unit tests (Jest)
- [ ] Write E2E tests (Detox)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing

### Phase 5: Deployment (Week 8)
- [ ] Setup CI/CD pipeline
- [ ] Configure CodePush
- [ ] Submit to App Store
- [ ] Submit to Play Store
- [ ] Deploy PWA

---

## Appendix: Package Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.76.9",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@nozbe/watermelondb": "^0.28.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "@react-native-community/netinfo": "^12.0.0",
    "react-native-biometrics": "^3.0.0",
    "@react-native-keychain/react-native-keychain": "^9.0.0",
    "crypto-js": "^4.2.0",
    "@react-native-community/aes-crypto": "^2.1.0",
    "axios": "^1.7.0",
    "react-native-fast-image": "^8.6.0",
    "react-native-code-push": "^8.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.76.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.0.0",
    "detox": "^20.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## Sources & References

### React Native
- [React Native 0.76 - New Architecture by default](https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture)
- [React Native New Architecture: Key Performance Boosts](https://blog.swmansion.com/react-native-new-architecture-key-performance-boosts-4ce68cc3cc9f)

### Flutter Comparison
- [Flutter vs React Native: Complete 2025 Framework Comparison](https://www.thedroidsonroids.com/blog/flutter-vs-react-native-comparison)
- [Flutter vs. React Native in 2025: Benchmarking Performance](https://www.tirnav.com/blog/google-flutter-vs-react-native-comparison)

### Offline-First Architecture
- [Offline-First Mobile App Architecture: Syncing, Caching, and Conflict Resolution](https://dev.to/odunayo_dada/offline-first-mobile-app-architecture-syncing-caching-and-conflict-resolution-518n)
- [Advanced React Native in 2025: Building Completely Offline-Ready Apps](https://medium.com/@theNewGenCoder/advanced-react-native-in-2025-building-completely-offline-ready-apps-with-seamless-sync-and-32b0569711d5)
- [Build an offline-first app | Android Developers](https://developer.android.com/topic/architecture/data-layer/offline-first)

### PWA & Service Workers
- [Best practices for PWAs - Microsoft Edge Developer documentation](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/best-practices)
- [Offline and background operation - Progressive web apps | MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [MediaStream Recording API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)

### Azure Integration
- [react-native-azure-mobile-apps-client](https://github.com/ShadowMinhja/react-native-azure-mobile-apps-client)
- [React Native and Microsoft Azure: Cloud Integration](https://clouddevs.com/react-native/cloud-integration-in-mobile-apps/)

---

**Document Status**: Complete and Ready for Implementation
**Next Review**: After Phase 1 completion
**Maintained By**: Mobile Team Lead
**Last Updated**: November 23, 2025
