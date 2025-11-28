# Lead Tracking and Update Flow Documentation

**Date:** 2025-01-27  
**Status:** ✅ Implemented

---

## 📋 Overview

This document describes the complete flow for:
1. **Editor Updates** - How editors update their work status and progress
2. **Lead Tracking** - How leads track editor and photographer work
3. **Manual Updates** - How leads manually update shoots and tasks
4. **Real-time Reflection** - How updates reflect on photographers and editors

---

## 🔄 Data Flow Architecture

### **1. Editor Update Flow**

```
Editor Dashboard
  ↓
Editor starts editing asset
  ↓
Creates Editor_Time_Logs record
  ↓
Updates Asset status to "In Progress"
  ↓
Editor updates progress (0-100%)
  ↓
Updates Asset.work_progress
  ↓
Firebase real-time listener
  ↓
Lead Dashboard sees update immediately
```

**Editor Actions:**
- Start/Stop editing
- Update progress percentage
- Add work links
- Take breaks
- Complete editing (moves to Review)

**Data Updates:**
- `Editor_Time_Logs`: start_time, end_time, work_duration, task_status
- `Assets`: work_progress, status, current_editor_status
- `Time_Breaks`: break tracking linked to time_log_id

---

### **2. Lead Tracking Flow**

```
Lead Dashboard
  ↓
Real-time Firebase listeners on:
  - Editor_Time_Logs
  - Photographer_Attendance
  - Assets
  - Shoots
  ↓
Calculates active work:
  - teamEditing: filters timeLogs where end_time is null
  - teamOnShoots: filters attendance where status = 'In Progress'
  ↓
Displays:
  - Editor name, asset title, progress %
  - Current subtask (if any)
  - Time worked
  - Client name
  ↓
Lead can:
  - View Details (see full work history)
  - Update Task/Asset (manual override)
  - Update Shoot (manual override)
```

**Tracking Display:**
- **Active Editing**: Shows editors currently working
  - Editor name
  - Asset title
  - Progress percentage
  - Current subtask (if active)
  - Time worked
  - "Details" button → Opens AssetWorkDetailsModal
  - "Update" button → Opens UpdateAssetModal

- **Active Shoots**: Shows photographers on shoots
  - Photographer name
  - Shoot name
  - Client name
  - Time worked
  - "Update" button → Opens UpdateShootModal

---

### **3. Manual Update Flow (Lead)**

#### **A. Update Shoot**

```
Lead clicks "Update" on Active Shoot card
  ↓
Opens UpdateShootModal
  ↓
Lead modifies:
  - Shoot name
  - Date
  - Photographer assignment
  - Location
  - Client
  - Status (scheduled/in_progress/completed/cancelled)
  - Notes
  ↓
Calls handleUpdateShoot()
  ↓
updateRow(COLLECTIONS.SHOOTS, index, updateData)
  ↓
Firebase write
  ↓
Real-time listener updates:
  - Photographer sees updated shoot details
  - Lead dashboard refreshes
```

**Update Fields:**
- `shoot_name` / `title`
- `photographer_id` / `lead_photographer_email`
- `date`
- `location_name`
- `client_id`
- `status` (scheduled/in_progress/completed/cancelled)
- `notes`
- `updated_at` (auto-set)

**Impact:**
- Photographer sees updated assignment immediately
- Shoot status changes reflect in photographer dashboard
- All shoot-related data updates in real-time

#### **B. Update Task/Asset**

```
Lead clicks "Update" on Active Editing card
  ↓
Opens UpdateAssetModal
  ↓
Lead modifies:
  - Title
  - Assign Editor
  - Assign Content Creator
  - Status (To Edit/In Progress/Review/Revision/etc.)
  - Progress (0-100%)
  - Deadline
  - Notes
  - Revision Notes (if status = Revision)
  ↓
Calls handleUpdateAsset()
  ↓
updateRow(COLLECTIONS.ASSETS, index, updateData)
  ↓
Firebase write
  ↓
Real-time listener updates:
  - Editor sees updated task details
  - Status changes reflect immediately
  - Assignment changes notify new assignee
```

**Update Fields:**
- `title`
- `assigned_editor_email`
- `assigned_creator_email`
- `status` (To Edit/In Progress/Review/Revision/Final/Published/Completed)
- `work_progress` (0-100)
- `deadline`
- `notes`
- `revision_notes` (required if status = Revision)
- `updated_at` (auto-set)

**Impact:**
- Editor sees updated assignment immediately
- Status changes move asset to appropriate column
- Progress updates reflect in editor dashboard
- Revision notes appear when status = Revision

---

### **4. Real-time Reflection Flow**

#### **Firebase Real-time Listeners**

All collections use Firebase real-time listeners:

