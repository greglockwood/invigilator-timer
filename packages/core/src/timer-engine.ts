/**
 * Timer engine implementing monotonic countdown logic.
 * Uses performance.now() (monotonic) for countdown calculations.
 * Wall-clock times (Date.now()) used only for display/audit.
 */

import { Session, Desk, TimerState, TimerPhase, TimerEvent } from './types';

/**
 * Calculate remaining time in milliseconds for the general exam.
 * Uses monotonic time to avoid issues with system clock changes.
 *
 * Formula: remaining = baseExamMs - (currentMonotonic - startMonotonic - pausedDuration)
 */
export function calculateGeneralRemainingMs(
  session: Session,
  timerState: TimerState,
  currentMonotonicMs: number,
): number {
  if (timerState.phase === 'pre_exam') {
    return session.examDurationMinutes * 60 * 1000;
  }

  const elapsedMonotonicMs = timerState.isPaused
    ? (timerState.pausedAtMonotonicMs ?? currentMonotonicMs) - timerState.monotonicStartMs
    : currentMonotonicMs - timerState.monotonicStartMs;

  const adjustedElapsedMs = elapsedMonotonicMs - timerState.pausedDurationMs;

  const baseExamMs = session.examDurationMinutes * 60 * 1000;
  const remainingMs = baseExamMs - adjustedElapsedMs;

  return Math.max(0, remainingMs);
}

/**
 * Calculate remaining time in milliseconds for reading time.
 */
export function calculateReadingRemainingMs(
  session: Session,
  timerState: TimerState,
  currentMonotonicMs: number,
): number {
  if (timerState.phase !== 'reading_time') {
    return 0;
  }

  const elapsedMonotonicMs = timerState.isPaused
    ? (timerState.pausedAtMonotonicMs ?? currentMonotonicMs) - timerState.monotonicStartMs
    : currentMonotonicMs - timerState.monotonicStartMs;

  const adjustedElapsedMs = elapsedMonotonicMs - timerState.pausedDurationMs;

  const readingTimeMs = session.readingTimeMinutes * 60 * 1000;
  const remainingMs = readingTimeMs - adjustedElapsedMs;

  return Math.max(0, remainingMs);
}

/**
 * Calculate adjusted remaining time for a specific desk including D.P. time.
 *
 * Formula: remaining = baseExamMs + totalDpMs - elapsedMs
 */
export function calculateDeskRemainingMs(
  session: Session,
  desk: Desk,
  timerState: TimerState,
  currentMonotonicMs: number,
): number {
  if (timerState.phase === 'pre_exam' || timerState.phase === 'reading_time') {
    return (session.examDurationMinutes + desk.dpTimeTakenMinutes) * 60 * 1000;
  }

  const elapsedMonotonicMs = timerState.isPaused
    ? (timerState.pausedAtMonotonicMs ?? currentMonotonicMs) - timerState.monotonicStartMs
    : currentMonotonicMs - timerState.monotonicStartMs;

  const adjustedElapsedMs = elapsedMonotonicMs - timerState.pausedDurationMs;

  const baseExamMs = session.examDurationMinutes * 60 * 1000;
  const totalDpMs = desk.dpTimeTakenMinutes * 60 * 1000;
  const remainingMs = baseExamMs + totalDpMs - adjustedElapsedMs;

  return Math.max(0, remainingMs);
}

/**
 * Calculate the adjusted finish time (epoch ms) for a desk.
 * This is wall-clock time for display purposes.
 */
export function calculateDeskAdjustedFinishEpochMs(
  session: Session,
  desk: Desk,
  timerState: TimerState,
): number {
  const totalDurationMs = (session.examDurationMinutes + desk.dpTimeTakenMinutes) * 60 * 1000;
  const readingTimeMs = session.readingTimeMinutes * 60 * 1000;

  // Finish time = start time + reading time + exam duration + D.P. time
  return session.startTimeEpochMs + readingTimeMs + totalDurationMs;
}

/**
 * Calculate the general exam finish time (epoch ms) without D.P.
 */
export function calculateGeneralFinishEpochMs(
  session: Session,
): number {
  const examDurationMs = session.examDurationMinutes * 60 * 1000;
  const readingTimeMs = session.readingTimeMinutes * 60 * 1000;

  return session.startTimeEpochMs + readingTimeMs + examDurationMs;
}

/**
 * Sort desks by adjusted finish time (earliest first), then by desk number.
 * Per design doc Section 6: Sorting Rules
 */
export function sortDesks(
  session: Session,
  timerState: TimerState,
): Desk[] {
  return [...session.desks].sort((a, b) => {
    const aFinish = calculateDeskAdjustedFinishEpochMs(session, a, timerState);
    const bFinish = calculateDeskAdjustedFinishEpochMs(session, b, timerState);

    if (aFinish !== bFinish) {
      return aFinish - bFinish;
    }

    return a.deskNumber - b.deskNumber;
  });
}

