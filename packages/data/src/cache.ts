/**
 * MMKV-based cache for fast UI state persistence.
 * Used for storing last active session, UI preferences, etc.
 */

import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({
  id: 'invigilator-timer-cache',
});

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
  const value = storage.getString(KEYS.LAST_ACTIVE_SESSION_ID);
  return value ?? null;
}

/**
 * Set the last active session ID.
 */
export function setLastActiveSessionId(sessionId: string): void {
  storage.set(KEYS.LAST_ACTIVE_SESSION_ID, sessionId);
}

/**
 * Clear the last active session ID.
 */
export function clearLastActiveSessionId(): void {
  storage.delete(KEYS.LAST_ACTIVE_SESSION_ID);
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
  const value = storage.getString(key);

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
  storage.set(key, JSON.stringify(state));
}

/**
 * Clear cached timer state for a session.
 */
export function clearCachedTimerState(sessionId: string): void {
  const key = `${KEYS.TIMER_STATE_PREFIX}${sessionId}`;
  storage.delete(key);
}

/**
 * Clear all cache data.
 */
export function clearAllCache(): void {
  storage.clearAll();
}