```javascript
// DataContext.jsx
useEffect(() => {
  if (useFirebase) {
    SHEET_NAMES.forEach(sheetName => {
      const unsubscribe = subscribeToCollection(sheetName, (collectionData) => {
        setData(prev => ({
          ...prev,
          [sheetName]: Array.isArray(collectionData) ? collectionData : []
        }));
      });
      firebaseUnsubscribes.current[sheetName] = unsubscribe;
    });
  }
}, [useFirebase]);
```

**Collections with Real-time Updates:**
- `Shoots` → Photographer sees shoot updates immediately
- `Assets` → Editor sees task updates immediately
- `Editor_Time_Logs` → Lead sees work progress immediately
- `Photographer_Attendance` → Lead sees shoot status immediately

#### **Update Propagation**

```
Lead updates Shoot
  ↓
Firebase write to Shoots collection
  ↓
Firebase real-time listener triggers
  ↓
PhotographerDashboard receives update
  ↓
UI re-renders with new data
  ↓
Photographer sees updated shoot details
```

```
Lead updates Asset
  ↓
Firebase write to Assets collection
  ↓
Firebase real-time listener triggers
  ↓
EditorDashboard receives update
  ↓
UI re-renders with new data
  ↓
Editor sees updated task details
```

```
Editor updates Asset progress
  ↓
Firebase write to Assets collection
  ↓
Firebase real-time listener triggers
  ↓
LeadDashboard receives update
  ↓
UI re-renders with new data
  ↓
Lead sees updated progress in tracking card
```

---

## 🎨 UI Information Display Structure

### **Lead Dashboard - Active Editing Section**

```
┌─────────────────────────────────────────┐
│ Active Editing                          │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Editor Name                   75%   │ │
│ │ Client Name                          │ │
│ │ Asset Title                          │ │
│ │ Working on: Background Design        │ │
│ │                                      │ │
│ │ 2h 15m worked    [Details] [Update] │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Information Displayed:**
- Editor name (from Users collection)
- Client name (from Clients via Shoot)
- Asset title
- Current subtask (if active)
- Progress percentage (badge)
- Time worked (calculated from time log)
- Action buttons:
  - **Details**: Opens AssetWorkDetailsModal (full work history)
  - **Update**: Opens UpdateAssetModal (manual edit)

### **Lead Dashboard - Active Shoots Section**

```
┌─────────────────────────────────────────┐
│ Active Shoots                           │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Photographer Name            In     │ │
│ │ Client Name                  Progress│ │
│ │ Shoot Name                           │ │
│ │                                      │ │
│ │ 3h 30m worked              [Update]  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Information Displayed:**
- Photographer name (from Users collection)
- Client name (from Clients)
- Shoot name
- Status badge
- Time worked (calculated from attendance)
- Action button:
  - **Update**: Opens UpdateShootModal (manual edit)

### **Update Modals**

#### **UpdateShootModal**
- Form fields for all shoot properties
- Dropdown for photographer selection
- Dropdown for client selection
- Status selector
- Notes textarea
- Validation before save

#### **UpdateAssetModal**
- Form fields for all asset properties
- Dropdown for editor assignment
- Dropdown for content creator assignment
- Status selector
- Progress input (0-100%)
- Deadline date picker
- Notes textarea
- Revision notes (shown when status = Revision)
- Validation before save

#### **AssetWorkDetailsModal**
- Total time worked
- Current progress
- Status
- Current work (if active subtask)
- Work sessions list:
  - Start/end times
  - Duration
  - Last subtask completed
  - Task status

---

## 📊 Data Structure

### **Shoots Collection**

```javascript
{
  shoot_id: string,
  shoot_name: string,
  photographer_id: string, // FK to Users.email
  lead_photographer_email: string, // Alternative field
  date: string, // YYYY-MM-DD
  location_name: string,
  client_id: string, // FK to Clients
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
  notes: string,
  created_at: string,
  updated_at: string
}
```

### **Assets Collection**

```javascript
{
  asset_id: string,
  title: string,
  shoot_id: string, // FK to Shoots (optional)
  client_id: string, // FK to Clients (optional)
  assigned_editor_email: string, // FK to Users.email
  assigned_creator_email: string, // FK to Users.email
  status: 'To Edit' | 'In Progress' | 'Review' | 'Revision' | 'Final' | 'Published' | 'Completed',
  work_progress: number, // 0-100
  deadline: string, // ISO date
  notes: string,
  revision_notes: string, // When status = Revision
  current_editor_status: string,
  created_at: string,
  updated_at: string
}
```

### **Editor_Time_Logs Collection**

