# Invigilator Timer App

A cross-platform exam invigilation timer for managing desks with individual students and variable D.P. (Disability Provision) time taken.

## Project Status

### ✅ Implemented

#### Core Architecture
- **Monorepo structure** with apps (mobile) and packages (core, data)
- **TypeScript** throughout for type safety
- **Expo SDK 54** for React Native development
- **Expo Router** for file-based navigation

#### Core Domain Logic (`packages/core`)
- Session, Desk, and TimerEvent data models
- Timer phase state machine (PreExam → ReadingTime → ExamActive → DPAdjustments)
- Monotonic timer calculations (using `performance.now()`)
- Activation-driven actions (exam start, D.P. apply, pause/resume)
- Desk sorting by adjusted finish time
- Colour cue logic (green >30min, amber 10-30min, red <10min)
- Time formatting utilities (Australian English format)

#### Data Persistence (`packages/data`)
- **SQLite** for authoritative session storage
  - Sessions, desks, and timer_events tables
  - Full audit trail of all activation events
  - Transaction-based saves for atomicity
- **MMKV** for fast UI state caching
  - Last active session tracking
  - Timer state recovery after app restart

#### Mobile App (`apps/mobile`)
- **Home/Sessions Screen**
  - List existing sessions
  - Create new sessions
  - Delete sessions with confirmation
  - Demo session seed for quick testing

- **Create/Edit Session Screen**
  - Exam name, duration, reading time configuration
  - Start time picker (hour:minute)
  - Dynamic desk management (add/remove desks)
  - Optional student names per desk
  - Validation for all inputs
  - "Activate Exam Start" action

- **Active Exam Screen** ⭐ (Primary interface)
  - Live current time display
  - Reading time phase with automatic transition to exam time
  - General exam finish time and remaining time
  - Per-desk displays:
    - Desk number and student name
    - Adjusted finish time (including D.P.)
    - Adjusted remaining time
    - D.P. time entry with activation button
    - Colour-coded borders (green/amber/red)
  - D.P. input resets to zero after activation (per design doc)
  - Automatic desk sorting by earliest finish time
  - Pause/Resume controls
  - End Exam action
  - Screen kept awake via `expo-keep-awake`

#### State Management
- **Zustand** store for global app state
- Database initialization on app launch
- Session persistence on every activation
- Timer state caching for app restart recovery

### ⚠️ Partially Implemented / TODO

#### Reliability Features (Android-specific)

Currently implemented:
- ✅ Wake lock (screen stays on via `expo-keep-awake`)
- ✅ Foreground timer updates (setInterval with 1-second interval)

Requires native module integration:
- ⚠️ **Foreground service** - Keeps process alive even if app is backgrounded
  - See `apps/mobile/src/services/reliability.ts` for implementation guide
  - Requires `react-native-foreground-service` or similar package
  - Must display persistent notification during exam
  
- ⚠️ **Exact alarms** - Backstop notifications for desk finish times
  - See `apps/mobile/src/services/reliability.ts` for implementation guide
  - Requires `expo-notifications` with exact alarm permissions
  - Android 13+ requires `SCHEDULE_EXACT_ALARM` permission

#### UI Framework
- Tamagui installed but not yet configured
- Currently using React Native StyleSheet for styling
- Tamagui configuration can be added later for enhanced UI consistency

#### iOS Support
- Core logic is platform-agnostic
- Foreground/wake behaviour differs on iOS
- Testing required on iOS devices

#### Future Enhancements (from design doc)
- CSV export of audit trail
- Student-only display mode
- Multi-room support
- Theming/dark mode
- Cloud sync (optional)
- Accessibility API integration

## Design Principles (from design-doc.md)

1. **Desk-centric model** - Desks are primary, student names are optional metadata
2. **Activation-driven** - All state changes require explicit activation actions
3. **Monotonic timing** - Uses `performance.now()` for countdowns to avoid clock drift
4. **Incremental D.P.** - D.P. time is cumulative; multiple entries per desk allowed
5. **Audit trail** - Every activation event logged to SQLite
6. **Offline-first** - No Internet required
7. **Reliability chain** - UI → Timer Engine → SQLite/MMKV → Foreground Service → Wake Lock → Exact Alarms

## Project Structure

