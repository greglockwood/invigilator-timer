/**
 * @invigilator-timer/data
 *
 * Persistence layer for the Invigilator Timer app.
 * SQLite for authoritative storage.
 *
 * NOTE: MMKV cache functions are in apps/mobile/src/services/cache.ts
 * because MMKV is a React Native native module.
 */

export * from './database';
export type { CachedTimerState } from './cache';
