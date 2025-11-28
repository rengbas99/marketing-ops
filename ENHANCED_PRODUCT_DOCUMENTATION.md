# Reform Media House - Enhanced Product Documentation
## Complete Workflow Analysis, Edge Cases, Optimizations & Debugging Guide

**Version:** 2.0  
**Last Updated:** 2025-01-XX  
**Purpose:** Comprehensive technical documentation for workflow evaluation, error identification, optimization, and debugging

---

## Table of Contents

1. [Workflow Review & Flow Diagrams](#1-workflow-review--flow-diagrams)
2. [Logical Gaps & Edge Cases](#2-logical-gaps--edge-cases)
3. [State Management Optimizations](#3-state-management-optimizations)
4. [Data Flow Optimizations](#4-data-flow-optimizations)
5. [Error Handling Enhancements](#5-error-handling-enhancements)
6. [Debugging Guidance](#6-debugging-guidance)
7. [Validation Rules & Constraints](#7-validation-rules--constraints)
8. [Status Enumerations & Transitions](#8-status-enumerations--transitions)
9. [Debug Hooks & Logging](#9-debug-hooks--logging)

---

## 1. Workflow Review & Flow Diagrams

### 1.1 Authentication Workflow

```markdown:ENHANCED_PRODUCT_DOCUMENTATION.md
<code_block_to_apply_changes_from>
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                      │
└─────────────────────────────────────────────────────────────┘

User Input (LoginPage)
    │
    ├─→ Email: trim().toLowerCase()
    ├─→ Password: trim()
    │
    └─→ AuthContext.login(email, password)
            │
            ├─→ Check API Configuration
            │   ├─→ No API Key/Sheet ID → Error: "API not configured"
            │   └─→ Continue
            │
            ├─→ Fetch Users Sheet (with retry: 3 attempts, exponential backoff)
            │   ├─→ Attempt 1: 0s delay
            │   ├─→ Attempt 2: 1s delay (if fails)
            │   └─→ Attempt 3: 2s delay (if fails)
            │
            ├─→ Validate Response
            │   ├─→ Empty array → Error: "Users sheet is empty"
            │   └─→ Continue
            │
            ├─→ Find User (case-insensitive email match)
            │   ├─→ Not found → Error: "Invalid email or password"
            │   └─→ Found → Continue
            │
            ├─→ Check Active Status
            │   ├─→ active === 'FALSE' → Error: "Account deactivated"
            │   └─→ Continue
            │
            ├─→ Validate Password (trimmed comparison)
            │   ├─→ Mismatch → Error: "Invalid email or password"
            │   └─→ Match → Success
            │
            └─→ Store User in localStorage
                └─→ Navigate to role-specific dashboard
```

**Edge Cases:**
- Network timeout during Users fetch → Retry with backoff
- User deactivated after login → Check on each protected route
- localStorage cleared → Redirect to login
- Multiple tabs → Shared localStorage state

### 1.2 Clock-In Workflow (All Roles)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOCK-IN FLOW                            │
└─────────────────────────────────────────────────────────────┘

User Clicks "Clock In"
    │
    ├─→ Check Current State
    │   ├─→ Already clocked_in → Error: "Already clocked in"
    │   └─→ Continue
    │
    ├─→ Find Existing Attendance (today, same employee_id)
    │   ├─→ Found + status === 'clocked_out'
    │   │   └─→ UPDATE existing record
    │   │       ├─→ clock_in = now
    │   │       ├─→ clock_out = null
    │   │       ├─→ status = 'clocked_in'
    │   │       └─→ hours_worked = null
    │   │
    │   └─→ Not Found
    │       └─→ CREATE new Attendance record
    │           ├─→ attendance_id = `ATT-${Date.now()}`
    │           ├─→ employee_id = user.email
    │           ├─→ date = today (YYYY-MM-DD)
    │           ├─→ clock_in = now (ISO string)
    │           └─→ status = 'clocked_in'
    │
    ├─→ Role-Specific Actions
    │   │
    │   ├─→ PHOTOGRAPHER
    │   │   ├─→ Show Shoot Selector Modal
    │   │   ├─→ User selects shoot OR "General Shoot"
    │   │   ├─→ shoot_id = selectedShoot || 'GENERAL'
    │   │   └─→ CREATE Photographer_Attendance
    │   │       ├─→ Check duplicate (same shoot_id, same photographer, status='In Progress')
    │   │       ├─→ attendance_id = `PA-${Date.now()}`
    │   │       ├─→ shoot_id = selectedShoot || 'GENERAL'
    │   │       ├─→ start_time = now
    │   │       └─→ status = 'In Progress'
    │   │   └─→ UPDATE Shoots.status = 'in_progress' (if real shoot)
    │   │
    │   ├─→ EDITOR
    │   │   ├─→ Show Asset Selector Modal
    │   │   ├─→ User selects asset OR "No specific asset"
    │   │   └─→ If asset selected:
    │   │       ├─→ Check duplicate Editor_Time_Logs (same asset_id, same editor, !end_time)
    │   │       ├─→ CREATE Editor_Time_Logs
    │   │       │   ├─→ log_id = `LOG-${Date.now()}`
    │   │       │   ├─→ asset_id = selectedAsset
    │   │       │   ├─→ start_time = now
    │   │       │   └─→ task_status = 'Working'
    │   │       └─→ UPDATE Assets
    │   │           ├─→ status = 'In Progress' (or 'Revision' → 'In Progress')
    │   │           └─→ current_editor_status = 'Working'
    │   │
    │   └─→ CONTENT_CREATOR
    │       ├─→ Show Task Selector Modal (if assigned tasks exist)
    │       ├─→ User selects task OR clocks in without task
    │       └─→ If task selected: Same as Editor flow
    │
    ├─→ Optimistic UI Update
    │   ├─→ setTodayAttendance(newAttendance)
    │   ├─→ setClockedIn(true)
    │   └─→ Update local state immediately
    │
    ├─→ API Call (backendAPI.appendRow or updateRow)
    │   ├─→ Success
    │   │   ├─→ Force refresh Attendance sheet
    │   │   └─→ Show success message
    │   │
    │   └─→ Error
    │       ├─→ Rollback optimistic update
    │       ├─→ setClockedIn(false)
    │       └─→ Show error message
    │
    └─→ Auto Clock-Out Timer (starts immediately)
        └─→ Check every minute: if hours >= 12 → auto clock-out
```

**Edge Cases:**
- Clock-in fails after optimistic update → Rollback state
- Multiple clock-ins in same second → Duplicate prevention check
- Clock-in while break is active → Should not happen (break requires clock-in)
- Clock-in with invalid shoot_id → Handle gracefully (GENERAL fallback)

### 1.3 Clock-Out Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOCK-OUT FLOW                           │
└─────────────────────────────────────────────────────────────┘

User Clicks "Clock Out"
    │
    ├─→ Check Active Break
    │   ├─→ If activeBreak exists
    │   │   └─→ Auto-end break first
    │   │       ├─→ Calculate break duration
    │   │       ├─→ Update Time_Breaks.break_end
    │   │       └─→ Update related record.total_break_duration
    │   └─→ Continue
    │
    ├─→ Calculate Work Time
    │   ├─→ clockOutTime = now
    │   ├─→ clockInTime = todayAttendance.clock_in
    │   ├─→ totalMinutes = (clockOutTime - clockInTime) / (1000 * 60)
    │   │
    │   ├─→ Sum Break Time
    │   │   ├─→ If activeTimeLog (Editor):
    │   │   │   └─→ totalBreakMinutes = activeTimeLog.total_break_duration
    │   │   │
    │   │   ├─→ If activeShoot (Photographer):
    │   │   │   └─→ totalBreakMinutes = activeShoot.total_break_duration
    │   │   │
    │   │   └─→ Otherwise:
    │   │       ├─→ Sum all Time_Breaks for today (attendance_id match)
    │   │       └─→ Add Attendance.total_break_duration
    │   │
    │   └─→ workMinutes = Math.max(0, totalMinutes - totalBreakMinutes)
    │       └─→ hoursWorked = workMinutes / 60
    │
    ├─→ UPDATE Attendance
    │   ├─→ clock_out = now
    │   ├─→ status = 'clocked_out'
    │   ├─→ hours_worked = hoursWorked.toFixed(2)
    │   └─→ total_break_duration = totalBreakMinutes
    │
    ├─→ Role-Specific Updates
    │   │
    │   ├─→ PHOTOGRAPHER (if activeShoot)
    │   │   ├─→ UPDATE Photographer_Attendance
    │   │   │   ├─→ end_time = now
    │   │   │   ├─→ status = 'Completed'
    │   │   │   ├─→ work_duration = calculated hours
    │   │   │   └─→ total_break_duration = sum of breaks
    │   │   └─→ UPDATE Shoots.status = 'completed'
    │   │
    │   └─→ EDITOR (if activeTimeLog)
    │       ├─→ UPDATE Editor_Time_Logs
    │       │   ├─→ end_time = now
    │       │   ├─→ task_status = 'Completed'
    │       │   ├─→ work_duration = calculated hours (excludes breaks)
    │       │   └─→ duration = total hours (includes breaks)
    │       └─→ UPDATE Assets
    │           ├─→ status = 'Review'
    │           └─→ current_editor_status = 'Completed'
    │
    ├─→ Force Refresh All Related Sheets
    │   └─→ ['Attendance', 'Photographer_Attendance', 'Editor_Time_Logs', 'Shoots', 'Assets']
    │
    └─→ Show Success Message
        └─→ "Clocked out! You worked Xh Ym (excluding Xh Ym break time)"
```

**Edge Cases:**
- Clock-out while break is active → Auto-end break first
- Negative work time (break > total time) → Math.max(0, ...) prevents negative
- Clock-out fails after break ended → Break is already saved, retry clock-out
- Clock-out with missing clock_in → Should not happen, but handle gracefully

### 1.4 Break Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    BREAK FLOW                                │
└─────────────────────────────────────────────────────────────┘

User Clicks "Take Break"
    │
    ├─→ Validation
    │   ├─→ Check clockedIn → If false: Error "Please clock in first"
    │   ├─→ Check activeBreak → If exists: Error "Already on break"
    │   └─→ Continue
    │
    ├─→ Determine Break Context
    │   ├─→ If activeTimeLog (Editor actively editing)
    │   │   └─→ Link to time_log_id
    │   │
    │   ├─→ If activeShoot (Photographer actively shooting)
    │   │   └─→ Link to photographer_attendance_id
    │   │
    │   └─→ Otherwise (clocked in without task/shoot)
    │       └─→ Link to attendance_id
    │
    ├─→ CREATE Time_Breaks Record
    │   ├─→ break_id = `BRK-${Date.now()}`
    │   ├─→ break_start = now
    │   ├─→ break_end = null
    │   ├─→ duration = 0
    │   ├─→ break_type = selected (Lunch/Coffee/Personal/Other)
    │   └─→ Link to appropriate ID (time_log_id OR attendance_id OR photographer_attendance_id)
    │
    ├─→ UPDATE Related Record
    │   ├─→ If time_log_id:
    │   │   ├─→ Editor_Time_Logs.break_start_time = now
    │   │   ├─→ Editor_Time_Logs.task_status = 'On Break'
    │   │   └─→ Assets.current_editor_status = 'On Break'
    │   │
    │   └─→ If attendance_id:
    │       └─→ Attendance.break_start_time = now
    │
    ├─→ Optimistic UI Update
    │   └─→ setActiveBreak(breakData) (immediately, before API call)
    │
    ├─→ API Call
    │   ├─→ Success → Force refresh
    │   └─→ Error → Rollback setActiveBreak(null)
    │
    └─→ Show Break Timer

End Break:
    │
    ├─→ Calculate Duration
    │   └─→ duration = Math.floor((now - break_start) / (1000 * 60)) // minutes
    │
    ├─→ UPDATE Time_Breaks
    │   ├─→ break_end = now
    │   └─→ duration = calculated minutes
    │
    ├─→ UPDATE Related Record
    │   ├─→ If time_log_id:
    │   │   ├─→ Editor_Time_Logs.break_end_time = now
    │   │   ├─→ Editor_Time_Logs.total_break_duration += duration
    │   │   └─→ Assets.current_editor_status = 'Working'
    │   │
    │   └─→ If attendance_id:
    │       └─→ Attendance.total_break_duration += duration
    │
    └─→ Clear activeBreak state
```

**Edge Cases:**
- Break start fails → Rollback optimistic update
- Break end fails → Break remains active, user can retry
- Browser closes during break → Break remains active, needs manual end or auto-end on next clock-in
- Multiple breaks in same session → Each break tracked separately, summed on clock-out

### 1.5 Task Assignment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│              TASK ASSIGNMENT FLOW (Manager/Lead)            │
└─────────────────────────────────────────────────────────────┘

Navigate to /assign-tasks?action=task
    │
    ├─→ Click "Create New Task"
    │
    ├─→ Fill Form
    │   ├─→ Title (required)
    │   ├─→ Assign To (Editor/Content Creator, required)
    │   ├─→ Deadline (optional)
    │   └─→ Client (optional)
    │
    ├─→ Validation
    │   ├─→ Check required fields → If missing: Error
    │   └─→ Continue
    │
    ├─→ Duplicate Check
    │   ├─→ Find existing asset with:
    │   │   ├─→ Same title
    │   │   ├─→ Same assignee (assigned_editor_email OR assigned_creator_email)
    │   │   ├─→ Same deadline
    │   │   └─→ status !== 'Completed' && status !== 'Final'
    │   │
    │   └─→ If found → Error: "Task already exists"
    │
    ├─→ CREATE Assets Record
    │   ├─→ asset_id = `AST-${Date.now()}`
    │   ├─→ title = form.title
    │   ├─→ assigned_editor_email = assignee (if editor)
    │   ├─→ assigned_creator_email = assignee (if content creator)
    │   ├─→ status = 'To Edit'
    │   ├─→ deadline = form.deadline || null
    │   └─→ client_id = form.client_id || null
    │
    └─→ Force Refresh
        └─→ ['Assets', 'Content_Calendar']
```

### 1.6 Shoot Assignment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│            SHOOT ASSIGNMENT FLOW (Manager/Lead)             │
└─────────────────────────────────────────────────────────────┘

Navigate to /assign-tasks?action=shoot
    │
    ├─→ Click "Assign Shoot"
    │
    ├─→ Fill Form
    │   ├─→ Shoot Name (required)
    │   ├─→ Videographer/Lead (required)
    │   ├─→ Date (required)
    │   ├─→ Time (optional)
    │   ├─→ Location (optional)
    │   └─→ Client (optional)
    │
    ├─→ Validation
    │   └─→ Check required fields
    │
    ├─→ Duplicate Check
    │   ├─→ Find existing shoot with:
    │   │   ├─→ Same name (shoot_name OR title)
    │   │   ├─→ Same photographer_id
    │   │   ├─→ Same date
    │   │   └─→ status !== 'completed' && status !== 'cancelled'
    │   │
    │   └─→ If found → Error: "Shoot already exists"
    │
    ├─→ CREATE Shoots Record
    │   ├─→ shoot_id = `SH-${Date.now()}`
    │   ├─→ title = shoot_name (also stored as shoot_name)
    │   ├─→ photographer_id = selected videographer
    │   ├─→ lead_photographer_email = videographer
    │   ├─→ date = form.date
    │   ├─→ time = form.time || ''
    │   ├─→ location = location_name (also stored as location_name)
    │   ├─→ status = 'scheduled'
    │   └─→ client_id = form.client_id || ''
    │
    └─→ Force Refresh
        └─→ ['Shoots']
```

### 1.7 Editor Task Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  EDITOR TASK WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘

Start Editing:
    │
    ├─→ View Tasks Page (Kanban Board)
    │   └─→ Assets grouped by status: To Edit | In Progress | Review | Revision | Completed
    │
    ├─→ Select Asset from "To Edit" Column
    │
    ├─→ Click "Start Editing"
    │
    ├─→ Duplicate Check
    │   ├─→ Find existing Editor_Time_Logs with:
    │   │   ├─→ Same asset_id
    │   │   ├─→ Same editor_email
    │   │   └─→ end_time === null
    │   │
    │   └─→ If found → Error: "Already editing this asset"
    │
    ├─→ CREATE Editor_Time_Logs
    │   ├─→ log_id = `LOG-${Date.now()}`
    │   ├─→ asset_id = selected asset
    │   ├─→ start_time = now
    │   ├─→ end_time = null
    │   ├─→ task_status = 'Working'
    │   └─→ total_break_duration = 0
    │
    ├─→ UPDATE Assets
    │   ├─→ status = 'In Progress' (or 'Revision' → 'In Progress')
    │   └─→ current_editor_status = 'Working'
    │
    └─→ Asset moves to "In Progress" column

During Editing:
    │
    ├─→ Can Take Breaks (linked to time_log_id)
    ├─→ Can Save Work Links
    ├─→ Can Update Progress (0-100%)
    └─→ Can Finish Editing

Finish Editing:
    │
    ├─→ Auto-end active break (if exists)
    │
    ├─→ Calculate Work Duration
    │   ├─→ totalMinutes = (now - start_time) / (1000 * 60)
    │   ├─→ breakMinutes = total_break_duration
    │   └─→ workMinutes = Math.max(0, totalMinutes - breakMinutes)
    │
    ├─→ UPDATE Editor_Time_Logs
    │   ├─→ end_time = now
    │   ├─→ work_duration = workMinutes / 60
    │   ├─→ duration = totalMinutes / 60
    │   └─→ task_status = 'Completed'
    │
    ├─→ UPDATE Assets
    │   ├─→ status = 'Review'
    │   └─→ current_editor_status = 'Completed'
    │
    └─→ Asset moves to "Review" column
```

### 1.8 Asset Approval Workflow

```
┌─────────────────────────────────────────────────────────────┐
│              ASSET APPROVAL FLOW (Manager/Lead)              │
└─────────────────────────────────────────────────────────────┘

Manager/Lead Views Dashboard
    │
    ├─→ See "Assets Pending Review" Section
    │   └─→ Filter: Assets.status === 'Review'
    │
    ├─→ Click on Asset → Opens ApprovalModal
    │
    ├─→ Three Options:
    │   │
    │   ├─→ APPROVE (Final)
    │   │   ├─→ UPDATE Assets
    │   │   │   ├─→ status = 'Final'
    │   │   │   └─→ current_editor_status = 'Completed'
    │   │   └─→ Asset removed from Review list
    │   │
    │   ├─→ PUBLISH
    │   │   ├─→ UPDATE Assets
    │   │   │   ├─→ status = 'Published'
    │   │   │   └─→ current_editor_status = 'Completed'
    │   │   └─→ Asset removed from Review list
    │   │
    │   └─→ REQUEST REVISION
    │       ├─→ Enter revision_notes (required)
    │       ├─→ UPDATE Assets
    │       │   ├─→ status = 'Revision'
    │       │   ├─→ revision_notes = entered notes
    │       │   └─→ current_editor_status = 'Revision'
    │       └─→ Asset moves to "Revision Needed" column (Editor sees it)
    │
    └─→ Force Refresh Assets
```

### 1.9 Work Hours Calculation Workflow

```
┌─────────────────────────────────────────────────────────────┐
│            WORK HOURS CALCULATION FLOW                      │
└─────────────────────────────────────────────────────────────┘

Manager/Lead Views /work-hours
    │
    ├─→ Select Month (YYYY-MM format)
    │
    ├─→ For Each Employee:
    │   │
    │   ├─→ Check Monthly_Hours Manual Override
    │   │   ├─→ Find record: employee_email + month
    │   │   ├─→ If exists AND hours !== undefined AND hours !== ''
    │   │   │   └─→ RETURN override.hours (skip calculation)
    │   │   └─→ Otherwise → Calculate
    │   │
    │   ├─→ Calculate from Attendance
    │   │   ├─→ Filter: employee_id === employee, date in month, status === 'clocked_out'
    │   │   ├─→ For each record:
    │   │   │   ├─→ If hours_worked exists → Use it
    │   │   │   └─→ Otherwise:
    │   │   │       ├─→ Calculate: (clock_out - clock_in) / (1000 * 60 * 60)
    │   │   │       └─→ Subtract: total_break_duration
    │   │   └─→ Sum all daily hours
    │   │
    │   ├─→ Calculate from Photographer_Attendance
    │   │   ├─→ Filter: photographer_email === employee, status === 'Completed', date in month
    │   │   ├─→ Sum: work_duration OR duration (prefer work_duration)
    │   │   └─→ Add to total
    │   │
    │   ├─→ Calculate from Editor_Time_Logs
    │   │   ├─→ Filter: editor_email === employee, task_status === 'Completed', end_time exists, date in month
    │   │   ├─→ Sum: work_duration OR duration (prefer work_duration)
    │   │   └─→ Add to total
    │   │
    │   └─→ Total = Attendance hours + Shoot hours + Editing hours
    │
    ├─→ Display in Table
    │   └─→ Manager/Lead can manually override
    │
    └─→ Save Override
        └─→ CREATE or UPDATE Monthly_Hours record
```

**Edge Cases:**
- Manual override exists but employee has no attendance → Use override
- Employee has attendance but no override → Calculate from data
- Negative hours (data corruption) → Math.max(0, ...) prevents negative
- Missing break data → Calculate without breaks (may overestimate)

---

## 2. Logical Gaps & Edge Cases

### 2.1 Identified Gaps

#### Gap 1: Race Condition in Clock-In
**Issue:** Two simultaneous clock-ins can both pass duplicate check before either writes to sheet.

**Scenario:**
```
Time 0ms:  User A checks duplicate → None found
Time 1ms:  User B checks duplicate → None found
Time 2ms:  User A creates Attendance record
Time 3ms:  User B creates Attendance record → DUPLICATE
```

**Current Prevention:** Client-side check only (not atomic)

**Recommendation:** Add server-side validation or use optimistic locking

#### Gap 2: Break State After Browser Close
**Issue:** If user closes browser during break, break remains active in database but UI state is lost.

**Scenario:**
1. User starts break at 2:00 PM
2. Browser closes at 2:15 PM
3. User reopens app at 3:00 PM
4. Break is still active in database but UI doesn't show it

**Current Handling:** `useEffect` checks for active breaks on mount

**Status:** ✅ Handled (break detection on page load)

#### Gap 3: Concurrent Edits to Same Asset
**Issue:** No conflict resolution if two editors try to edit same asset.

**Scenario:**
1. Editor A starts editing Asset X
2. Editor B starts editing Asset X (before A's update syncs)
3. Both create Editor_Time_Logs records

**Current Prevention:** Duplicate check for same asset_id + editor_email + !end_time

**Gap:** If Editor B is different person, both can edit (by design?)

#### Gap 4: Manual Override vs Calculated Hours Mismatch
**Issue:** Manual override in Monthly_Hours doesn't validate against calculated hours.

**Scenario:**
1. Employee worked 160 hours in month
2. Manager manually sets 200 hours
3. No validation or warning shown

**Current Handling:** Manual override always takes precedence

**Recommendation:** Show calculated hours alongside override, add warning if difference > 10%

#### Gap 5: Missing Break End on Clock-Out Failure
**Issue:** If clock-out fails after break is ended, break is saved but attendance is not.

**Scenario:**
1. User ends break → Success
2. User clicks clock-out → API fails
3. Break is ended but user is still clocked in

**Current Handling:** Break end happens before clock-out, but if clock-out fails, user remains clocked in (correct behavior)

**Status:** ✅ Handled correctly

#### Gap 6: Status Transition Validation
**Issue:** No validation that status transitions are valid.

**Scenario:**
1. Asset is in "To Edit" status
2. Manager directly sets status to "Published" (skipping Review)
3. No validation prevents this

**Current Handling:** No server-side validation

**Recommendation:** Add status transition rules

### 2.2 Edge Cases

#### Edge Case 1: Clock-In at 11:59 PM, Clock-Out at 12:01 AM
**Issue:** Attendance record date vs actual work date mismatch.

**Current Handling:** Uses `date` field (YYYY-MM-DD) from clock-in time

**Scenario:**
- Clock-in: 2025-01-31 23:59:00 → date = '2025-01-31'
- Clock-out: 2025-02-01 00:01:00 → Still uses date = '2025-01-31'

**Status:** ✅ Handled (date is set on clock-in, not clock-out)

#### Edge Case 2: Multiple Breaks in Same Session
**Issue:** Break duration calculation when multiple breaks exist.

**Current Handling:** Each break tracked separately, summed on clock-out

**Status:** ✅ Handled correctly

#### Edge Case 3: Negative Work Time
**Issue:** If break duration > total time (data corruption).

**Current Handling:** `Math.max(0, totalMinutes - breakMinutes)`

**Status:** ✅ Handled (prevents negative hours)

#### Edge Case 4: Missing Required Fields in Google Sheets
**Issue:** If sheet headers don't match expected format.

**Current Handling:** Case-insensitive header matching in backend API

**Status:** ✅ Handled

#### Edge Case 5: Clock-Out Without Clock-In
**Issue:** User somehow has clocked_out status but no clock_in time.

**Current Handling:** `if (!todayAttendance) return;` prevents action

**Status:** ✅ Handled

#### Edge Case 6: Auto Clock-Out During Break
**Issue:** 12-hour auto clock-out triggers while user is on break.

**Current Handling:** Auto clock-out calls `handleClockOut()`, which auto-ends break first

**Status:** ✅ Handled

#### Edge Case 7: Force Clock-Out While Break Active
**Issue:** Manager force clocks out employee who is on break.

**Current Handling:** Force clock-out in AttendancePage ends all active breaks first

**Status:** ✅ Handled

#### Edge Case 8: Duplicate Shoot with Different Case
**Issue:** "Product Launch" vs "product launch" treated as different.

**Current Handling:** Exact string match (case-sensitive)

**Recommendation:** Normalize to lowercase for duplicate checks

#### Edge Case 9: Work Hours Calculation with Incomplete Data
**Issue:** Employee has attendance but no Photographer_Attendance or Editor_Time_Logs.

**Current Handling:** Each source calculated separately, missing sources return 0

**Status:** ✅ Handled (graceful degradation)

#### Edge Case 10: Revision Notes Not Cleared
**Issue:** Asset moves from Revision → In Progress → Review, but revision_notes remain.

**Current Handling:** revision_notes persist (by design, for reference)

**Status:** ✅ By design (notes remain for history)

---

## 3. State Management Optimizations

### 3.1 Current State Management Issues

#### Issue 1: Redundant State Updates
**Problem:** Multiple `setState` calls in same function can cause unnecessary re-renders.

**Example:**
```javascript
// Current (EditorDashboard.jsx)
setTodayAttendance(updatedAttendance);
setClockedIn(true);
setShowAssetSelector(false);
setSelectedAssetForClockIn('');
```

**Optimization:**
```javascript
// Batch state updates
React.startTransition(() => {
  setTodayAttendance(updatedAttendance);
  setClockedIn(true);
  setShowAssetSelector(false);
  setSelectedAssetForClockIn('');
});
```

#### Issue 2: State Dependencies in useEffect
**Problem:** `useEffect` dependencies can cause infinite loops if not carefully managed.

**Example:**
```javascript
// Current (LeadDashboard.jsx)
useEffect(() => {
  // ... logic
}, [data, user, attendance, today, isClockInLoading, isClockOutLoading]);
```

**Optimization:**
```javascript
// Memoize derived values
const todayAttendanceMemo = useMemo(() => {
  return attendance.find(a => a && a.employee_id === user?.email && a.date === today);
}, [attendance, user?.email, today]);

useEffect(() => {
  // Use memoized value
}, [todayAttendanceMemo, isClockInLoading, isClockOutLoading]);
```

#### Issue 3: Optimistic Updates Not Batched
**Problem:** Optimistic updates happen immediately, but API calls are async, causing flicker.

**Current:** Optimistic update → API call → Force refresh → UI flickers

**Optimization:**
```javascript
// Use React 18 useTransition for smoother updates
const [isPending, startTransition] = useTransition();

const handleClockIn = async () => {
  startTransition(() => {
    // Optimistic update
    setClockedIn(true);
  });
  
  try {
    await addRow(...);
    // No need to update state again, forceRefresh will sync
  } catch (err) {
    // Rollback
    setClockedIn(false);
  }
};
```

### 3.2 Recommended Optimizations

#### Optimization 1: Memoize Expensive Calculations
```javascript
// WorkHoursPage.jsx
const calculateMonthlyHours = useMemo(() => {
  return (employeeEmail, month) => {
    // ... calculation logic
  };
}, [attendance, photographerAttendance, editorTimeLogs, monthlyHours]);
```

#### Optimization 2: Debounce Force Refresh
```javascript
// DataContext.jsx
const debouncedForceRefresh = useMemo(
  () => debounce((sheetNames) => {
    dataSync.forceRefresh(sheetNames);
  }, 300),
  []
);
```

#### Optimization 3: Reduce Polling Frequency for Idle Tabs
```javascript
// DataContext.jsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Reduce polling when tab is hidden
      dataSync.pollInterval = 60000; // 1 minute
    } else {
      // Normal polling when tab is visible
      dataSync.pollInterval = 15000; // 15 seconds
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

---

## 4. Data Flow Optimizations

### 4.1 Current Data Flow Issues

#### Issue 1: Unnecessary Force Refreshes
**Problem:** `forceRefresh` called after every mutation, even if data hasn't changed.

**Example:**
```javascript
// Current
await addRow('Attendance', data);
await forceRefresh(['Attendance']); // Always refreshes, even if no change
```

**Optimization:**
```javascript
// Only refresh if mutation was successful
const result = await addRow('Attendance', data);
if (result.success) {
  await forceRefresh(['Attendance']);
}
```

#### Issue 2: Multiple Sheets Refreshed When Only One Changed
**Problem:** `forceRefresh(['Attendance', 'Editor_Time_Logs', 'Assets'])` refreshes all even if only one changed.

**Optimization:**
```javascript
// Refresh only affected sheets
await forceRefresh(['Attendance']); // Only refresh what changed
// Other sheets will update on next poll cycle
```

#### Issue 3: Polling All Sheets Even When Not Needed
**Problem:** `startPolling('page-name', ['Sheet1', 'Sheet2', ..., 'Sheet12'])` polls all sheets even if page only needs 2.

**Current:** Some pages poll 8+ sheets when they only need 2-3

**Optimization:**
```javascript
// Only poll sheets actually used by the page
startPolling('editor-dashboard', ['Assets', 'Editor_Time_Logs', 'Time_Breaks', 'Attendance']);
// Remove unused sheets from polling
```

### 4.2 Recommended Optimizations

#### Optimization 1: Incremental Data Updates
```javascript
// Instead of full refresh, update only changed rows
const updateDataIncrementally = (sheetName, newRow) => {
  setData(prev => ({
    ...prev,
    [sheetName]: [...prev[sheetName], newRow]
  }));
};
```

#### Optimization 2: Cache Sheet Headers
```javascript
// Cache headers to avoid repeated API calls
const headerCache = new Map();

const getSheetHeaders = async (sheetName) => {
  if (headerCache.has(sheetName)) {
    return headerCache.get(sheetName);
  }
  const headers = await sheetsAPI.getSheetHeaders(sheetName);
  headerCache.set(sheetName, headers);
  return headers;
};
```

#### Optimization 3: Batch Multiple Updates
```javascript
// Instead of multiple forceRefresh calls
await Promise.all([
  updateRow('Attendance', ...),
  updateRow('Editor_Time_Logs', ...),
  updateRow('Assets', ...)
]);
await forceRefresh(['Attendance', 'Editor_Time_Logs', 'Assets']);
```

---

## 5. Error Handling Enhancements

### 5.1 Current Error Handling Issues

#### Issue 1: Generic Error Messages
**Problem:** "Error clocking in: Failed to write to Attendance: Not Found" is too technical.

**Current:**
```javascript
error('Error clocking in: ' + err.message);
```

**Enhancement:**
```javascript
const getErrorMessage = (err, action) => {
  if (err.message.includes('Not Found') || err.message.includes('404')) {
    return `Unable to save ${action}. Please check your internet connection and try again.`;
  }
  if (err.message.includes('timeout')) {
    return `Request timed out. Please try again.`;
  }
  if (err.message.includes('429')) {
    return `Too many requests. Please wait a moment and try again.`;
  }
  return `Unable to ${action}. Please try again.`;
};

error(getErrorMessage(err, 'clock in'));
```

#### Issue 2: No Retry for User Actions
**Problem:** If API call fails, user must manually retry.

**Enhancement:**
```javascript
const retryAction = async (action, maxRetries = 2) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

#### Issue 3: Optimistic Update Rollback Not User-Friendly
**Problem:** If rollback happens, user doesn't know why.

**Enhancement:**
```javascript
// Show toast explaining rollback
error('Changes could not be saved. Your local changes have been reverted. Please try again.');
```

### 5.2 Recommended Enhancements

#### Enhancement 1: Error Recovery UI
```javascript
// Show retry button on error
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-800">{error}</p>
    <button onClick={retryAction} className="mt-2 text-red-600 underline">
      Retry
    </button>
  </div>
)}
```

#### Enhancement 2: Offline Detection
```javascript
// Detect offline state
useEffect(() => {
  const handleOnline = () => {
    // Retry pending actions
    retryPendingActions();
  };
  
  const handleOffline = () => {
    // Show offline indicator
    setOffline(true);
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

#### Enhancement 3: Error Logging Service
```javascript
// Log errors for debugging
const logError = (error, context) => {
  console.error(`[${context}]`, error);
  
  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Send to Sentry, LogRocket, etc.
  }
};
```

---

## 6. Debugging Guidance

### 6.1 API Failures (Sheets Read/Write)

#### Debug Hook: `useApiDebug`
```javascript
// src/hooks/useApiDebug.js
export function useApiDebug() {
  const [apiLogs, setApiLogs] = useState([]);
  
  const logApiCall = (type, sheetName, data, error = null) => {
    const log = {
      timestamp: new Date().toISOString(),
      type, // 'read' | 'write' | 'update'
      sheetName,
      data: JSON.stringify(data).substring(0, 100),
      error: error?.message,
      success: !error
    };
    
    setApiLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50
    console.log('[API Debug]', log);
  };
  
  return { apiLogs, logApiCall };
}
```

#### Usage in Components
```javascript
// In DataContext.jsx
const { logApiCall } = useApiDebug();

const addRow = useCallback(async (sheetName, rowData) => {
  try {
    logApiCall('write', sheetName, rowData);
    await backendAPI.appendRow(sheetName, rowData);
    logApiCall('write', sheetName, rowData, null); // Success
  } catch (err) {
    logApiCall('write', sheetName, rowData, err); // Error
    throw err;
  }
}, []);
```

#### Debug Checklist for API Failures
```
□ Check browser console for error messages
□ Verify API key is set in .env
□ Verify Sheet ID is correct
□ Check Google Sheet permissions (Viewer access)
□ Verify sheet name matches exactly (case-sensitive)
□ Check network tab for HTTP status codes
□ Verify SERVICE_ACCOUNT_KEY is set in Vercel (production)
□ Check Vercel function logs for backend errors
□ Verify sheet headers match expected format
□ Check for rate limiting (429 errors)
```

### 6.2 Optimistic UI Rollback

#### Debug Hook: `useOptimisticDebug`
```javascript
// src/hooks/useOptimisticDebug.js
export function useOptimisticDebug() {
  const [rollbacks, setRollbacks] = useState([]);
  
  const logRollback = (action, reason, previousState, currentState) => {
    const rollback = {
      timestamp: new Date().toISOString(),
      action,
      reason,
      previousState: JSON.stringify(previousState).substring(0, 200),
      currentState: JSON.stringify(currentState).substring(0, 200)
    };
    
    setRollbacks(prev => [rollback, ...prev].slice(0, 20));
    console.warn('[Optimistic Rollback]', rollback);
  };
  
  return { rollbacks, logRollback };
}
```

#### Enhanced Rollback in DataContext
```javascript
// In DataContext.jsx
const { logRollback } = useOptimisticDebug();

const addRow = useCallback(async (sheetName, rowData) => {
  const tempId = `temp-${Date.now()}`;
  const optimisticRow = { ...rowData, _tempId: tempId };
  
  // Store previous state
  const previousState = data[sheetName];
  
  // Optimistic update
  setData(prev => ({
    ...prev,
    [sheetName]: [...(prev[sheetName] || []), optimisticRow]
  }));
  
  try {
    await backendAPI.appendRow(sheetName, rowData);
    // Success - remove temp ID
  } catch (err) {
    // Rollback
    logRollback('addRow', err.message, previousState, data[sheetName]);
    setData(prev => ({
      ...prev,
      [sheetName]: prev[sheetName].filter(row => row._tempId !== tempId)
    }));
    throw err;
  }
}, []);
```

#### Debug Checklist for Optimistic Rollback
```
□ Check console for rollback logs
□ Verify API call actually failed (network tab)
□ Check if rollback state matches previous state
□ Verify temp ID is correctly removed
□ Check for race conditions (multiple rapid clicks)
□ Verify error message is user-friendly
□ Check if UI correctly shows error state
```

### 6.3 Async Race Conditions

#### Debug Hook: `useRaceConditionDebug`
```javascript
// src/hooks/useRaceConditionDebug.js
export function useRaceConditionDebug() {
  const [pendingActions, setPendingActions] = useState(new Map());
  
  const trackAction = (actionId, actionName, data) => {
    setPendingActions(prev => {
      const newMap = new Map(prev);
      newMap.set(actionId, {
        actionName,
        data: JSON.stringify(data).substring(0, 100),
        startTime: Date.now()
      });
      return newMap;
    });
  };
  
  const completeAction = (actionId, success = true) => {
    setPendingActions(prev => {
      const newMap = new Map(prev);
      const action = newMap.get(actionId);
      if (action) {
        const duration = Date.now() - action.startTime;
        console.log(`[Action Complete] ${action.actionName} (${duration}ms)`, { success });
        newMap.delete(actionId);
      }
      return newMap;
    });
  };
  
  const checkRaceCondition = (actionName, data) => {
    const existing = Array.from(pendingActions.values()).find(
      a => a.actionName === actionName && a.data === JSON.stringify(data).substring(0, 100)
    );
    
    if (existing) {
      console.warn(`[Race Condition Detected] ${actionName} already in progress`);
      return true;
    }
    return false;
  };
  
  return { trackAction, completeAction, checkRaceCondition, pendingActions };
}
```

#### Usage Example
```javascript
// In EditorDashboard.jsx
const { trackAction, completeAction, checkRaceCondition } = useRaceConditionDebug();

const handleClockIn = async () => {
  const actionId = `clock-in-${Date.now()}`;
  
  // Check for race condition
  if (checkRaceCondition('clockIn', { email: user.email })) {
    error('Clock-in already in progress. Please wait.');
    return;
  }
  
  trackAction(actionId, 'clockIn', { email: user.email });
  
  try {
    await performClockIn();
    completeAction(actionId, true);
  } catch (err) {
    completeAction(actionId, false);
    throw err;
  }
};
```

#### Debug Checklist for Race Conditions
```
□ Check console for race condition warnings
□ Verify loading states prevent double-clicks
□ Check if duplicate prevention logic is working
□ Verify API calls are not duplicated in network tab
□ Check if state updates are batched correctly
□ Verify debouncing is applied to rapid actions
□ Check for multiple tabs with same user
```

### 6.4 Manual Overrides (Monthly_Hours, Assets)

#### Debug Hook: `useOverrideDebug`
```javascript
// src/hooks/useOverrideDebug.js
export function useOverrideDebug() {
  const [overrides, setOverrides] = useState([]);
  
  const logOverride = (type, originalValue, overrideValue, reason) => {
    const override = {
      timestamp: new Date().toISOString(),
      type, // 'monthly_hours' | 'asset_status' | 'attendance'
      originalValue,
      overrideValue,
      reason,
      difference: overrideValue - originalValue
    };
    
    setOverrides(prev => [override, ...prev].slice(0, 50));
    console.log('[Override]', override);
  };
  
  return { overrides, logOverride };
}
```

#### Usage in WorkHoursPage
```javascript
// In WorkHoursPage.jsx
const { logOverride } = useOverrideDebug();

const handleSaveHours = async (employeeEmail) => {
  const calculatedHours = calculateMonthlyHours(employeeEmail, selectedMonth);
  const overrideHours = parseFloat(editValue);
  
  // Log override if significant difference
  if (Math.abs(overrideHours - calculatedHours) > 5) {
    logOverride(
      'monthly_hours',
      calculatedHours,
      overrideHours,
      `Manual override by ${user.name}`
    );
  }
  
  // Save override
  await updateRow('Monthly_Hours', ...);
};
```

#### Debug Checklist for Manual Overrides
```
□ Check override logs for unexpected changes
□ Verify calculated hours vs override hours
□ Check if override was intentional (user action)
□ Verify override is saved correctly
□ Check if override persists after refresh
□ Verify override takes precedence over calculation
□ Check for multiple overrides in same month
```

---

## 7. Validation Rules & Constraints

### 7.1 Input Validation Rules

#### Email Validation
```javascript
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) && trimmed.length <= 255;
};
```

#### Password Validation
```javascript
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  const trimmed = password.trim();
  return trimmed.length >= 1 && trimmed.length <= 100; // MVP: no complexity requirements
};
```

#### Date Validation
```javascript
const validateDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};
```

#### Hours Validation
```javascript
const validateHours = (hours) => {
  const num = parseFloat(hours);
  return !isNaN(num) && num >= 0 && num <= 24 * 31; // Max 24h * 31 days
};
```

#### Progress Validation
```javascript
const validateProgress = (progress) => {
  const num = parseFloat(progress);
  return !isNaN(num) && num >= 0 && num <= 100;
};
```

### 7.2 Business Logic Constraints

#### Constraint 1: One Attendance Record Per Day
```javascript
// Rule: Only one Attendance record per employee per day
const validateAttendanceUniqueness = (attendance, employeeId, date) => {
  const existing = attendance.filter(
    a => a.employee_id === employeeId && a.date === date
  );
  return existing.length <= 1; // Allow 0 or 1, not 2+
};
```

#### Constraint 2: Break Must Have Start Before End
```javascript
// Rule: break_end must be after break_start
const validateBreak = (breakRecord) => {
  if (!breakRecord.break_start) return false;
  if (breakRecord.break_end) {
    return new Date(breakRecord.break_end) > new Date(breakRecord.break_start);
  }
  return true; // Ongoing break is valid
};
```

#### Constraint 3: Clock-Out Must Be After Clock-In
```javascript
// Rule: clock_out must be after clock_in
const validateAttendance = (attendance) => {
  if (!attendance.clock_in) return false;
  if (attendance.clock_out) {
    return new Date(attendance.clock_out) > new Date(attendance.clock_in);
  }
  return true; // Ongoing attendance is valid
};
```

#### Constraint 4: Work Duration Cannot Exceed Total Duration
```javascript
// Rule: work_duration <= duration (work_duration excludes breaks)
const validateTimeLog = (timeLog) => {
  if (timeLog.duration && timeLog.work_duration) {
    return parseFloat(timeLog.work_duration) <= parseFloat(timeLog.duration);
  }
  return true;
};
```

#### Constraint 5: Status Transitions Must Be Valid
```javascript
// Rule: Asset status transitions
const VALID_STATUS_TRANSITIONS = {
  'To Edit': ['In Progress'],
  'In Progress': ['Review', 'Revision'],
  'Review': ['Final', 'Published', 'Revision'],
  'Revision': ['In Progress'],
  'Final': [], // Terminal
  'Published': [], // Terminal
  'Completed': [] // Terminal
};

const validateStatusTransition = (currentStatus, newStatus) => {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus) || currentStatus === newStatus;
};
```

### 7.3 Data Integrity Constraints

#### Constraint 1: Foreign Key Relationships
```javascript
// Rule: shoot_id in Photographer_Attendance must exist in Shoots
const validateShootReference = (photographerAttendance, shoots) => {
  return photographerAttendance.every(pa => {
    if (!pa.shoot_id || pa.shoot_id === 'GENERAL') return true;
    return shoots.some(s => s.shoot_id === pa.shoot_id);
  });
};
```

#### Constraint 2: Employee Must Exist
```javascript
// Rule: employee_id in Attendance must exist in Users
const validateEmployeeReference = (attendance, users) => {
  return attendance.every(att => {
    return users.some(u => u.email === att.employee_id);
  });
};
```

#### Constraint 3: Break Must Link to Valid Record
```javascript
// Rule: Break must link to attendance_id OR time_log_id OR photographer_attendance_id
const validateBreakLink = (breakRecord) => {
  const hasLink = breakRecord.attendance_id || 
                  breakRecord.time_log_id || 
                  breakRecord.photographer_attendance_id;
  return !!hasLink;
};
```

---

## 8. Status Enumerations & Transitions

### 8.1 Complete Status Definitions

#### Attendance Status
```javascript
const ATTENDANCE_STATUS = {
  CLOCKED_IN: 'clocked_in',
  CLOCKED_OUT: 'clocked_out'
};

// Valid transitions:
// clocked_out → clocked_in (clock-in)
// clocked_in → clocked_out (clock-out)
```

#### Asset Status
```javascript
const ASSET_STATUS = {
  TO_EDIT: 'To Edit',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  REVISION: 'Revision',
  FINAL: 'Final',
  PUBLISHED: 'Published',
  COMPLETED: 'Completed' // Legacy
};

// Valid transitions:
// 'To Edit' → 'In Progress' (start editing)
// 'In Progress' → 'Review' (finish editing)
// 'Review' → 'Final' (approve)
// 'Review' → 'Published' (publish)
// 'Review' → 'Revision' (request revision)
// 'Revision' → 'In Progress' (restart work)
```

#### Shoot Status
```javascript
const SHOOT_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Valid transitions:
// 'scheduled' → 'in_progress' (start shoot)
// 'in_progress' → 'completed' (end shoot)
// 'scheduled' → 'cancelled' (cancel)
// 'in_progress' → 'cancelled' (cancel)
```

#### Leave Request Status
```javascript
const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

// Valid transitions:
// 'Pending' → 'Approved' (manager approve)
// 'Pending' → 'Rejected' (manager reject)
```

#### Content Calendar Status
```javascript
const CALENDAR_STATUS = {
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled'
};

// Valid transitions:
// 'scheduled' → 'published' (publish)
// 'scheduled' → 'cancelled' (cancel)
```

#### Editor Time Log Status
```javascript
const TASK_STATUS = {
  WORKING: 'Working',
  ON_BREAK: 'On Break',
  COMPLETED: 'Completed'
};

// Valid transitions:
// 'Working' → 'On Break' (take break)
// 'On Break' → 'Working' (end break)
// 'Working' → 'Completed' (finish editing)
```

#### Photographer Attendance Status
```javascript
const PHOTOGRAPHER_STATUS = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed'
};

// Valid transitions:
// 'In Progress' → 'Completed' (end shoot)
```

### 8.2 Status Transition Validation Function

```javascript
// src/utils/statusValidation.js
export const validateStatusTransition = (entityType, currentStatus, newStatus) => {
  const transitions = {
    asset: {
      'To Edit': ['In Progress'],
      'In Progress': ['Review', 'Revision'],
      'Review': ['Final', 'Published', 'Revision'],
      'Revision': ['In Progress'],
      'Final': [],
      'Published': [],
      'Completed': []
    },
    shoot: {
      'scheduled': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    },
    leave: {
      'Pending': ['Approved', 'Rejected'],
      'Approved': [],
      'Rejected': []
    },
    calendar: {
      'scheduled': ['published', 'cancelled'],
      'published': [],
      'cancelled': []
    }
  };
  
  const allowed = transitions[entityType]?.[currentStatus] || [];
  return allowed.includes(newStatus) || currentStatus === newStatus;
};
```

---

## 9. Debug Hooks & Logging

### 9.1 Comprehensive Debug Hook

```javascript
// src/hooks/useDebug.js
import { useState, useEffect, useRef } from 'react';

export function useDebug(componentName) {
  const [logs, setLogs] = useState([]);
  const logsRef = useRef([]);
  
  const log = (level, message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: componentName,
      level, // 'info' | 'warn' | 'error' | 'debug'
      message,
      data: JSON.stringify(data).substring(0, 500)
    };
    
    logsRef.current = [logEntry, ...logsRef.current].slice(0, 100);
    setLogs([...logsRef.current]);
    
    // Console output
    const consoleMethod = level === 'error' ? 'error' : 
                         level === 'warn' ? 'warn' : 
                         'log';
    console[consoleMethod](`[${componentName}]`, message, data);
  };
  
  const info = (message, data) => log('info', message, data);
  const warn = (message, data) => log('warn', message, data);
  const error = (message, data) => log('error', message, data);
  const debug = (message, data) => {
    if (import.meta.env.DEV) {
      log('debug', message, data);
    }
  };
  
  return { logs, info, warn, error, debug };
}
```

### 9.2 Usage in Components

```javascript
// In EditorDashboard.jsx
const { info, warn, error: logError, debug } = useDebug('EditorDashboard');

const handleClockIn = async () => {
  info('Clock-in initiated', { email: user.email });
  
  try {
    debug('Checking for existing attendance');
    const existingAttendance = attendance.find(...);
    
    if (existingAttendance) {
      warn('Existing attendance found, updating', { attendance_id: existingAttendance.attendance_id });
    }
    
    await performClockIn();
    info('Clock-in successful');
  } catch (err) {
    logError('Clock-in failed', { error: err.message, stack: err.stack });
    throw err;
  }
};
```

### 9.3 Performance Monitoring Hook

```javascript
// src/hooks/usePerformanceMonitor.js
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState([]);
  
  const measure = (name, fn) => {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        
        setMetrics(prev => [...prev, {
          name,
          duration,
          timestamp: Date.now(),
          success: true
        }].slice(0, 50));
        
        if (duration > 1000) {
          console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (err) {
        const duration = performance.now() - start;
        setMetrics(prev => [...prev, {
          name,
          duration,
          timestamp: Date.now(),
          success: false,
          error: err.message
        }].slice(0, 50));
        throw err;
      }
    };
  };
  
  return { measure, metrics };
}
```

### 9.4 Data Consistency Checker

```javascript
// src/utils/dataConsistencyChecker.js
export function checkDataConsistency(data) {
  const issues = [];
  
  // Check 1: Attendance without clock_in
  data.Attendance?.forEach(att => {
    if (!att.clock_in && att.status === 'clocked_in') {
      issues.push({
        type: 'missing_clock_in',
        sheet: 'Attendance',
        record: att.attendance_id,
        message: 'Attendance record has clocked_in status but no clock_in time'
      });
    }
  });
  
  // Check 2: Break without end but duration > 0
  data.Time_Breaks?.forEach(breakRecord => {
    if (!breakRecord.break_end && breakRecord.duration > 0) {
      issues.push({
        type: 'inconsistent_break',
        sheet: 'Time_Breaks',
        record: breakRecord.break_id,
        message: 'Break has duration but no end time'
      });
    }
  });
  
  // Check 3: Work duration > total duration
  data.Editor_Time_Logs?.forEach(log => {
    if (log.work_duration && log.duration && 
        parseFloat(log.work_duration) > parseFloat(log.duration)) {
      issues.push({
        type: 'invalid_duration',
        sheet: 'Editor_Time_Logs',
        record: log.log_id,
        message: 'Work duration exceeds total duration'
      });
    }
  });
  
  return issues;
}
```

---

## Summary of Recommendations

### Critical Fixes
1. ✅ Add server-side validation for duplicate prevention
2. ✅ Implement status transition validation
3. ✅ Add comprehensive error messages
4. ✅ Implement race condition detection
5. ✅ Add data consistency checks

### Optimizations
1. ✅ Batch state updates with `useTransition`
2. ✅ Memoize expensive calculations
3. ✅ Reduce unnecessary force refreshes
4. ✅ Cache sheet headers
5. ✅ Implement incremental data updates

### Enhancements
1. ✅ Add debug hooks for all workflows
2. ✅ Implement performance monitoring
3. ✅ Add offline detection
4. ✅ Enhance error recovery UI
5. ✅ Add validation rules for all inputs

---

**End of Enhanced Documentation**
```

This documentation includes:

1. Complete workflow diagrams for all major flows
2. Identified logical gaps and edge cases with solutions
3. State management and data flow optimizations
4. Enhanced error handling strategies
5. Debugging guidance with hooks and checklists
6. Validation rules and constraints
7. Complete status enumerations and transitions
8. Debug hooks and logging utilities

Use this to evaluate workflows, identify issues, optimize performance, and debug problems.
