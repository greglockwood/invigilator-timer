/**
 * Utility functions for time formatting and validation.
 */

/**
 * Format epoch milliseconds to time string (HH:MM AM/PM format).
 * Used for displaying finish times in Australian English format.
 */
export function formatTimeAMPM(epochMs: number): string {
  const date = new Date(epochMs);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours || 12; // 0 should be 12

  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Format milliseconds to countdown string (H:MM:SS or MM:SS).
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;

  if (hours > 0) {
    return `${hours}:${minutesStr}:${secondsStr}`;
  }

  return `${minutesStr}:${secondsStr}`;
}

/**
 * Generate a unique ID (simple timestamp-based for now).
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new desk with default values.
 */
export function createDesk(deskNumber: number, studentName?: string): import('./types').Desk {
  return {
    id: generateId(),
    deskNumber,
    studentName,
    dpTimeTakenMinutes: 0,
    adjustedFinishEpochMs: 0,
    events: [],
  };
}

/**
 * Create a new session with default values.
 */
export function createSession(
  name: string,
  examDurationMinutes: number,
  readingTimeMinutes: number,
  startTimeEpochMs: number,
  deskCount: number,
): import('./types').Session {
  const desks = Array.from({ length: deskCount }, (_, i) => createDesk(i + 1));

  return {
    id: generateId(),
    name,
    examDurationMinutes,
    readingTimeMinutes,
    startTimeEpochMs,
    desks,
  };
}

/**
 * Determine colour cue based on remaining time.
 * Per design doc: Green >30 min, Amber 10-30 min, Red <10 min
 */
export type ColourCue = 'green' | 'amber' | 'red';

export function getColourCue(remainingMs: number): ColourCue {
  const remainingMinutes = remainingMs / (60 * 1000);

  if (remainingMinutes > 30) {
    return 'green';
  } else if (remainingMinutes >= 10) {
    return 'amber';
  } else {
    return 'red';
  }
}

/**
 * Check if a desk has finished (remaining time <= 0).
 */
export function isDeskFinished(remainingMs: number): boolean {
  return remainingMs <= 0;
}
