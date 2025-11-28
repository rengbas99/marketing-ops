# Complete Subtask Flow Documentation

**Date:** 2025-01-27  
**Status:** ✅ Implemented

---

## 📋 Overview

The subtask system allows editors to track granular work items (like "Background Design", "Text Overlay", etc.) while working on an asset. This provides detailed time tracking and better visibility for leads.

---

## 🔄 Complete Subtask Flow

### **1. Starting a Subtask**

```
Editor Dashboard
  ↓
Editor starts editing an asset
  ↓
EditorSubtaskWidget appears below asset card
  ↓
Editor has two options:
  
  Option A: Quick Select
    ↓
  Click on predefined subtask button
    (Background Design, Text Overlay, etc.)
    ↓
  handleStartSubtask(subtaskName) called immediately
  
  Option B: Custom Input
    ↓
  Click "Start New Subtask" button
    ↓
  Input field appears
    ↓
  Editor types custom subtask name
    (e.g., "X Hotel Poster - Background")
    ↓
  Press Enter or click "Start"
    ↓
  handleStartSubtask() called with custom name
    ↓
Creates subtask object:
  {
    name: subtaskName,
    start_time: new Date().toISOString()
  }
  ↓
Updates local state:
  setCurrentSubtask(subtaskObject)
  ↓
Calls onUpdateTimeLog() with:
  {
    current_subtask: subtaskName,
    subtask_start_time: ISO timestamp
  }
  ↓
EditorDashboard.handleUpdateTimeLog() executes:
  ↓
Finds time log index
  ↓
updateRow(COLLECTIONS.EDITOR_TIME_LOGS, index, {
  ...activeTimeLog,
  current_subtask: subtaskName,
  subtask_start_time: ISO timestamp
})
  ↓
Firebase write (immediate)
  ↓
UI updates immediately
  ↓
Timer starts counting (updates every second)
  ↓
Lead Dashboard sees update via real-time listener
```

### **2. Active Subtask Display**

```
While subtask is active:
  ↓
EditorSubtaskWidget shows:
  - "Working on: [Subtask Name]"
  - "Asset: [Asset Title]"
  - Live timer (HH:MM:SS format)
  - "Complete" button
  ↓
Timer updates every second:
  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(currentSubtask.start_time);
      const now = new Date();
      const diff = Math.floor((now - start) / 1000); // seconds
      setElapsedTime(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSubtask]);
  ↓
Formatted display:
  formatTime(elapsedTime) → "02:15:30"
  (hours:minutes:seconds)
  ↓
Lead Dashboard shows:
  - Current subtask name in tracking card
  - Real-time updates
```

### **3. Completing a Subtask**

```
Editor clicks "Complete" button
  ↓
handleEndSubtask() called
  ↓
Calculates duration:
  duration = elapsedTime / 60  // Convert seconds to minutes
  ↓
Calls onUpdateTimeLog() with:
  {
    current_subtask: null,
    subtask_start_time: null,
    last_subtask: completedSubtaskName,
    last_subtask_duration: duration.toFixed(2)  // e.g., "15.50"
  }
  ↓
EditorDashboard.handleUpdateTimeLog() executes:
  ↓
updateRow(COLLECTIONS.EDITOR_TIME_LOGS, index, {
  ...activeTimeLog,
  current_subtask: null,
  subtask_start_time: null,
  last_subtask: completedSubtaskName,
  last_subtask_duration: "15.50"
})
  ↓
Firebase write (immediate)
  ↓
Local state updates:
  setCurrentSubtask(null)
  setElapsedTime(0)
  ↓
UI resets to show:
  - "Start New Subtask" button
  - Quick select buttons
  - Last completed subtask display
    "Last completed: Background Design"
    "15.50 minutes"
  ↓
Lead Dashboard sees update via real-time listener
```

### **4. Starting a New Subtask**

