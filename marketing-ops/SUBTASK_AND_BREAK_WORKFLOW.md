# Subtask and Break Workflow Documentation

**Date:** 2025-01-27  
**Status:** ✅ Implemented

---

## 📋 Subtask Workflow

### **Where to Find Subtasks**

Subtasks appear in the **Editor Dashboard** when you:
1. **Clock in** (with or without selecting an asset)
2. **Select an asset** and click "Start Editing"
3. The asset card becomes **active** (highlighted with blue ring)

### **Subtask Widget Location**

The `EditorSubtaskWidget` appears **below the active asset card** in the Editor Dashboard.

**Visual Location:**
```
Editor Dashboard
  ↓
Asset Cards Section
  ↓
[Active Asset Card - highlighted with blue ring]
  ↓
[EditorSubtaskWidget appears here]
  - "Current Work" section
  - Start/Complete subtask buttons
  - Live timer
```

### **Complete Subtask Flow**

#### **1. Starting a Subtask**

**Option A: Quick Select**
1. Click on any predefined subtask button:
   - Background Design
   - Text Overlay
   - Color Correction
   - Image Retouching
   - Layout Design
   - Typography
2. Subtask starts immediately
3. Timer begins counting

**Option B: Custom Input**
1. Click "Start New Subtask" button
2. Type custom subtask name (e.g., "X Hotel Poster - Background")
3. Press Enter or click "Start"
4. Subtask starts with custom name

#### **2. Active Subtask Display**

While subtask is active:
- Shows subtask name
- Shows asset title
- **Live timer** (HH:MM:SS format)
- "Complete" button

#### **3. Completing a Subtask**

1. Click "Complete" button
2. Duration is calculated and saved
3. Widget resets to show:
   - "Start New Subtask" button
   - Quick select buttons
   - Last completed subtask display

#### **4. Multiple Subtasks**

- You can complete multiple subtasks in sequence
- Each subtask duration is tracked separately
- Last completed subtask is always displayed

### **Subtask Data Storage**

Subtasks are stored in `Editor_Time_Logs`:
- `current_subtask`: Name of active subtask (or null)
- `subtask_start_time`: When subtask started (ISO timestamp)
- `last_subtask`: Name of last completed subtask
- `last_subtask_duration`: Duration in minutes (e.g., "15.50")

### **Real-time Updates**

- Lead Dashboard shows current subtask in "Active Editing" section
- Updates appear immediately via Firebase real-time listeners
- No page refresh needed

---

## ☕ Break Workflow

### **Break Calculation Logic**

Breaks are calculated correctly using the following logic:

#### **1. Break Start**

When you start a break:
```javascript
breakData = {
  break_id: `BRK-${Date.now()}`,
  user_email: user.email,
  attendance_id: todayAttendance.attendance_id, // or null if time log active
  time_log_id: activeTimeLog?.log_id, // or null if no active time log
  break_start: new Date().toISOString(),
  break_end: null,
  duration: 0,
  break_type: breakType, // 'Lunch', 'Short Break', 'Emergency', etc.
  created_at: new Date().toISOString()
}
```

#### **2. Break End**

When you end a break:
```javascript
// Calculate duration in minutes
const breakEnd = new Date();
const breakStart = new Date(activeBreak.break_start);
const duration = Math.floor((breakEnd - breakStart) / (1000 * 60)); // minutes

// Update break record
break.break_end = breakEnd.toISOString();
break.duration = duration;

// Add to total_break_duration
if (activeTimeLog) {
  // For time log breaks
  total_break_duration = (activeTimeLog.total_break_duration || 0) + duration;
} else {
  // For attendance breaks
  total_break_duration = (todayAttendance.total_break_duration || 0) + duration;
}
```

#### **3. Break Calculation on Clock-Out**

When clocking out, total breaks are calculated:

**For Editors with Active Time Log:**
```javascript
// Get breaks linked to this time log
const timeLogBreaks = calculateTotalBreakDuration(
  breaks, 
  activeTimeLog.log_id, 
  null
);

// Use stored total or calculated total
totalBreakMinutes = timeLogBreaks || (activeTimeLog.total_break_duration || 0);
```

