/**
 * Platform reliability services for Android exam timing.
 *
 * This module provides interfaces for:
 * - Foreground service (keeps process alive during exam)
 * - Wake locks (prevents device sleep)
 * - Exact alarms (backstop for finish times)
 *
 * IMPLEMENTATION STATUS:
 * - Wake lock: ✅ IMPLEMENTED via expo-keep-awake (used in exam screen)
 * - Foreground service: ⚠️  REQUIRES NATIVE MODULE (see instructions below)
 * - Exact alarms: ⚠️  REQUIRES NATIVE MODULE (see instructions below)
 *
 * ANDROID FOREGROUND SERVICE IMPLEMENTATION:
 *
 * To implement the foreground service for Android:
 *
 * 1. Install react-native-foreground-service or similar package
 * 2. Add to AndroidManifest.xml:
 *    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
 *    <uses-permission android:name="android.permission.WAKE_LOCK" />
 *    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
 *
 * 3. Create a foreground service that displays a persistent notification:
 *    "Exam in progress - [Exam Name]"
 *
 * 4. Start the service when exam is activated
 * 5. Stop the service when exam ends
 *
 * EXACT ALARMS IMPLEMENTATION:
 *
 * To implement exact alarms as a backstop:
 *
 * 1. Use react-native-push-notification or expo-notifications
 * 2. Schedule exact alarms for each desk finish time
 * 3. Display notification when desk time expires
 * 4. Cancel alarms when exam ends or desk finishes early
 *
 * For now, the app uses:
 * - expo-keep-awake to prevent screen sleep (active in exam screen)
 * - Foreground setInterval for timer updates (sufficient for testing)
 */

/**
 * Start the foreground service for exam reliability.
 * TODO: Implement native module integration.
 */
export async function startForegroundService(examName: string): Promise<void> {
  // TODO: Implement foreground service
  console.log(`[Reliability] Would start foreground service for: ${examName}`);

  // Example implementation with react-native-foreground-service:
  // await ForegroundService.start({
  //   channelId: 'invigilator_exam',
  //   id: 1,
  //   title: 'Exam in Progress',
  //   message: examName,
  //   icon: 'ic_launcher',
  //   importance: 'high',
  // });
}

/**
 * Stop the foreground service.
 */
export async function stopForegroundService(): Promise<void> {
  // TODO: Implement foreground service
  console.log('[Reliability] Would stop foreground service');

  // Example implementation:
  // await ForegroundService.stop();
}

/**
 * Schedule exact alarms for desk finish times.
 * TODO: Implement native notification scheduling.
 */
export async function scheduleExactAlarms(
  desks: Array<{ id: string; deskNumber: number; finishTimeEpochMs: number }>
): Promise<void> {
  console.log(`[Reliability] Would schedule ${desks.length} exact alarms`);

  // Example implementation with expo-notifications:
  // for (const desk of desks) {
  //   await Notifications.scheduleNotificationAsync({
  //     content: {
  //       title: 'Desk Time Expired',
  //       body: `Desk #${desk.deskNumber} has reached finish time`,
  //       sound: true,
  //     },
  //     trigger: {
  //       date: desk.finishTimeEpochMs,
  //     },
  //   });
  // }
}

/**
 * Cancel all scheduled alarms.
 */
export async function cancelExactAlarms(): Promise<void> {
  console.log('[Reliability] Would cancel all exact alarms');

  // Example implementation:
  // await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Check if all required permissions are granted.
 */
export async function checkReliabilityPermissions(): Promise<{
  foregroundService: boolean;
  exactAlarms: boolean;
  notifications: boolean;
}> {
  // TODO: Implement permission checks
  return {
    foregroundService: false, // Would check FOREGROUND_SERVICE permission
    exactAlarms: false,       // Would check SCHEDULE_EXACT_ALARM permission
    notifications: false,     // Would check notification permission
  };
}

/**
 * Request all required permissions.
 */
export async function requestReliabilityPermissions(): Promise<void> {
  console.log('[Reliability] Would request all required permissions');

  // TODO: Implement permission requests
  // On Android 13+, SCHEDULE_EXACT_ALARM requires user to enable in settings
  // Should guide user to settings if needed
}
