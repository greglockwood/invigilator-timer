/**
 * Core domain types for the Invigilator Timer app.
 * Based on design-doc.md Section 4: Data Model (Amended)
 */

/**
 * Timer event types representing key activation points and state changes.
 * Each event must be persisted for audit trail compliance.
 */
export type TimerEventType =
  | 'exam_start'      // Activation of exam start (begins reading time or exam time)
  | 'reading_start'   // Reading time begins
  | 'exam_active'     // General exam time begins (after reading time ends)
  | 'dp_applied'      // D.P. time applied to a specific desk
  | 'pause'           // All timers paused
  | 'resume'          // All timers resumed
  | 'finish';         // Desk or exam completed

/**
 * Individual timer event record.
 * Timestamps are epoch milliseconds (wall-clock time) for audit purposes.
 */
export interface TimerEvent {
  type: TimerEventType;
  timestamp: number;        // Epoch milliseconds (wall-clock)
  valueMinutes?: number;    // For dp_applied: minutes added; for others: optional metadata
}

/**
 * Desk represents a physical exam desk with optional student assignment.
 * Desk-centric model: desk is primary, student name is optional metadata.
 */
export interface Desk {
  id: string;
  deskNumber: number;
  studentName?: string;
  dpTimeTakenMinutes: number;           // Cumulative D.P. time taken (incremental across multiple entries)
  adjustedFinishEpochMs: number;        // Computed finish time including D.P.
  events: TimerEvent[];                  // Audit trail of all events for this desk
}

/**
 * Session represents a single exam session with all desks and timing configuration.
 */
export interface Session {
  id: string;
  name: string;
  examDurationMinutes: number;
  readingTimeMinutes: number;
  startTimeEpochMs: number;             // Exam start time (wall-clock)
  desks: Desk[];
}

/**
 * Timer phase enum representing the four distinct phases of exam execution.
 * Phase transitions are activation-driven per design doc.
 */
export enum TimerPhase {
  PreExam = 'pre_exam',                 // Phase 1: Setup, no countdowns active
  ReadingTime = 'reading_time',         // Phase 2: Reading countdown active
  ExamActive = 'exam_active',           // Phase 3: General exam countdown active
  DPAdjustments = 'dp_adjustments',     // Phase 4: Individual D.P. adjustments (can overlap with Phase 3)
}

/**
 * Runtime timer state (not persisted, computed from Session + monotonic time).
 * Used by UI to display current countdown values.
 */
export interface TimerState {
  phase: TimerPhase;
  isPaused: boolean;
  monotonicStartMs: number;             // performance.now() at exam activation (monotonic time)
  pausedAtMonotonicMs?: number;         // If paused, monotonic time when pause occurred
  pausedDurationMs: number;             // Total accumulated pause time
}
