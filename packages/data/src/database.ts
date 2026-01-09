/**
 * SQLite database layer for persisting sessions, desks, and timer events.
 * SQLite is the authoritative record per design doc.
 */

import * as SQLite from 'expo-sqlite';
import { Session, Desk, TimerEvent } from '@invigilator-timer/core';

const DB_NAME = 'invigilator_timer.db';

/**
 * Initialize the database and create tables if they don't exist.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Create sessions table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      exam_duration_minutes INTEGER NOT NULL,
      reading_time_minutes INTEGER NOT NULL,
      start_time_epoch_ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Create desks table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS desks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      desk_number INTEGER NOT NULL,
      student_name TEXT,
      dp_time_taken_minutes INTEGER NOT NULL DEFAULT 0,
      adjusted_finish_epoch_ms INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  // Create timer_events table (audit trail)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS timer_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desk_id TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      value_minutes INTEGER,
      FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE CASCADE
    );
  `);

  // Create indices for performance
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_desks_session_id ON desks(session_id);
    CREATE INDEX IF NOT EXISTS idx_timer_events_desk_id ON timer_events(desk_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
  `);

  return db;
}

/**
 * Save a session to the database.
 * Inserts or updates session, desks, and events atomically.
 */
export async function saveSession(db: SQLite.SQLiteDatabase, session: Session): Promise<void> {
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    // Upsert session
    await db.runAsync(
      `INSERT INTO sessions (id, name, exam_duration_minutes, reading_time_minutes, start_time_epoch_ms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         exam_duration_minutes = excluded.exam_duration_minutes,
         reading_time_minutes = excluded.reading_time_minutes,
         start_time_epoch_ms = excluded.start_time_epoch_ms,
         updated_at = excluded.updated_at`,
      [
        session.id,
        session.name,
        session.examDurationMinutes,
        session.readingTimeMinutes,
        session.startTimeEpochMs,
        now,
        now,
      ]
    );

    // Delete existing desks and events for this session (cascade will handle events)
    await db.runAsync('DELETE FROM desks WHERE session_id = ?', [session.id]);

    // Insert desks
    for (const desk of session.desks) {
      await db.runAsync(
        `INSERT INTO desks (id, session_id, desk_number, student_name, dp_time_taken_minutes, adjusted_finish_epoch_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          desk.id,
          session.id,
          desk.deskNumber,
          desk.studentName ?? null,
          desk.dpTimeTakenMinutes,
          desk.adjustedFinishEpochMs,
        ]
      );

      // Insert events for this desk
      for (const event of desk.events) {
        await db.runAsync(
          `INSERT INTO timer_events (desk_id, type, timestamp, value_minutes)
           VALUES (?, ?, ?, ?)`,
          [desk.id, event.type, event.timestamp, event.valueMinutes ?? null]
        );
      }
    }
  });
}

/**
 * Load a session by ID from the database.
 */
export async function loadSession(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<Session | null> {
  const sessionRow = await db.getFirstAsync<{
    id: string;
    name: string;
    exam_duration_minutes: number;
    reading_time_minutes: number;
    start_time_epoch_ms: number;
  }>('SELECT * FROM sessions WHERE id = ?', [sessionId]);

  if (!sessionRow) {
    return null;
  }

  const deskRows = await db.getAllAsync<{
    id: string;
    desk_number: number;
    student_name: string | null;
    dp_time_taken_minutes: number;
    adjusted_finish_epoch_ms: number;
  }>('SELECT * FROM desks WHERE session_id = ? ORDER BY desk_number ASC', [sessionId]);

  const desks: Desk[] = [];

  for (const deskRow of deskRows) {
    const eventRows = await db.getAllAsync<{
      type: string;
      timestamp: number;
      value_minutes: number | null;
    }>('SELECT type, timestamp, value_minutes FROM timer_events WHERE desk_id = ? ORDER BY timestamp ASC', [
      deskRow.id,
    ]);

    const events: TimerEvent[] = eventRows.map(row => ({
      type: row.type as TimerEvent['type'],
      timestamp: row.timestamp,
      valueMinutes: row.value_minutes ?? undefined,
    }));

    desks.push({
      id: deskRow.id,
      deskNumber: deskRow.desk_number,
      studentName: deskRow.student_name ?? undefined,
      dpTimeTakenMinutes: deskRow.dp_time_taken_minutes,
      adjustedFinishEpochMs: deskRow.adjusted_finish_epoch_ms,
      events,
    });
  }

  return {
    id: sessionRow.id,
    name: sessionRow.name,
    examDurationMinutes: sessionRow.exam_duration_minutes,
    readingTimeMinutes: sessionRow.reading_time_minutes,
    startTimeEpochMs: sessionRow.start_time_epoch_ms,
    desks,
  };
}

/**
 * List all sessions ordered by creation date (newest first).
 */
export async function listSessions(db: SQLite.SQLiteDatabase): Promise<Array<{
  id: string;
  name: string;
  examDurationMinutes: number;
  startTimeEpochMs: number;
  createdAt: number;
}>> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    exam_duration_minutes: number;
    start_time_epoch_ms: number;
    created_at: number;
  }>('SELECT id, name, exam_duration_minutes, start_time_epoch_ms, created_at FROM sessions ORDER BY created_at DESC');

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    examDurationMinutes: row.exam_duration_minutes,
    startTimeEpochMs: row.start_time_epoch_ms,
    createdAt: row.created_at,
  }));
}

/**
 * Delete a session and all associated desks/events.
 */
export async function deleteSession(db: SQLite.SQLiteDatabase, sessionId: string): Promise<void> {
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
}