```javascript
{
  log_id: string,
  asset_id: string, // FK to Assets
  editor_email: string, // FK to Users.email
  start_time: string, // ISO datetime
  end_time: string | null, // ISO datetime
  work_duration: number, // hours
  duration: number, // hours (alias)
  task_status: string, // 'Working' | 'On Break' | 'Completed'
  current_subtask: string | null,
  subtask_start_time: string | null,
  last_subtask: string | null,
  last_subtask_duration: number | null, // minutes
  total_break_duration: number, // minutes
  notes: string,
  created_at: string
}
```

### **Photographer_Attendance Collection**

```javascript
{
  attendance_id: string,
  shoot_id: string, // FK to Shoots
  photographer_email: string, // FK to Users.email
  start_time: string, // ISO datetime
  end_time: string | null, // ISO datetime
  status: 'In Progress' | 'Completed',
  work_duration: number, // hours
  total_break_duration: number, // minutes
  location_name: string,
  notes: string,
  created_at: string
}
```

---

## ✅ Features Implemented

### **Editor Updates**
- ✅ Progress tracking (0-100%)
- ✅ Status updates (In Progress → Review)
- ✅ Subtask tracking
- ✅ Work links
- ✅ Notes
- ✅ Real-time updates to Lead

### **Lead Tracking**
- ✅ Real-time view of active editing sessions
- ✅ Real-time view of active shoots
- ✅ Current subtask display
- ✅ Progress percentage display
- ✅ Time worked calculation
- ✅ Client and asset information
- ✅ View Details button (full work history)
- ✅ Update buttons (manual override)

### **Manual Updates (Lead)**
- ✅ Update Shoot modal
  - All shoot fields editable
  - Photographer assignment
  - Status changes
  - Notes
- ✅ Update Asset/Task modal
  - All asset fields editable
  - Editor/Creator assignment
  - Status changes
  - Progress override
  - Revision notes
- ✅ Real-time propagation to photographers and editors

### **Real-time Reflection**
- ✅ Firebase listeners on all collections
- ✅ Automatic UI updates
- ✅ No manual refresh needed
- ✅ Cross-role visibility
- ✅ Immediate feedback

---

## 🚀 Usage Guide

### **For Editors:**

1. **Update Progress:**
   - While editing, use ProgressTracker component
   - Set progress 0-100%
   - Updates save automatically

2. **Update Status:**
   - Click "Finish Editing" when done
   - Moves asset to Review status
   - Lead sees update immediately

3. **Add Subtasks:**
   - Use EditorSubtaskWidget
   - Start/complete subtasks
   - Lead sees current subtask in tracking

### **For Leads:**

1. **Track Editor Work:**
   - View "Active Editing" section
   - See progress, subtasks, time worked
   - Click "Details" for full history
   - Click "Update" to manually modify

2. **Track Photographer Work:**
   - View "Active Shoots" section
   - See time worked, client, shoot name
   - Click "Update" to modify shoot

3. **Manual Updates:**
   - Update Shoot: Change photographer, date, status, etc.
   - Update Asset: Change assignee, status, progress, etc.
   - All updates reflect immediately on photographer/editor dashboards

---

## 🔧 Technical Implementation

### **Real-time Updates**

All updates use Firebase real-time listeners:

```javascript
// DataContext.jsx
subscribeToCollection(collectionName, (data) => {
  // Updates state automatically
  // Triggers re-render
  // All components using useData() receive updates
});
```

### **Update Functions**

```javascript
// LeadDashboard.jsx
const handleUpdateShoot = async (updateData) => {
  await updateRow(COLLECTIONS.SHOOTS, index, updateData);
  await forceRefresh([COLLECTIONS.SHOOTS]);
};

const handleUpdateAsset = async (updateData) => {
  await updateRow(COLLECTIONS.ASSETS, index, updateData);
  await forceRefresh([COLLECTIONS.ASSETS]);
};
```

### **Tracking Calculations**

```javascript
// Active Editing
const teamEditing = timeLogs
  .filter(log => !log.end_time) // Only active logs
  .map(log => {
    // Calculate time worked
    const workMinutes = totalMinutes - breakMinutes;
    return { ...log, workMinutes, asset, editor, client };
  });

// Active Shoots
const teamOnShoots = photographerAttendance
  .filter(a => a.status === 'In Progress')
  .map(attendance => {
    // Calculate time worked
    const workMinutes = totalMinutes - breakMinutes;
    return { ...attendance, workMinutes, shoot, photographer, client };
  });
```

---

## 📝 Notes

- All updates are validated using Zod schemas
- Updates write to Firebase first, then queue for Google Sheets
- Real-time listeners ensure immediate UI updates
- Manual updates by Lead override editor changes (by design)
- Status changes trigger appropriate workflow transitions
- Revision status requires revision_notes field

---

**Implementation Complete!** 🎉

