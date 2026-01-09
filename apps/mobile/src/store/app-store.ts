/**
 * Global application store using Zustand.
 * Manages active session, timer state, and database connection.
 */

import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import {
  Session,
  Desk,
  TimerState,
  TimerPhase,
  applyDPTime,
  activateExamStart,
  transitionToExamActive,
  pauseTimers,
  resumeTimers,
  calculateDeskAdjustedFinishEpochMs,
} from '@invigilator-timer/core';
import {
  initDatabase,
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
} from '@invigilator-timer/data';
import {
  getCachedTimerState,
  setCachedTimerState,
  setLastActiveSessionId,
  clearLastActiveSessionId,
  clearCachedTimerState,
} from '../services/cache';

interface AppState {
  // Database
  db: SQLite.SQLiteDatabase | null;
  isInitialized: boolean;

  // Active session
  activeSession: Session | null;
  timerState: TimerState | null;

  // Session list
  sessionsList: Array<{
    id: string;
    name: string;
    examDurationMinutes: number;
    startTimeEpochMs: number;
    createdAt: number;
  }>;

  // Actions
  initialize: () => Promise<void>;
  createSession: (session: Session) => Promise<void>;
  loadSessionById: (sessionId: string) => Promise<void>;
  refreshSessionsList: () => Promise<void>;
  deleteSessionById: (sessionId: string) => Promise<void>;

  // Timer actions
  activateExam: () => void;
  applyDeskDP: (deskId: string, dpMinutes: number) => void;
  pauseExam: () => void;
  resumeExam: () => void;
  transitionToExam: () => void;

  // Utility
  updateDeskInSession: (deskId: string, updates: Partial<Desk>) => void;
  persistCurrentSession: () => Promise<void>;
  clearActiveSession: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  db: null,
  isInitialized: false,
  activeSession: null,
  timerState: null,
  sessionsList: [],

  /**
   * Initialize database and load cached session if available.
   */
  initialize: async () => {
    try {
      console.log('[Store] Initializing database...');
      const db = await initDatabase();
      console.log('[Store] Database initialized successfully');
      set({ db, isInitialized: true });

      // Refresh sessions list
      await get().refreshSessionsList();
      console.log('[Store] Sessions list refreshed');
    } catch (error) {
      console.error('[Store] Failed to initialize database:', error);
      throw error;
    }
  },

  /**
   * Create a new session and save to database.
   */
  createSession: async (session: Session) => {
    try {
      console.log('[Store] Creating session:', session.name);
      const { db } = get();
      if (!db) {
        console.error('[Store] Database not initialized');
        throw new Error('Database not initialized');
      }

      console.log('[Store] Saving session to database...');
      await saveSession(db, session);
      console.log('[Store] Session saved successfully');

      set({ activeSession: session });
      setLastActiveSessionId(session.id);

      await get().refreshSessionsList();
      console.log('[Store] Session created successfully');
    } catch (error) {
      console.error('[Store] Failed to create session:', error);
      throw error;
    }
  },

  /**
   * Load a session by ID and restore timer state if cached.
   */
  loadSessionById: async (sessionId: string) => {
    const { db } = get();
    if (!db) throw new Error('Database not initialized');

    const session = await loadSession(db, sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Try to restore timer state from cache
    const cachedState = getCachedTimerState(sessionId);
    let timerState: TimerState | null = null;

    if (cachedState) {
      // Restore timer state (monotonic times will need adjustment on first tick)
      timerState = {
        phase: cachedState.phase as TimerPhase,
        isPaused: cachedState.isPaused,
        monotonicStartMs: cachedState.monotonicStartMs,
        pausedAtMonotonicMs: cachedState.pausedAtMonotonicMs,
        pausedDurationMs: cachedState.pausedDurationMs,
      };
    }

    set({ activeSession: session, timerState });
    setLastActiveSessionId(sessionId);
  },

  /**
   * Refresh the sessions list from database.
   */
  refreshSessionsList: async () => {
    const { db } = get();
    if (!db) return;

    const sessions = await listSessions(db);
    set({ sessionsList: sessions });
  },

  /**
   * Delete a session by ID.
   */
  deleteSessionById: async (sessionId: string) => {
    const { db } = get();
    if (!db) throw new Error('Database not initialized');

    await deleteSession(db, sessionId);
    clearCachedTimerState(sessionId);

    // If this was the active session, clear it
    const { activeSession } = get();
    if (activeSession?.id === sessionId) {
      set({ activeSession: null, timerState: null });
      clearLastActiveSessionId();
    }

    await get().refreshSessionsList();
  },

  /**
   * Activate exam start (Phase 1 → Phase 2 or Phase 3).
   */
  activateExam: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const currentEpochMs = Date.now();
    const currentMonotonicMs = performance.now();

    const { session: updatedSession, timerState } = activateExamStart(
      activeSession,
      currentEpochMs,
      currentMonotonicMs
    );

    set({ activeSession: updatedSession, timerState });

    // Persist immediately after activation
    get().persistCurrentSession();
  },