```
After completing a subtask
  ↓
Editor can immediately start a new one
  ↓
Same flow as Step 1
  ↓
Previous subtask data preserved in:
  - last_subtask
  - last_subtask_duration
  ↓
Multiple subtasks can be tracked in sequence
```

---

## 🎯 Quick Select Subtasks

**Available Options:**
1. Background Design
2. Text Overlay
3. Color Correction
4. Image Retouching
5. Layout Design
6. Typography
7. Final Touches
8. Export/Render
9. Review & QC

**Usage:**
- Click any button to start immediately
- No typing required
- Fast workflow for common tasks

---

## 📊 Data Structure

### **Editor_Time_Logs Fields Used:**

| Field | Type | Description |
|-------|------|-------------|
| `current_subtask` | string \| null | Name of currently active subtask |
| `subtask_start_time` | string \| null | ISO timestamp when subtask started |
| `last_subtask` | string \| null | Name of last completed subtask |
| `last_subtask_duration` | number \| string | Duration in minutes (e.g., "15.50") |

### **Subtask Object (Local State):**

```javascript
{
  name: string,        // Subtask name
  start_time: string   // ISO timestamp
}
```

---

## 🔄 Real-time Updates

### **Editor → Lead Flow**

```
Editor starts subtask
  ↓
Updates Editor_Time_Logs.current_subtask
  ↓
Firebase real-time listener triggers
  ↓
LeadDashboard receives update
  ↓
teamEditing array recalculates
  ↓
UI shows current subtask in tracking card:
  "Working on: Background Design"
```

### **Editor → Lead Flow (Complete)**

```
Editor completes subtask
  ↓
Updates Editor_Time_Logs:
  - current_subtask: null
  - last_subtask: "Background Design"
  - last_subtask_duration: "15.50"
  ↓
Firebase real-time listener triggers
  ↓
LeadDashboard receives update
  ↓
Tracking card updates:
  - Removes "Working on" display
  - Shows progress percentage only
```

---

## 🎨 UI Components

### **EditorSubtaskWidget**

**Location:** Below active asset card in EditorDashboard

**States:**

1. **No Active Subtask:**
   - "Start New Subtask" button
   - Quick select grid (6 buttons)
   - Last completed subtask display (if any)

2. **Active Subtask:**
   - Subtask name display
   - Asset title display
   - Live timer (HH:MM:SS)
   - "Complete" button

**Props:**
- `asset` - The asset being worked on
- `timeLog` - The active Editor_Time_Logs record
- `onUpdateTimeLog` - Callback to update time log

---

## 🔧 Technical Implementation

### **Timer Logic:**

```javascript
useEffect(() => {
  if (!currentSubtask) {
    setElapsedTime(0);
    return;
  }

  const interval = setInterval(() => {
    const start = new Date(currentSubtask.start_time);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000); // seconds
    setElapsedTime(diff);
  }, 1000);

  return () => clearInterval(interval);
}, [currentSubtask]);
```

### **Time Formatting:**

```javascript
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
// Output: "02:15:30"
```

### **Duration Calculation:**

```javascript
const duration = elapsedTime / 60; // Convert seconds to minutes
// Saved as: duration.toFixed(2) // e.g., "15.50" minutes
```

### **Update Handler:**

```javascript
// EditorDashboard.jsx
const handleUpdateTimeLog = async (updates) => {
  if (!activeTimeLog) return;
  
  const logIndex = timeLogs.findIndex(
    log => log && log.log_id === activeTimeLog.log_id
  );
  
  if (logIndex !== -1) {
    await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
      ...activeTimeLog,
      ...updates
    });
    await forceRefresh([COLLECTIONS.EDITOR_TIME_LOGS]);
  }
};
```

---

## 📝 User Scenarios

### **Scenario 1: Quick Workflow**

