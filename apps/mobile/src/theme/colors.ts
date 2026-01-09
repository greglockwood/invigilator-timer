/**
 * Centralized color theme for the Invigilator Timer app.
 * All color values should be referenced from this file.
 */

export const colors = {
  // Primary brand colors
  primary: '#007AFF',           // Main action blue
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D5',

  // Semantic colors
  success: '#34C759',           // Success/positive actions
  warning: '#FF9500',           // Warning/amber state
  danger: '#FF3B30',            // Danger/error/red state

  // Timer state colors (per design doc colour cues)
  timerGreen: '#34C759',        // >30 minutes remaining
  timerAmber: '#FF9500',        // 10-30 minutes remaining
  timerRed: '#FF3B30',          // <10 minutes remaining
  timerFinished: '#666666',     // Timer completed

  // Reading time phase
  readingTime: '#FF9500',       // Reading time indicator
  readingTimeBg: '#FFF9E6',     // Reading time background
  readingTimeBorder: '#FFD700', // Reading time border

  // Neutrals
  background: '#f5f5f5',        // Main background
  surface: '#ffffff',           // Card/surface background
  surfaceGrey: '#F0F0F0',       // Disabled/finished surface

  // Borders
  border: '#e0e0e0',
  borderLight: '#ddd',

  // Text colors
  textPrimary: '#333333',       // Primary text
  textSecondary: '#666666',     // Secondary text
  textTertiary: '#999999',      // Tertiary/placeholder text
  textLight: '#bbbbbb',         // Very light text
  textOnPrimary: '#ffffff',     // Text on primary/colored backgrounds

  // Desk card backgrounds (based on color cue)
  deskCardGreen: '#ffffff',     // Green state (use border only)
  deskCardAmber: '#FFF9E6',     // Amber state background
  deskCardRed: '#FFE6E6',       // Red state background
  deskCardFinished: '#F0F0F0',  // Finished state background

  // Input colors
  inputBackground: '#ffffff',
  inputBorder: '#ddd',
  inputPlaceholder: '#999999',
  inputText: '#333333',

  // Shadow (for elevation)
  shadow: '#000000',
} as const;

/**
 * Color opacity helpers
 */
export const opacity = {
  shadow: {
    light: 0.1,
    medium: 0.15,
    heavy: 0.25,
  },
} as const;

/**
 * Get color for timer state based on remaining milliseconds.
 * Implements design doc colour cue rules.
 */
export function getTimerColor(remainingMs: number): string {
  const remainingMinutes = remainingMs / (60 * 1000);

  if (remainingMinutes > 30) {
    return colors.timerGreen;
  } else if (remainingMinutes >= 10) {
    return colors.timerAmber;
  } else {
    return colors.timerRed;
  }
}

/**
 * Get desk card colors based on timer state.
 * Returns background, border colors.
 */
export function getDeskCardColors(remainingMs: number, isFinished: boolean): {
  backgroundColor: string;
  borderColor: string;
} {
  if (isFinished) {
    return {
      backgroundColor: colors.deskCardFinished,
      borderColor: colors.timerFinished,
    };
  }

  const remainingMinutes = remainingMs / (60 * 1000);

  if (remainingMinutes > 30) {
    return {
      backgroundColor: colors.deskCardGreen,
      borderColor: colors.timerGreen,
    };
  } else if (remainingMinutes >= 10) {
    return {
      backgroundColor: colors.deskCardAmber,
      borderColor: colors.timerAmber,
    };
  } else {
    return {
      backgroundColor: colors.deskCardRed,
      borderColor: colors.timerRed,
    };
  }
}