  /**
   * Apply D.P. time to a desk (activation action).
   */
  applyDeskDP: (deskId: string, dpMinutes: number) => {
    const { activeSession, timerState } = get();
    if (!activeSession || !timerState) return;

    const currentEpochMs = Date.now();
    const desk = activeSession.desks.find(d => d.id === deskId);
    if (!desk) return;

    const updatedDesk = applyDPTime(desk, dpMinutes, currentEpochMs);

    // Calculate new adjusted finish time
    updatedDesk.adjustedFinishEpochMs = calculateDeskAdjustedFinishEpochMs(
      activeSession,
      updatedDesk,
      timerState
    );

    const updatedSession: Session = {
      ...activeSession,
      desks: activeSession.desks.map(d => (d.id === deskId ? updatedDesk : d)),
    };

    set({ activeSession: updatedSession });

    // Persist immediately after D.P. application (Excel box 6 reset after activation)
    get().persistCurrentSession();
  },

  /**
   * Pause all timers.
   */
  pauseExam: () => {
    const { activeSession, timerState } = get();
    if (!activeSession || !timerState) return;

    const currentEpochMs = Date.now();
    const currentMonotonicMs = performance.now();

    const { session: updatedSession, timerState: updatedTimerState } = pauseTimers(
      activeSession,
      timerState,
      currentEpochMs,
      currentMonotonicMs
    );

    set({ activeSession: updatedSession, timerState: updatedTimerState });
    get().persistCurrentSession();
  },

  /**
   * Resume all timers.
   */
  resumeExam: () => {
    const { activeSession, timerState } = get();
    if (!activeSession || !timerState) return;

    const currentEpochMs = Date.now();
    const currentMonotonicMs = performance.now();

    const { session: updatedSession, timerState: updatedTimerState } = resumeTimers(
      activeSession,
      timerState,
      currentEpochMs,
      currentMonotonicMs
    );

    set({ activeSession: updatedSession, timerState: updatedTimerState });
    get().persistCurrentSession();
  },

  /**
   * Transition from ReadingTime to ExamActive phase.
   */
  transitionToExam: () => {
    const { activeSession, timerState } = get();
    if (!activeSession || !timerState) return;

    const currentEpochMs = Date.now();
    const currentMonotonicMs = performance.now();

    const { session: updatedSession, timerState: updatedTimerState } = transitionToExamActive(
      activeSession,
      timerState,
      currentEpochMs,
      currentMonotonicMs
    );

    set({ activeSession: updatedSession, timerState: updatedTimerState });
    get().persistCurrentSession();
  },

  /**
   * Update a desk in the active session (utility for UI).
   */
  updateDeskInSession: (deskId: string, updates: Partial<Desk>) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const updatedSession: Session = {
      ...activeSession,
      desks: activeSession.desks.map(d =>
        d.id === deskId ? { ...d, ...updates } : d
      ),
    };

    set({ activeSession: updatedSession });
  },

  /**
   * Persist current session and timer state to database and cache.
   */
  persistCurrentSession: async () => {
    const { db, activeSession, timerState } = get();
    if (!db || !activeSession) return;

    await saveSession(db, activeSession);

    if (timerState) {
      setCachedTimerState(activeSession.id, {
        ...timerState,
        wallClockSaveTime: Date.now(),
      });
    }
  },

  /**
   * Clear the active session.
   */
  clearActiveSession: () => {
    set({ activeSession: null, timerState: null });
    clearLastActiveSessionId();
  },
}));