```
invigilator-timer/
├── apps/
│   └── mobile/                 # Expo mobile app
│       ├── app/                # Expo Router screens
│       │   ├── _layout.tsx     # Root layout (initializes store)
│       │   ├── index.tsx       # Home/Sessions screen
│       │   ├── session/[id].tsx # Create/Edit Session screen
│       │   └── exam/[id].tsx   # Active Exam screen
│       └── src/
│           ├── store/          # Zustand global store
│           ├── services/       # Platform services (reliability)
│           └── utils/          # Demo seed utilities
├── packages/
│   ├── core/                   # Core domain logic
│   │   └── src/
│   │       ├── types.ts        # Session, Desk, TimerEvent types
│   │       ├── timer-engine.ts # Timer calculations
│   │       └── utils.ts        # Formatting, colour cues
│   └── data/                   # Persistence layer
│       └── src/
│           ├── database.ts     # SQLite operations
│           └── cache.ts        # MMKV cache
└── docs/
    └── design-doc.md           # Full specification
```

## Getting Started

### Prerequisites
- Node.js 20+ (or 18.17+, though warnings will appear)
- npm or yarn
- Expo Go app for testing (or Expo CLI for native builds)

### Installation

```bash
# Install dependencies
npm install

# Run on Android
npm run mobile:android

# Run on iOS
npm run mobile:ios

# Run on web (for testing layout)
npm run mobile:web
```

### Quick Testing

1. Launch the app
2. Tap "Create Demo Session (Quick Test)" on the home screen
3. A demo session will be created starting in 2 minutes with a 5-minute exam
4. Open the session and tap "Activate Exam Start" when ready
5. Test D.P. time entry and activation
6. Observe colour cues and sorting behaviour

## Key Implementation Details

### Timer Phase Transitions

```
PreExam (manual start)
  ↓ [Activate Exam Start]
ReadingTime (countdown active)
  ↓ [Auto-transition when reading time expires]
ExamActive (general countdown + per-desk countdowns)
  ↓ [D.P. can be applied any time during ExamActive]
DPAdjustments (desk-specific finish times adjusted)
```

### D.P. Time Application Workflow

1. Invigilator enters D.P. minutes in desk input field
2. Invigilator taps "Activate" button
3. System:
   - Adds D.P. minutes to desk's cumulative `dpTimeTakenMinutes`
   - Recalculates `adjustedFinishEpochMs`
   - Records `dp_applied` event to audit trail
   - Persists session to SQLite
   - **Resets D.P. input to zero** (per design doc Excel box 6)
4. Desk re-sorts based on new adjusted finish time

### Desk Sorting

Default sort order (automatic):
1. Earliest adjusted finish time (ascending)
2. Desk number (ascending)

Updates dynamically as D.P. is applied.

## Testing Strategy

### Unit Testing (TODO)
- Core timer calculation functions
- D.P. application logic
- Sorting algorithm
- Colour cue determination

### Integration Testing (TODO)
- SQLite persistence
- Timer state restoration
- Pause/resume behaviour
- Phase transitions

### Manual Testing
- Use demo session for quick smoke tests
- Test with realistic 90-minute exam session
- Verify monotonic timing survives app backgrounding
- Test D.P. incremental application (multiple entries per desk)
- Verify audit trail in SQLite database

## Database Schema

### sessions
- id (TEXT PRIMARY KEY)
- name (TEXT)
- exam_duration_minutes (INTEGER)
- reading_time_minutes (INTEGER)
- start_time_epoch_ms (INTEGER)
- created_at (INTEGER)
- updated_at (INTEGER)

### desks
- id (TEXT PRIMARY KEY)
- session_id (TEXT FOREIGN KEY)
- desk_number (INTEGER)
- student_name (TEXT nullable)
- dp_time_taken_minutes (INTEGER)
- adjusted_finish_epoch_ms (INTEGER)

### timer_events
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- desk_id (TEXT FOREIGN KEY)
- type (TEXT) - exam_start, reading_start, exam_active, dp_applied, pause, resume, finish
- timestamp (INTEGER) - epoch ms
- value_minutes (INTEGER nullable) - for dp_applied events

## Commits

The implementation follows a detailed commit history:
1. Create Expo mobile app with TypeScript template
2. Add root package.json for monorepo workspace
3. Install dependencies and update .gitignore
4. Configure Expo Router with basic navigation
5. Implement core domain models and timer engine
6. Replace TimerPhase enum with literal union type (avoid TS anti-pattern)
7. Implement SQLite and MMKV persistence layers
8. Add Zustand store for global state management
9. Implement Home/Sessions screen
10. Implement Create/Edit Session screen
11. Implement Active Exam screen with live timers
12. Add demo session seed for quick testing

## Authors

Prepared by: Greg Lockwood  
Purpose: Stakeholder review (Dad) and AI-assisted implementation
