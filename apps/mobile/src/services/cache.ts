/**
 * In-memory cache for fast UI state persistence.
 * Used for storing last active session, UI preferences, etc.
 *
 * TODO: Replace with MMKV for production
 * MMKV provides lightning-fast synchronous API that beats AsyncStorage,
 * but currently has module resolution issues in the monorepo setup.
 * Once Metro bundler is properly configured or we migrate to a simpler
 * project structure, we should replace this with react-native-mmkv.
 *
 * For now, using simple in-memory storage (data lost on app restart,
 * which is acceptable for cache).
 */

/**
 * Simple in-memory storage.
 */
const memoryStorage: Record<string, string> = {};

/**
 * Cache keys
 */
const KEYS = {
  LAST_ACTIVE_SESSION_ID: 'last_active_session_id',
  TIMER_STATE_PREFIX: 'timer_state_',
} as const;

/**
 * Get the last active session ID.
 */
export function getLastActiveSessionId(): string | null {
  return memoryStorage[KEYS.LAST_ACTIVE_SESSION_ID] ?? null;
}

/**
 * Set the last active session ID.
 */
export function setLastActiveSessionId(sessionId: string): void {
  memoryStorage[KEYS.LAST_ACTIVE_SESSION_ID] = sessionId;
}

/**
 * Clear the last active session ID.
 */
export function clearLastActiveSessionId(): void {
  delete memoryStorage[KEYS.LAST_ACTIVE_SESSION_ID];
}

/**
 * Timer state stored in cache (for app restart recovery).
 */
export interface CachedTimerState {
  phase: string;
  isPaused: boolean;
  monotonicStartMs: number;
  pausedAtMonotonicMs?: number;
  pausedDurationMs: number;
  wallClockSaveTime: number; // When this state was saved (for drift detection)
}

/**
 * Get cached timer state for a session.
 */
export function getCachedTimerState(sessionId: string): CachedTimerState | null {
  const key = `${KEYS.TIMER_STATE_PREFIX}${sessionId}`;
  const value = memoryStorage[key];

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as CachedTimerState;
  } catch {
    return null;
  }
}

/**
 * Save timer state to cache.
 */
export function setCachedTimerState(sessionId: string, state: CachedTimerState): void {
  const key = `${KEYS.TIMER_STATE_PREFIX}${sessionId}`;
  memoryStorage[key] = JSON.stringify(state);
}

/**
 * Clear cached timer state for a session.
 */
export function clearCachedTimerState(sessionId: string): void {
  const key = `${KEYS.TIMER_STATE_PREFIX}${sessionId}`;
  delete memoryStorage[key];
}

/**
 * Clear all cache data.
 */
export function clearAllCache(): void {
  Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
}
