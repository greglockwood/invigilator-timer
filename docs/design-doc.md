# 🕒 Invigilator Timer App (Working Title)

A cross-platform (Android/iOS + Web) exam-invigilation timer for managing multiple students with variable extra-time provisions — built with **React Native (Expo)**, **TypeScript**, and **Tamagui**.

---

## 🎯 Purpose

This app assists **exam invigilators** (starting with Greg’s father) to manage exams where students have different **extra time allowances** due to disability provisions or special considerations.

Currently, invigilators rely on manual timers, paper lists, or multiple phones.  
This app centralises all timers, guarantees reliability, and records timing data for compliance.

---

## 🧩 Business / Functional Requirements

### 1. Core Use Cases

| ID | Feature | Description |
|----|----------|--------------|
| F1 | **Create an Exam Session** | Define the exam’s name, total duration (e.g., 2h), and start time. |
| F2 | **Add Students** | Add each student with their name/ID and their individual extra-time allowance (as percentage or minutes). |
| F3 | **Start and Manage Timers** | Begin the session; the app calculates each student’s adjusted end time. |
| F4 | **Pause / Resume / Extend** | Allow pausing individual or all timers (e.g., rest breaks), and optionally extending time. |
| F5 | **Multi-student Overview** | Display all students in a list or grid with remaining time, colour-coded urgency, and labels for “+25%”, “+50%”, etc. |
| F6 | **Alerts / Notifications** | Give clear visual + audio alerts when students finish, and a summary when the last timer ends. |
| F7 | **Logging / Audit Trail** | Log start, pause, resume, and end events to a persistent store (SQLite) for compliance. |
| F8 | **Reliability and Continuity** | Continue counting down even if the screen turns off or the app is backgrounded. Survive restarts. |
| F9 | **Accessibility and Clarity** | Large fonts, high contrast, colour-blind-safe palette, simple interaction model (tap, hold). |
| F10 | **Offline-first** | Must work entirely offline (no Internet dependency). |
| F11 | **Web Version (Phase 2)** | Allow same codebase to build a browser-based version for larger screens. |

---

### 2. Derived Reliability Requirements

| Layer | Requirement |
|--------|--------------|
| **Process** | Must not stop when app in background → **Foreground Service** (Android). |
| **Power** | Must not sleep mid-exam → **Wake Lock** or `expo-keep-awake`. |
| **Timing** | Must not drift → use **monotonic clock**. |
| **Deadline** | Must not miss end alarms → **Exact Alarms** fallback. |
| **Data** | Must not lose logs → **SQLite + MMKV** persistence. |

---

### 3. Optional / Future Enhancements

- CSV export of session logs.
- Separate “Student display” mode (projector / monitor view).
- Cloud backup / sync between devices.
- Voice assistant integration (“Start next session”).
- Web dashboard for reporting.

---

## 🧭 User Interface Wireframes (textual)

### 🏠 Home / Sessions Screen

```
+----------------------------------------------------+
| Invigilator Timer                                  |
+----------------------------------------------------+
| [ New Session ]                                    |
|                                                    |
| Existing Sessions:                                 |
|  - Year 12 Maths (Today 09:00–11:00) [View]        |
|  - Year 11 English (Yesterday) [Archive]           |
+----------------------------------------------------+
```

### 🧮 Create / Edit Session

```
Exam name: [_________________________]
Duration:  [ 2 hours 00 min ▼ ]
Start time:[ Now ▼ ]

Students:
+----------------------------------------------------+
| Name          | Extra Time  | Notes                |
+----------------------------------------------------+
| Alice Wong    | +25% ▼      |                      |
| Ben Smith     | +50% ▼      | Rest breaks allowed  |
| [ + Add Student ]                                  |
+----------------------------------------------------+
[ Save Session ]   [ Start Exam ]
```

### ⏳ Active Exam View

```
+----------------------------------------------------+
| Year 12 Maths – Started 09:00 – Ends 11:30         |
| (Paused / Running indicator)                       |
+----------------------------------------------------+
| Alice Wong   | ⏱ 00:45:32 remaining | +25% |
| Ben Smith    | ⏱ 01:05:17 remaining | +50% |
| Carol Lee    | ⏱ 00:42:58 remaining | +0%  |
+----------------------------------------------------+
| [ Pause All ] [ Resume ] [ End Exam ]              |
+----------------------------------------------------+
```

**Colour cues:**
- Green >30 min left  
- Amber 10–30 min  
- Red <10 min  
- Flashing red + sound when timer ends.

---

## ⚙️ Technical Architecture

### 1. Technology Stack

| Layer | Technology |
|--------|-------------|
| Framework | **React Native (Expo SDK 51+)** |
| Language | **TypeScript** |
| UI Kit | **Tamagui** (shared with web) |
| State | **Zustand** or **Redux Toolkit** |
| Local Cache | **MMKV** |
| Database | **SQLite** (via `expo-sqlite` or `react-native-quick-sqlite`) |
| Background / Power | Foreground service + Wake locks (`expo-keep-awake`, config plugin) |
| Timing | Monotonic clock (`performance.now()` / native module) |
| Notifications | Expo Notifications |
| Platform | Android primary, iOS secondary, Web (Phase 2) |

