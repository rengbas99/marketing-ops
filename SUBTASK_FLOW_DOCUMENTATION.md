# Subtask Flow Documentation for Editor Dashboard

**Date:** 2025-01-27  
**Status:** ✅ Implemented

---

## 📋 Overview

The subtask functionality allows editors to track specific work items (like "Background Design", "Text Overlay", etc.) while working on an asset. This provides granular time tracking and better visibility into what editors are working on.

---

## 🔄 Basic Flow

### 1. **Starting a Subtask**

```
Editor clicks "Start New Subtask" or selects from Quick Select
  ↓
EditorSubtaskWidget.handleStartSubtask() called
  ↓
Creates subtask object with:
  - name: subtask name
  - start_time: current timestamp
  ↓
Calls onUpdateTimeLog() with:
  - current_subtask: subtask name
  - subtask_start_time: ISO timestamp
  ↓
EditorDashboard.handleUpdateTimeLog() updates Editor_Time_Logs
  ↓
UI updates to show active subtask with timer
```

### 2. **Active Subtask Display**

```
While subtask is active:
  - Shows subtask name
  - Shows asset title
  - Displays live elapsed time (HH:MM:SS)
  - Shows "Complete" button
  - Timer updates every second
```

### 3. **Completing a Subtask**

```
Editor clicks "Complete" button
  ↓
EditorSubtaskWidget.handleEndSubtask() called
  ↓
Calculates duration: elapsedTime / 60 (minutes)
  ↓
Calls onUpdateTimeLog() with:
  - current_subtask: null
  - subtask_start_time: null
  - last_subtask: completed subtask name
  - last_subtask_duration: duration in minutes
  ↓
EditorDashboard.handleUpdateTimeLog() updates Editor_Time_Logs
  ↓
UI resets to show "Start New Subtask" button
  ↓
Shows last completed subtask with duration
```

---

## 🏗️ Component Structure

### **EditorSubtaskWidget.jsx**

**Props:**
- `asset` - The asset being worked on
- `timeLog` - The active Editor_Time_Logs record
- `onUpdateTimeLog` - Callback function to update the time log

**State:**
- `currentSubtask` - Current active subtask object `{ name, start_time }`
- `newSubtask` - Text input for custom subtask name
- `showInput` - Whether to show custom input field
- `elapsedTime` - Elapsed time in seconds (for timer display)

**Quick Select Options:**
1. Background Design
2. Text Overlay
3. Color Correction
4. Image Retouching
5. Layout Design
6. Typography
7. Final Touches
8. Export/Render
9. Review & QC

### **EditorDashboard.jsx Integration**

**Handler Function:**
```javascript
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

**TaskCard Integration:**
- Only shows EditorSubtaskWidget when `isActive === true` and `activeTimeLog` exists
- Passes `activeTimeLog` and `handleUpdateTimeLog` as props

---

## 📊 Data Schema

### **Editor_Time_Logs Fields Used:**

| Field | Type | Description |
|-------|------|-------------|
| `current_subtask` | string \| null | Name of currently active subtask |
| `subtask_start_time` | string \| null | ISO timestamp when subtask started |
| `last_subtask` | string \| null | Name of last completed subtask |
| `last_subtask_duration` | number \| string | Duration in minutes |

### **Schema Definition:**

```javascript
export const EditorTimeLogSchema = z.object({
    log_id: z.string().min(1, 'Log ID is required'),
    editor_email: z.string().email().optional(),
    asset_id: z.string().min(1).optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    work_duration: z.union([z.number(), z.string()]).optional(),
    duration: z.union([z.number(), z.string()]).optional(),
    task_status: z.string().optional(),
    notes: z.string().optional(),
    current_subtask: z.string().optional(), // NEW - Current subtask name
    subtask_start_time: z.string().optional(), // NEW - When subtask started
    last_subtask: z.string().optional(), // NEW - Last completed subtask
    last_subtask_duration: z.union([z.number(), z.string()]).optional(), // NEW - Duration of last subtask
    created_at: z.string().optional(),
});
```

---

## 🎯 User Experience Flow

### **Scenario 1: Quick Select Subtask**

1. Editor starts editing an asset
2. EditorSubtaskWidget appears below the asset card
3. Editor clicks on "Background Design" from Quick Select
4. Subtask starts immediately
5. Timer begins counting
6. Editor works on background design
7. Editor clicks "Complete" when done
8. Subtask duration is saved
9. Widget shows "Last completed: Background Design (X minutes)"
10. Editor can start a new subtask

### **Scenario 2: Custom Subtask**

1. Editor starts editing an asset
2. Editor clicks "Start New Subtask" button
3. Input field appears
4. Editor types: "X Hotel Poster - Background"
5. Editor presses Enter or clicks "Start"
6. Subtask starts with custom name
7. Timer begins counting
8. Process continues as in Scenario 1

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
```

### **Duration Calculation:**

```javascript
const duration = elapsedTime / 60; // Convert seconds to minutes
// Saved as: duration.toFixed(2) // e.g., "15.50" minutes
```

---

## ✅ Features

- ✅ Quick select buttons for common subtasks
- ✅ Custom subtask input field
- ✅ Live timer display (HH:MM:SS)
- ✅ Automatic time tracking
- ✅ Duration calculation on completion
- ✅ Last completed subtask display
- ✅ Integration with Editor_Time_Logs
- ✅ Real-time UI updates

---

## 🚀 Usage

1. **Start Editing an Asset:**
   - Click "Start Editing" on an asset card
   - EditorSubtaskWidget appears below the card

2. **Start a Subtask:**
   - Click a quick select button, OR
   - Click "Start New Subtask" and enter custom name

3. **Work on Subtask:**
   - Timer counts up automatically
   - Work on the subtask

4. **Complete Subtask:**
   - Click "Complete" button
   - Duration is saved to time log
   - Can start a new subtask

---

## 📝 Notes

- Subtask widget only appears when actively editing an asset (`isActive === true`)
- Only one subtask can be active at a time
- Subtask duration is calculated in minutes
- All updates are saved to Firebase immediately
- UI updates via Firebase real-time listeners

---

**Implementation Complete!** 🎉

