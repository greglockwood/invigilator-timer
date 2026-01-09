/**
 * MMKV-based cache for fast UI state persistence.
 * Used for storing last active session, UI preferences, etc.
 *
 * NOTE: This is in the mobile app (not packages/data) because MMKV
 * is a React Native native module and must be imported from the app's node_modules.
 */

import { MMKV } from 'react-native-mmkv';

/**
 * Lazy-initialized storage instance.
 * MMKV requires the native bridge to be ready, so we can't initialize at module load time.
 */
let storage: MMKV | null = null;

function getStorage(): MMKV {
  if (!storage) {
    storage = new MMKV({
      id: 'invigilator-timer-cache',
    });
  }
  return storage;
}

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
  const value = getStorage().getString(KEYS.LAST_ACTIVE_SESSION_ID);
  return value ?? null;
}

/**
 * Set the last active session ID.
 */
export function setLastActiveSessionId(sessionId: string): void {
  getStorage().set(KEYS.LAST_ACTIVE_SESSION_ID, sessionId);
}

/**
 * Clear the last active session ID.
 */
export function clearLastActiveSessionId(): void {
  getStorage().delete(KEYS.LAST_ACTIVE_SESSION_ID);
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
  const value = getStorage().getString(key);

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
  getStorage().set(key, JSON.stringify(state));
}

/**
 * Clear cached timer state for a session.
 */
export function clearCachedTimerState(sessionId: string): void {
  const key = `${KEYS.TIMER_STATE_PREFIX}${sessionId}`;
  getStorage().delete(key);
}

/**
 * Clear all cache data.
 */
export function clearAllCache(): void {
  getStorage().clearAll();
}