---

### 2. Reliability Chain

UI Countdown
↓
Timer Engine (monotonic)
↓
SQLite + MMKV persistence
↓
Foreground Service (keeps process alive)
↓
Wake Lock (keeps CPU/screen on)
↓
Exact Alarms (hard guarantee of end time)

---

### 3. Project Layout (Monorepo via Expo + Tamagui)

```
root/
├── apps/
│   ├── mobile/          # Expo React Native app
│   └── web/             # Next.js + react-native-web
├── packages/
│   ├── core/            # Shared TS logic: timer engine, models, utils
│   ├── ui/              # Tamagui components (Buttons, Lists, Layout)
│   └── data/            # Storage layer (SQLite hooks, MMKV wrappers)
└── package.json         # Yarn workspaces linking all together
```

**Shared Code Examples**
- `/core/timer.ts` — calculates remaining time, supports pause/resume.  
- `/core/models.ts` — types for `Session`, `StudentTimer`.  
- `/ui/StudentTimerCard.tsx` — Tamagui responsive component used in mobile & web.

---

### 4. Data Model (simplified)

```ts
Session {
  id: string;
  name: string;
  durationMinutes: number;
  startTime: number; // epoch ms
  students: StudentTimer[];
}

StudentTimer {
  id: string;
  name: string;
  extraTimePercent: number; // or extraMinutes
  startTime: number;
  endTime: number;
  remainingMs: number;
  paused: boolean;
  events: TimerEvent[];
}

TimerEvent {
  type: "start" | "pause" | "resume" | "extend" | "finish";
  timestamp: number;
  note?: string;
}
```

### Key Libraries

| Function            | Library                |                   
|---------------------|------------------------|
UI Layout / Styling   | tamagui, react-native-reanimated |
Navigation            | expo-router |
Storage               | react-native-mmkv, expo-sqlite |
Background            | expo-keep-awake, custom config plugin for foreground service |
Alerts                | expo-notifications |
Timekeeping           | Custom hook using performance.now() |
State                 | zustand |
Dev tooling           | Expo Go, TypeScript, EAS Build |

---

### 6. Timer Logic (simplified)

```ts
const now = performance.now(); // monotonic
const elapsed = now - startMonotonic;
remaining = durationMs + extraMs - elapsed;
```

•	Uses *monotonic* time to avoid clock skew.
•	Every 1 s tick persists remaining time in MMKV.
•	On resume → recompute from monotonic deltas.
•	On kill/reopen → restore from SQLite.

---

### 7. Reliability Components

| Component         | Purpose                   |
|-------------------|---------------------------|
| Foreground Service | Keeps timer alive if app backgrounded. |
| Wake Lock         | Keeps screen (or CPU) awake. |
| Exact Alarm       | Backup: triggers at each student’s end time. |
| SQLite log        | For replay / compliance. |

---

### 8. Responsive Design with Tamagui

| Screen Size       | Layout Behaviour          |
|-------------------|---------------------------|
| Phone (portrait)  | Vertical list of students.|
| Phone (landscape) | Two-column layout.        |
| Tablet            | Grid of 2–3 columns.      |
| Web               | Flexible grid + sidebar for controls.|

Example:
```tsx
<XStack flexWrap="wrap" gap="$3">
  <StudentTimerCard size="$6" width="48%" />
</XStack>
```

Tamagui breakpoints ensure automatic resizing on rotation or larger screens.

---

### 🧠 Future Considerations

*	Data export (CSV or JSON) for record keeping.
*	Multi-room support (tabs or sessions).
*	Theming (light/dark).
*	Authentication if used in institutions.
*	Sync or backup to cloud (Supabase/Firebase optional).
*	Integration with accessibility APIs (screen reader labels).

---

### 📋 Summary

| Category     | Chosen Tech / Approach                   |
|--------------|------------------------------------------|
| Language     | TypeScript                               |
| Framework    | React Native (Expo)                      |
| UI           | Tamagui                                  |
| State        | Zustand                                  |
| Storage      | SQLite + MMKV                            |
| Power        | Wake Lock / Foreground Service           |
| Platform     | Android first, iOS next, Web later       |
| Build System | Expo Monorepo                            |
| Reliability  | Monotonic clock + alarms                 |
| Accessibility| High-contrast, large fonts, minimal interaction |

---

### 🧑‍💻 Next Steps

1.	Scaffold Expo + Tamagui workspace.
2.	Implement core timer logic in /packages/core.
3.	Build Session → Timer screens with Tamagui responsive components.
4.	Add SQLite persistence.
5.	Add Foreground Service + Wake Lock behaviour for Android.
6.	Add alerts & logs.
7.	Later: web support via Next.js + react-native-web.

---

Prepared by: Greg Lockwood
Date: 
Purpose: For stakeholder review (Dad) and AI pair-coding reference (Claude Code).