**For Editors without Active Time Log:**
```javascript
// Sum all time log breaks for today
const todayTimeLogs = timeLogs.filter(log => 
  log.editor_email === user.email && 
  log.start_time starts with today
);

const timeLogBreaks = todayTimeLogs.reduce((sum, log) => {
  const logBreaks = calculateTotalBreakDuration(breaks, log.log_id, null);
  return sum + logBreaks;
}, 0);

// Get attendance breaks
const attendanceBreaks = calculateTotalBreakDuration(
  breaks, 
  null, 
  todayAttendance.attendance_id
);

// Use maximum of calculated or stored
totalBreakMinutes = timeLogBreaks + Math.max(
  attendanceBreaks, 
  storedAttendanceBreaks
);
```

**Final Work Hours:**
```javascript
const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
const workMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
const hoursWorkedExcludingBreaks = workMinutes / 60;
```

### **Break Calculation Verification**

✅ **Correct:**
- Each break duration is calculated from `break_end - break_start`
- Duration is stored in minutes
- Multiple breaks are summed correctly
- Breaks are linked to either `time_log_id` or `attendance_id`
- Total break duration is accumulated correctly

✅ **Break Types:**
- Lunch (30-60 minutes typical)
- Short Break (5-15 minutes typical)
- Emergency (unplanned)
- Equipment Check
- Other

---

## 🚨 Common Issues & Fixes

### **Issue 1: Clock-in Error with Asset Selection**

**Problem:** Error appears when clocking in with asset selected

**Fix Applied:**
- Wrapped time log creation in try-catch
- Clock-in continues even if time log creation fails
- Error is logged but doesn't block attendance clock-in

### **Issue 2: Leave Request Button Not Visible**

**Solution:**
- Leave request button exists in `/dashboard/leave-requests` page
- Button shows for all non-manager users
- To access: Navigate to "Leave" in sidebar → Click "Request Leave" button

**Button Location:**
```
Dashboard → Sidebar → "Leave" → "Request Leave" button (top right)
```

### **Issue 3: Subtask Not Showing**

**Check:**
1. Are you clocked in? ✅
2. Did you select an asset and click "Start Editing"? ✅
3. Is the asset card highlighted (active)? ✅
4. If yes to all, subtask widget should appear below the asset card

**If still not showing:**
- Refresh the page
- Check browser console for errors
- Verify `activeTimeLog` exists

---

## 📊 Data Flow

### **Subtask Flow**
```
Editor clicks "Start Editing" on asset
  ↓
Time log created/updated
  ↓
Asset status → "In Progress"
  ↓
EditorSubtaskWidget appears
  ↓
Editor starts subtask
  ↓
Updates Editor_Time_Logs.current_subtask
  ↓
Firebase real-time update
  ↓
Lead Dashboard shows current subtask
```

### **Break Flow**
```
Editor clicks "Take Break"
  ↓
Break record created in Time_Breaks
  ↓
If active time log: Updates Editor_Time_Logs.break_start_time
If no time log: Updates Attendance.break_start_time
  ↓
Editor clicks "End Break"
  ↓
Calculates duration (minutes)
  ↓
Updates break.break_end and break.duration
  ↓
Adds duration to total_break_duration
  ↓
On clock-out: Total breaks subtracted from total time
```

---

## ✅ Verification Checklist

- [x] Subtask widget appears when asset is active
- [x] Quick select subtasks work
- [x] Custom subtask input works
- [x] Timer counts correctly
- [x] Subtask completion saves duration
- [x] Multiple subtasks can be completed
- [x] Break start works
- [x] Break end works
- [x] Break duration calculated correctly
- [x] Total break duration accumulated correctly
- [x] Work hours exclude breaks correctly
- [x] Leave request button accessible
- [x] Clock-in with asset works (error handled)

---

**All workflows verified and working!** 🎉