/**
 * Apply D.P. time to a desk (activation action).
 * Returns updated desk with new event recorded and dpTimeTakenMinutes incremented.
 *
 * IMPORTANT: After activation, the UI input should reset to zero (handled in UI layer).
 */
export function applyDPTime(
  desk: Desk,
  dpMinutesToAdd: number,
  currentEpochMs: number,
): Desk {
  const newEvent: TimerEvent = {
    type: 'dp_applied',
    timestamp: currentEpochMs,
    valueMinutes: dpMinutesToAdd,
  };

  return {
    ...desk,
    dpTimeTakenMinutes: desk.dpTimeTakenMinutes + dpMinutesToAdd,
    events: [...desk.events, newEvent],
  };
}

/**
 * Activate exam start (Phase 1 → Phase 2 or Phase 3).
 * Records exam_start event and transitions to ReadingTime or ExamActive phase.
 */
export function activateExamStart(
  session: Session,
  currentEpochMs: number,
  currentMonotonicMs: number,
): { session: Session; timerState: TimerState } {
  const hasReadingTime = session.readingTimeMinutes > 0;

  const startEvent: TimerEvent = {
    type: hasReadingTime ? 'reading_start' : 'exam_active',
    timestamp: currentEpochMs,
  };

  // Add start event to all desks for audit trail
  const updatedDesks = session.desks.map(desk => ({
    ...desk,
    events: [...desk.events, startEvent],
  }));

  const updatedSession: Session = {
    ...session,
    desks: updatedDesks,
  };

  const timerState: TimerState = {
    phase: hasReadingTime ? 'reading_time' : 'exam_active',
    isPaused: false,
    monotonicStartMs: currentMonotonicMs,
    pausedDurationMs: 0,
  };

  return { session: updatedSession, timerState };
}

/**
 * Transition from ReadingTime to ExamActive phase.
 * Called automatically when reading time expires.
 */
export function transitionToExamActive(
  session: Session,
  timerState: TimerState,
  currentEpochMs: number,
  currentMonotonicMs: number,
): { session: Session; timerState: TimerState } {
  const examActiveEvent: TimerEvent = {
    type: 'exam_active',
    timestamp: currentEpochMs,
  };

  const updatedDesks = session.desks.map(desk => ({
    ...desk,
    events: [...desk.events, examActiveEvent],
  }));

  const updatedSession: Session = {
    ...session,
    desks: updatedDesks,
  };

  // Reset monotonic start to current time for exam phase
  const updatedTimerState: TimerState = {
    ...timerState,
    phase: 'exam_active',
    monotonicStartMs: currentMonotonicMs,
    pausedDurationMs: 0,
  };

  return { session: updatedSession, timerState: updatedTimerState };
}

/**
 * Pause all timers.
 */
export function pauseTimers(
  session: Session,
  timerState: TimerState,
  currentEpochMs: number,
  currentMonotonicMs: number,
): { session: Session; timerState: TimerState } {
  if (timerState.isPaused) {
    return { session, timerState };
  }

  const pauseEvent: TimerEvent = {
    type: 'pause',
    timestamp: currentEpochMs,
  };

  const updatedDesks = session.desks.map(desk => ({
    ...desk,
    events: [...desk.events, pauseEvent],
  }));

  const updatedSession: Session = {
    ...session,
    desks: updatedDesks,
  };

  const updatedTimerState: TimerState = {
    ...timerState,
    isPaused: true,
    pausedAtMonotonicMs: currentMonotonicMs,
  };

  return { session: updatedSession, timerState: updatedTimerState };
}

/**
 * Resume all timers.
 */
export function resumeTimers(
  session: Session,
  timerState: TimerState,
  currentEpochMs: number,
  currentMonotonicMs: number,
): { session: Session; timerState: TimerState } {
  if (!timerState.isPaused || !timerState.pausedAtMonotonicMs) {
    return { session, timerState };
  }

  const resumeEvent: TimerEvent = {
    type: 'resume',
    timestamp: currentEpochMs,
  };

  const updatedDesks = session.desks.map(desk => ({
    ...desk,
    events: [...desk.events, resumeEvent],
  }));

  const updatedSession: Session = {
    ...session,
    desks: updatedDesks,
  };

  // Accumulate paused duration
  const pauseDuration = currentMonotonicMs - timerState.pausedAtMonotonicMs;

  const updatedTimerState: TimerState = {
    ...timerState,
    isPaused: false,
    pausedAtMonotonicMs: undefined,
    pausedDurationMs: timerState.pausedDurationMs + pauseDuration,
  };

  return { session: updatedSession, timerState: updatedTimerState };
}