1. Editor starts editing "Hotel Poster" asset
2. EditorSubtaskWidget appears
3. Editor clicks "Background Design" (quick select)
4. Subtask starts immediately
5. Timer shows "00:00:01", "00:00:02", etc.
6. Editor works on background
7. After 15 minutes, editor clicks "Complete"
8. Duration saved: "15.00 minutes"
9. Widget shows: "Last completed: Background Design (15.00 minutes)"
10. Editor clicks "Text Overlay" (next subtask)
11. Process repeats

### **Scenario 2: Custom Subtask**

1. Editor starts editing "Product Catalog" asset
2. Editor clicks "Start New Subtask"
3. Input field appears
4. Editor types: "Page 5 - Layout Design"
5. Editor presses Enter
6. Subtask starts with custom name
7. Timer begins
8. Editor works
9. Completes subtask
10. Custom name saved in last_subtask

### **Scenario 3: Lead Tracking**

1. Editor starts subtask "Background Design"
2. Lead Dashboard updates immediately
3. Lead sees in "Active Editing" section:
   - Editor name
   - Asset title
   - "Working on: Background Design"
   - Progress percentage
   - Time worked
4. Lead clicks "Details" to see full work history
5. Lead can see all subtasks completed today

---

## ✅ Features

- ✅ Quick select buttons (9 predefined options)
- ✅ Custom subtask input
- ✅ Live timer display (HH:MM:SS)
- ✅ Automatic time tracking
- ✅ Duration calculation on completion
- ✅ Last completed subtask display
- ✅ Real-time updates to Lead Dashboard
- ✅ Integration with Editor_Time_Logs
- ✅ Multiple subtasks per editing session
- ✅ Persistent subtask history

---

## 🔍 Data Flow Diagram

```
┌─────────────────────────────────────────┐
│         EDITOR DASHBOARD                │
│                                         │
│  Asset Card                             │
│  ┌───────────────────────────────────┐  │
│  │ EditorSubtaskWidget               │  │
│  │                                   │  │
│  │ [Start New Subtask]               │  │
│  │ [Quick Select Buttons]            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              │ handleStartSubtask()
              ↓
┌─────────────────────────────────────────┐
│    handleUpdateTimeLog()                │
│                                         │
│  Updates Editor_Time_Logs:              │
│  - current_subtask                      │
│  - subtask_start_time                  │
└─────────────────────────────────────────┘
              │
              │ Firebase Write
              ↓
┌─────────────────────────────────────────┐
│         FIREBASE                        │
│                                         │
│  Editor_Time_Logs Collection            │
│  Real-time Listener                     │
└─────────────────────────────────────────┘
              │
              │ Real-time Update
              ↓
┌─────────────────────────────────────────┐
│         LEAD DASHBOARD                  │
│                                         │
│  Active Editing Card                    │
│  - Editor name                           │
│  - Asset title                          │
│  - "Working on: [Subtask]"              │
│  - Progress %                           │
│  - Time worked                          │
└─────────────────────────────────────────┘
```

---

## 🚀 Usage Guide

### **For Editors:**

1. **Start Editing:**
   - Click "Start Editing" on an asset
   - EditorSubtaskWidget appears

2. **Start Subtask:**
   - Quick: Click predefined button
   - Custom: Click "Start New Subtask" → Type name → Enter

3. **Work on Subtask:**
   - Timer counts automatically
   - Work on the task

4. **Complete Subtask:**
   - Click "Complete"
   - Duration saved
   - Can start new subtask

### **For Leads:**

1. **View Active Work:**
   - Check "Active Editing" section
   - See current subtask for each editor

2. **View Details:**
   - Click "Details" button
   - See full work history
   - See all subtasks completed

3. **Track Progress:**
   - Monitor subtask completion
   - See time spent on each subtask
   - Identify bottlenecks

---

## 📝 Notes

- Only one subtask can be active at a time
- Subtask widget only appears when actively editing an asset
- All updates save to Firebase immediately
- Real-time listeners ensure instant UI updates
- Duration calculated in minutes (decimal format)
- Last subtask persists across sessions

---

**Subtask Flow Complete!** 🎉

