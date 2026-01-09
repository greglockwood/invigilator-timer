# 🕒 Invigilator Timer App (Working Title)

A cross-platform (Android/iOS + Web) exam-invigilation timer for managing **desks** with individual students and variable **D.P. (Disability Provision) time taken** — built with **React Native (Expo)**, **TypeScript**, and **Tamagui**.

---

## 🎯 Purpose

This app assists **exam invigilators** (starting with Greg’s father) to manage exams where some students take **variable amounts of D.P. time** during an exam, up to a permitted maximum.

The workflow mirrors existing **paper / Excel-based invigilation practices**, while improving reliability, clarity, and compliance.

---

## 🧩 Business / Functional Requirements

### 1. Core Concepts (Terminology Alignment)

| Term (UI) | Meaning |
|----------|--------|
| **General Exam Time** | The standard exam duration for all students |
| **Reading Time** | A fixed period before writing begins |
| **General Exam Finish Time** | Calculated finish time for students with no D.P. |
| **Desk** | A physical desk position (Desk #1, Desk #2, …) |
| **Student** | Optionally linked to a desk |
| **D.P. Time Taken** | Incremental extra time taken by a student |
| **Adjusted Finish Time** | Desk-specific finish time after D.P. |
| **Activation** | A deliberate action that causes timers to start or update |

---

### 2. Core Use Cases

| ID | Feature | Description |
|----|--------|-------------|
| F1 | **Create Exam Session** | Enter exam name, general exam duration, reading time, and (manual) start time. |
| F2 | **Desk Setup** | Configure desks (Desk #1, Desk #2, …) and optionally assign student names. |
| F3 | **Activate Exam Start** | Start reading time and exam countdown explicitly via activation. |
| F4 | **Reading Time Phase** | Display a live countdown for reading time before writing begins. |
| F5 | **General Exam Timer** | Display general exam finish time and general time remaining dynamically. |
| F6 | **Enter D.P. Time Taken** | Manually enter D.P. time (minutes) for a specific desk. |
| F7 | **Activate D.P. Entry** | Apply entered D.P. time, update adjusted finish time, then reset input to zero. |
| F8 | **Incremental D.P. Usage** | Allow multiple D.P. entries per desk over time. |
| F9 | **Individual Adjusted Timers** | Show desk-specific adjusted finish time and remaining time. |
| F10 | **Sorting** | Automatically sort desks by earliest adjusted finish time, then desk number. |
| F11 | **Pause / Resume** | Pause or resume general and individual timers if required. |
| F12 | **Alerts / Notifications** | Visual + audio alerts when desks reach finish time. |
| F13 | **Audit Trail** | Log all activations, pauses, and D.P. applications to SQLite. |
| F14 | **Offline-first** | App must function without Internet access. |
| F15 | **Web Version (Phase 2)** | Same logic and layout available in a browser. |

---

## ⏱️ Timer Phases & Activation Semantics

### Phase 1: Pre-Exam
- All times entered manually
- No countdowns active

### Phase 2: Reading Time
- Activated manually
- Countdown shows **Reading Time Remaining**
- Exam timer does **not** decrement yet

### Phase 3: General Exam Time
- Automatically activates when reading time ends
- Shows:
  - General Exam Finish Time
  - General Exam Time Remaining

### Phase 4: Individual D.P. Adjustments
- D.P. time entered per desk (minutes)
- Requires explicit **Activate D.P. Time** action
- On activation:
  - Adjusted finish time updates
  - Adjusted time remaining updates
  - D.P. input resets to zero

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
|  - Year 12 Maths (Today) [View]                    |
|  - Year 11 English (Yesterday) [Archive]           |
+----------------------------------------------------+
```

---

### 🧮 Create / Edit Session

```
Exam name:      [______________________]
Exam duration: [ 1 hr 30 min ▼ ]
Reading time:  [ 10 min ▼ ]
Start time:    [ 09:36 AM ▼ ]

Desks:
+----------------------------------------------------+
| Desk | Student Name (optional) | Notes             |
+----------------------------------------------------+
| #1   | Alice Wong              |                   |
| #2   | Ben Smith               |                   |
| [ + Add Desk ]                                     |
+----------------------------------------------------+

[ Save Session ]   [ Activate Exam Start ]
```

---

### ⏳ Active Exam View

```
CURRENT TIME: 09:45:12

General Exam Finish Time: 11:06 AM
General Time Remaining:   1:15:28

------------------------------------------------------
Desk #1 | Alice Wong
D.P. Time Taken: [ 30 ] mins [ Activate ]
Adjusted Finish: 11:36 AM
Adjusted Remaining: 1:45:28
------------------------------------------------------

Desk #2 | Ben Smith
D.P. Time Taken: [  0 ] mins [ Activate ]
Adjusted Finish: 11:06 AM
Adjusted Remaining: 1:15:28
------------------------------------------------------

[ Pause All ] [ Resume ] [ End Exam ]
```

**Colour cues**
- Green: >30 min remaining
- Amber: 10–30 min
- Red: <10 min
- Flash + sound at finish

---

## ⚙️ Technical Architecture

### 1. Technology Stack

| Layer | Technology |
|------|------------|
| Framework | React Native (Expo SDK 51+) |
| Language | TypeScript |
| UI | Tamagui |
| State | Zustand |
| Cache | MMKV |
| Database | SQLite |
| Background | Foreground Service + Wake Locks |
| Timing | Monotonic clock |
| Alerts | Expo Notifications |
| Platforms | Android → iOS → Web |

---

### 2. Reliability Chain

UI Countdown  
↓  
Timer Engine (monotonic)  
↓  
SQLite + MMKV persistence  
↓  
Foreground Service  
↓  
Wake Lock  
↓  
Exact Alarms  

---

### 3. Project Layout (Monorepo)

```
root/
├── apps/
│   ├── mobile/
│   └── web/
├── packages/
│   ├── core/
│   ├── ui/
│   └── data/
```

---

### 4. Data Model (Amended)

```ts
Session {
  id: string;
  name: string;
  examDurationMinutes: number;
  readingTimeMinutes: number;
  startTimeEpochMs: number;
  desks: Desk[];
}

Desk {
  id: string;
  deskNumber: number;
  studentName?: string;
  dpTimeTakenMinutes: number;
  adjustedFinishEpochMs: number;
  events: TimerEvent[];
}

TimerEvent {
  type:
    | "exam_start"
    | "reading_start"
    | "exam_active"
    | "dp_applied"
    | "pause"
    | "resume"
    | "finish";
  timestamp: number;
  valueMinutes?: number;
}
```

---

### 5. Timer Logic (Simplified)

```ts
remaining =
  baseExamMs +
  totalDpTakenMs -
  (performance.now() - examStartMonotonic);
```

- Uses monotonic time
- D.P. time added incrementally
- Persist on every activation
- Restore on reopen

---

### 6. Sorting Rules

Default automatic sort:
1. Earliest **Adjusted Finish Time**
2. Desk number (ascending)

Optional toggle: manual sort order.

---

### 🧠 Future Considerations

- CSV export
- Student-only display mode
- Multi-room support
- Theming
- Cloud sync (optional)
- Accessibility APIs

---

### 📋 Summary

| Category | Approach |
|--------|---------|
| Model | Desk-centric |
| Timing | Incremental D.P. |
| Reliability | Foreground + alarms |
| UI | Large, colour-coded |
| Platforms | Android → Web |
| Audience | Invigilators |

---

Prepared by: Greg Lockwood  
Purpose: Stakeholder review (Dad) and AI-assisted implementation (Claude Code)