/**
 * Demo session seed for testing the app.
 * Creates a sample exam session that starts in a few minutes with 5 desks.
 */

import { createSession } from '@invigilator-timer/core';

export function createDemoSession() {
  // Create a session that starts in 2 minutes from now
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() + 2);

  const session = createSession(
    'Demo: Year 12 Maths',
    5, // 5 minute exam for quick testing
    1, // 1 minute reading time
    startTime.getTime(),
    5  // 5 desks
  );

  // Add sample student names
  session.desks[0].studentName = 'Alice Wong';
  session.desks[1].studentName = 'Ben Smith';
  session.desks[2].studentName = 'Charlie Brown';
  session.desks[3].studentName = 'Diana Prince';
  session.desks[4].studentName = 'Ethan Hunt';

  return session;
}

export function createRealisticDemoSession() {
  // Create a session that starts in 5 minutes with realistic timings
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() + 5);

  const session = createSession(
    'Year 12 Mathematics',
    90,  // 90 minute exam
    10,  // 10 minute reading time
    startTime.getTime(),
    8    // 8 desks
  );

  // Add sample student names
  const studentNames = [
    'Alice Wong',
    'Ben Smith',
    'Charlie Brown',
    'Diana Prince',
    'Ethan Hunt',
    'Fiona Green',
    'George Wilson',
    'Hannah Lee',
  ];

  session.desks.forEach((desk, index) => {
    desk.studentName = studentNames[index];
  });

  return session;
}
