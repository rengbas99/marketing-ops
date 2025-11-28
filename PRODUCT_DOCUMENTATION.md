# Reform Media House - Product Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Purpose:** Comprehensive technical and design documentation for evaluation, debugging, and development

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Models & Schema](#2-data-models--schema)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Complete Workflows](#4-complete-workflows)
5. [Technical Stack](#5-technical-stack)
6. [API Architecture](#6-api-architecture)
7. [Component Structure](#7-component-structure)
8. [State Management](#8-state-management)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Error Handling](#10-error-handling)
11. [UI/UX Design System](#11-uiux-design-system)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. System Architecture

### 1.1 Overview

**Application Type:** Single Page Application (SPA)  
**Architecture Pattern:** Client-Server with Serverless Backend  
**Database:** Google Sheets (12 sheets)  
**Deployment:** Vercel (Frontend + Serverless Functions)

### 1.2 Architecture Layers

```markdown:PRODUCT_DOCUMENTATION.md
<code_block_to_apply_changes_from>
```
┌─────────────────────────────────────────────────┐
│           Frontend (React + Vite)                │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Pages      │  │    Components            │ │
│  │   (15 pages) │  │    (13 components)       │ │
│  └──────────────┘  └──────────────────────────┘ │
│  ┌──────────────────────────────────────────┐  │
│  │   Contexts (Auth, Data)                  │  │
│  │   Services (SheetsAPI, BackendAPI)       │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    │
                    │ HTTP/HTTPS
                    ▼
┌─────────────────────────────────────────────────┐
│      Serverless Backend (Vercel Functions)      │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  /api/write  │  │   /api/update            │ │
│  │  (POST)      │  │   (POST)                 │ │
│  └──────────────┘  └──────────────────────────┘ │
│  ┌──────────────────────────────────────────┐  │
│  │   Google Service Account Authentication │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    │
                    │ Google Sheets API v4
                    ▼
┌─────────────────────────────────────────────────┐
│           Google Sheets (Database)               │
│  ┌──────────────────────────────────────────┐  │
│  │   12 Sheets (Users, Clients, Shoots,    │  │
│  │   Assets, Attendance, etc.)             │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 1.3 Key Technologies

- **Frontend Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.2
- **Routing:** React Router DOM 7.9.6
- **Styling:** Tailwind CSS 3.4.18
- **Icons:** Lucide React 0.553.0
- **Backend:** Vercel Serverless Functions
- **Authentication:** Google Service Account (Backend), Email/Password (Frontend)
- **Data Sync:** Smart Polling (15s interval, 10s min fetch)

---

## 2. Data Models & Schema

### 2.1 Google Sheets Structure

The application uses **12 Google Sheets** as the database:

1. **Users** - Employee directory and authentication
2. **Clients** - Client relationship management
3. **Shoots** - Photography shoot scheduling
4. **Assets** - Content files requiring editing/review
5. **Photographer_Attendance** - Photographer shoot attendance
6. **Editor_Time_Logs** - Editor work time tracking
7. **Time_Breaks** - Break tracking for all users
8. **Content_Calendar** - Publishing schedule
9. **Asset_Comments** - Team collaboration comments
10. **Leave_Requests** - Employee leave management
11. **Attendance** - General attendance tracking
12. **Monthly_Hours** - Monthly work hours (manual overrides)

### 2.2 Detailed Schema

#### Sheet 1: Users
```yaml
Columns:
  - email (text, unique, required) - Primary key
  - name (text, required)
  - role (choice: manager|lead|photographer|editor|content_creator|sales, required)
  - password (text, required) - Plain text (MVP)
  - avatar (text/URL, optional)
  - active (boolean, default=TRUE)
  - phone (text, optional)
  - department (text, optional)
  - created_at (datetime, auto)

Relations:
  - email → Attendance.employee_id
  - email → Photographer_Attendance.photographer_email
  - email → Editor_Time_Logs.editor_email
  - email → Assets.assigned_editor_email
  - email → Assets.assigned_creator_email
```

#### Sheet 2: Clients
```yaml
Columns:
  - client_id (text, unique, auto-generated)
  - company_name (text, required, unique)
  - contact_name (text, optional)
  - contact_email (email, optional)
  - contact_phone (text, optional)
  - agreement_status (choice: Pending|Signed|Expired, default=Pending)
  - agreement_link (text/URL, optional)
  - agreement_date (date, optional)
  - next_followup (date, optional)
  - notes (text, optional)
  - created_at (datetime, auto)

Relations:
  - client_id → Shoots.client_id
  - client_id → Assets.client_id (via Shoots)
```

#### Sheet 3: Shoots
```yaml
Columns:
  - shoot_id (text, unique, auto-generated)
  - title (text, required) - Also stored as shoot_name
  - shoot_name (text, required) - Alias for title
  - date (date, required)
  - time (time, optional)
  - location (text, optional) - Also stored as location_name
  - location_name (text, optional) - Alias for location
  - client_id (text, optional) - FK to Clients
  - photographer_id (text, optional) - FK to Users.email
  - lead_photographer_email (text, optional) - FK to Users.email
  - status (choice: scheduled|in_progress|completed|cancelled, default=scheduled)
  - notes (text, optional)
  - created_at (datetime, auto)

Relations:
  - shoot_id → Photographer_Attendance.shoot_id
  - shoot_id → Assets.shoot_id
  - photographer_id → Users.email
```

#### Sheet 4: Assets
```yaml
Columns:
  - asset_id (text, unique, auto-generated)
  - title (text, required)
  - description (text, optional)
  - shoot_id (text, optional) - FK to Shoots
  - client_id (text, optional) - FK to Clients
  - assigned_editor_email (text, optional) - FK to Users.email
  - assigned_creator_email (text, optional) - FK to Users.email
  - status (choice: To Edit|In Progress|Review|Revision|Final|Published|Completed, default=To Edit)
  - current_editor_status (choice: Not Started|Working|Revision|Completed, optional)
  - deadline (date, optional)
  - progress (number, 0-100, optional)
  - work_links (text, optional) - JSON array or comma-separated
  - revision_notes (text, optional)
  - notes (text, optional)
  - comments_count (number, default=0)
  - kudos_count (number, default=0)
  - created_at (datetime, auto)
  - updated_at (datetime, auto)

Relations:
  - asset_id → Editor_Time_Logs.asset_id
  - asset_id → Content_Calendar.asset_id
  - asset_id → Asset_Comments.asset_id
```

#### Sheet 5: Photographer_Attendance
```yaml
Columns:
  - attendance_id (text, unique, auto-generated)
  - shoot_id (text, required) - FK to Shoots (or 'GENERAL')
  - photographer_email (text, required) - FK to Users.email
  - date (date, required)
  - start_time (datetime, required)
  - end_time (datetime, optional)
  - status (choice: In Progress|Completed, default=In Progress)
  - work_links (text, optional) - JSON array or comma-separated
  - work_duration (number, hours, optional) - Calculated
  - duration (number, hours, optional) - Alias for work_duration
  - total_break_duration (number, minutes, optional)
  - notes (text, optional)
  - created_at (datetime, auto)

Relations:
  - shoot_id → Shoots.shoot_id
  - photographer_email → Users.email
```

#### Sheet 6: Editor_Time_Logs
```yaml
Columns:
  - log_id (text, unique, auto-generated)
  - asset_id (text, required) - FK to Assets
  - editor_email (text, required) - FK to Users.email
  - start_time (datetime, required)
  - end_time (datetime, optional)
  - task_status (choice: In Progress|Completed, optional)
  - work_duration (number, hours, optional) - Calculated
  - duration (number, hours, optional) - Alias for work_duration
  - total_break_duration (number, minutes, optional)
  - work_links (text, optional) - JSON array or comma-separated
  - progress (number, 0-100, optional)
  - notes (text, optional)
  - created_at (datetime, auto)

Relations:
  - asset_id → Assets.asset_id
  - editor_email → Users.email
```

#### Sheet 7: Time_Breaks
```yaml
Columns:
  - break_id (text, unique, auto-generated)
  - user_email (text, required) - FK to Users.email
  - attendance_id (text, optional) - FK to Attendance.attendance_id
  - time_log_id (text, optional) - FK to Editor_Time_Logs.log_id
  - photographer_attendance_id (text, optional) - FK to Photographer_Attendance.attendance_id
  - break_start (datetime, required)
  - break_end (datetime, optional)
  - duration (number, minutes, optional) - Calculated
  - break_type (choice: Lunch|Coffee|Personal|Other, optional)
  - created_at (datetime, auto)

Relations:
  - attendance_id → Attendance.attendance_id
  - time_log_id → Editor_Time_Logs.log_id
  - photographer_attendance_id → Photographer_Attendance.attendance_id
```

#### Sheet 8: Content_Calendar
```yaml
Columns:
  - calendar_id (text, unique, auto-generated)
  - asset_id (text, required) - FK to Assets
  - publish_date (date, required)
  - publish_time (time, optional, default=09:00)
  - channel (choice: instagram|facebook|tiktok|youtube|website|email, required)
  - status (choice: scheduled|published|cancelled, default=scheduled)
  - notes (text, optional)
  - created_at (datetime, auto)
  - updated_at (datetime, auto)

Relations:
  - asset_id → Assets.asset_id
```

#### Sheet 9: Asset_Comments
```yaml
Columns:
  - comment_id (text, unique, auto-generated)
  - asset_id (text, required) - FK to Assets
  - user_email (text, required) - FK to Users.email
  - user_name (text, optional) - Lookup from Users
  - comment_text (text, required)
  - timestamp (datetime, auto)
  - edited (boolean, default=FALSE)
  - edited_at (datetime, optional)

Relations:
  - asset_id → Assets.asset_id
  - user_email → Users.email
```

#### Sheet 10: Leave_Requests
```yaml
Columns:
  - request_id (text, unique, auto-generated)
  - employee_email (text, required) - FK to Users.email
  - leave_type (choice: Sick|Casual|Other, required)
  - start_date (date, required)
  - end_date (date, required)
  - days_count (number, calculated)
  - reason (text, required)
  - status (choice: Pending|Approved|Rejected, default=Pending)
  - manager_email (text, optional) - FK to Users.email
  - manager_notes (text, optional)
  - created_at (datetime, auto)
  - updated_at (datetime, auto)

Relations:
  - employee_email → Users.email
  - manager_email → Users.email
```

#### Sheet 11: Attendance
```yaml
Columns:
  - attendance_id (text, unique, auto-generated)
  - employee_id (text, required) - FK to Users.email
  - date (date, required)
  - clock_in (datetime, required)
  - clock_out (datetime, optional)
  - status (choice: clocked_in|clocked_out, default=clocked_in)
  - hours_worked (number, hours, optional) - Calculated (excludes breaks)
  - total_break_duration (number, minutes, optional)
  - break_start_time (datetime, optional)
  - break_end_time (datetime, optional)
  - notes (text, optional)
  - created_at (datetime, auto)

Relations:
  - employee_id → Users.email
```

#### Sheet 12: Monthly_Hours
```yaml
Columns:
  - monthly_hours_id (text, unique, auto-generated)
  - employee_email (text, required) - FK to Users.email
  - month (text, required) - Format: YYYY-MM
  - hours (number, required) - Manual override
  - notes (text, optional)
  - created_at (datetime, auto)
  - updated_at (datetime, auto)

Relations:
  - employee_email → Users.email
```

### 2.3 Status Enumerations

#### Asset Status Flow
```
To Edit → In Progress → Review → [Final | Published | Revision → In Progress]
```

**Valid Statuses:**
- `To Edit` - Initial state, not yet started
- `In Progress` - Editor is actively working
- `Review` - Submitted for manager/lead approval
- `Revision` - Needs changes, returned to editor
- `Final` - Approved, ready for use
- `Published` - Published to platform
- `Completed` - Work finished (legacy)

#### Shoot Status Flow
```
scheduled → in_progress → completed | cancelled
```

**Valid Statuses:**
- `scheduled` - Planned but not started
- `in_progress` - Currently happening
- `completed` - Finished
- `cancelled` - Cancelled

#### Attendance Status
```
clocked_in → clocked_out
```

**Valid Statuses:**
- `clocked_in` - Currently working
- `clocked_out` - Finished for the day

#### Leave Request Status
```
Pending → Approved | Rejected
```

**Valid Statuses:**
- `Pending` - Awaiting manager approval
- `Approved` - Approved by manager
- `Rejected` - Rejected by manager

#### Content Calendar Status
```
scheduled → published | cancelled
```

**Valid Statuses:**
- `scheduled` - Planned for future
- `published` - Already published
- `cancelled` - Cancelled

---

## 3. User Roles & Permissions

### 3.1 Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **manager** | Full system access, user management | Admin |
| **lead** | Team management, approvals, task assignment | Supervisor |
| **photographer** | Shoot management, attendance tracking | Employee |
| **editor** | Task management, asset editing | Employee |
| **content_creator** | Content calendar, task updates | Employee |
| **sales** | Client management (future) | Employee |

### 3.2 Page Access Matrix

| Page | Manager | Lead | Photographer | Editor | Content Creator | Sales |
|------|---------|------|--------------|--------|-----------------|-------|
| Dashboard (Role-specific) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Clients | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Shoots | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tasks | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Assign Tasks | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Calendar | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Team Feed | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Active Work | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Work Hours | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Leave | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.3 Data Access Permissions

#### Read Permissions

| Sheet | Manager | Lead | Photographer | Editor | Content Creator |
|-------|---------|------|--------------|--------|-----------------|
| Users | All | All | All (names/roles) | All (names/roles) | All (names/roles) |
| Clients | All | All | None | None | None |
| Shoots | All | All | Own + Assigned | All | All |
| Assets | All | All | All | Assigned | Assigned |
| Photographer_Attendance | All | All | Own | All | All |
| Editor_Time_Logs | All | All | None | Own | Own |
| Time_Breaks | All | All | Own | Own | Own |
| Content_Calendar | All | All | All | All | All |
| Asset_Comments | All | All | All | All | All |
| Leave_Requests | All | All | Own | Own | Own |
| Attendance | All | All | Own | Own | Own |
| Monthly_Hours | All | All (non-managers) | None | None | None |

#### Write Permissions

| Sheet | Manager | Lead | Photographer | Editor | Content Creator |
|-------|---------|------|--------------|--------|-----------------|
| Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Clients | ✅ | ✅ | ❌ | ❌ | ❌ |
| Shoots | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assets | ✅ | ✅ | ❌ | Own | Own |
| Photographer_Attendance | ✅ | ✅ | Own | ❌ | ❌ |
| Editor_Time_Logs | ✅ | ✅ | ❌ | Own | Own |
| Time_Breaks | ✅ | ✅ | Own | Own | Own |
| Content_Calendar | ✅ | ✅ | ❌ | ❌ | ✅ |
| Asset_Comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leave_Requests | ✅ (approve) | ❌ | Own | Own | Own |
| Attendance | ✅ (force clock-out) | ✅ (force clock-out) | Own | Own | Own |
| Monthly_Hours | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 4. Complete Workflows

### 4.1 Authentication Flow

```
1. User visits /login
2. Enters email + password
3. AuthContext.login() called
4. Fetches Users sheet from Google Sheets
5. Validates email (case-insensitive, trimmed)
6. Validates password (trimmed)
7. Checks active status
8. Stores user in localStorage
9. Redirects to role-specific dashboard
```

**Error Handling:**
- Invalid credentials → "Invalid email or password"
- Inactive user → "Your account has been deactivated"
- API not configured → "Google Sheets API not configured"
- Network error → Retry 3 times with exponential backoff

### 4.2 Clock-In Flow (All Employees)

```
1. User clicks "Clock In" button
2. Check if already clocked in (status === 'clocked_in')
   - If yes → Show error, prevent duplicate
3. Find existing attendance record for today
   - If found and status === 'clocked_out' → Update to 'clocked_in'
   - If not found → Create new Attendance record
4. Set clock_in = now, status = 'clocked_in'
5. Clear clock_out and hours_worked
6. Optimistic UI update
7. Call backendAPI.appendRow() or updateRow()
8. Force refresh Attendance sheet
9. Update local state
10. Show success message
```

**Special Cases:**
- **Photographer:** Can select shoot or "General Shoot"
- **Editor:** Can select asset or "No specific asset"
- **Content Creator:** Can select task or clock in without task

### 4.3 Clock-Out Flow (All Employees)

```
1. User clicks "Clock Out" button
2. Check if active break exists
   - If yes → Auto-end break first
3. Calculate total time: clock_out - clock_in
4. Sum all breaks for today from Time_Breaks
5. Calculate work time: total_time - break_time
6. Update Attendance record:
   - clock_out = now
   - status = 'clocked_out'
   - hours_worked = work_time (in hours)
   - total_break_duration = sum of breaks
7. If photographer with active shoot:
   - Update Photographer_Attendance.end_time
   - Set status = 'Completed'
8. If editor with active task:
   - Update Editor_Time_Logs.end_time
   - Set task_status = 'Completed'
9. Force refresh all related sheets
10. Show success with hours worked
```

**Auto Clock-Out:**
- After 12 hours → Automatically clock out
- Runs every minute check

### 4.4 Break Flow (All Employees)

```
1. User clicks "Take Break" button
2. Check if already on break
   - If yes → Show error, prevent duplicate
3. Check if clocked in
   - If no → Show error
4. Determine break context:
   - If active time log → Link to time_log_id
   - If active shoot attendance → Link to photographer_attendance_id
   - Otherwise → Link to attendance_id
5. Create Time_Breaks record:
   - break_start = now
   - break_end = null
   - break_type = selected (Lunch/Coffee/Personal/Other)
6. Update related record (Attendance/Editor_Time_Logs/Photographer_Attendance):
   - break_start_time = now
7. Optimistic UI update (set activeBreak immediately)
8. Force refresh Time_Breaks and related sheets
9. Show break timer

End Break:
1. User clicks "End Break" button
2. Find active break record
3. Calculate duration: now - break_start
4. Update Time_Breaks:
   - break_end = now
   - duration = calculated minutes
5. Update related record:
   - break_end_time = now
   - total_break_duration += duration
6. Force refresh all sheets
7. Clear activeBreak state
```

### 4.5 Shoot Assignment Flow (Manager/Lead)

```
1. Navigate to /assign-tasks?action=shoot
2. Click "Assign Shoot" button
3. Fill form:
   - Shoot Name (required)
   - Videographer/Lead (required)
   - Date (required)
   - Time (optional)
   - Location (optional)
   - Client (optional)
4. Check for duplicate:
   - Same name + videographer + date + status !== completed/cancelled
   - If duplicate → Show error
5. Create Shoots record:
   - title = shoot_name
   - shoot_name = shoot_name
   - photographer_id = selected videographer
   - lead_photographer_email = selected videographer
   - status = 'scheduled'
6. Force refresh Shoots sheet
7. Show success message
```

### 4.6 Task Assignment Flow (Manager/Lead/Content Creator)

```
1. Navigate to /assign-tasks?action=task
2. Click "Create New Task" button
3. Fill form:
   - Title (required)
   - Assignee (Editor or Content Creator, required)
   - Deadline (optional)
   - Client (optional)
4. Check for duplicate:
   - Same title + assignee + deadline
   - If duplicate → Show error
5. Create Assets record:
   - status = 'To Edit'
   - assigned_editor_email = assignee (if editor)
   - assigned_creator_email = assignee (if content creator)
6. Force refresh Assets and Content_Calendar sheets
7. Show success message
```

### 4.7 Editor Task Workflow

```
Start Editing:
1. Editor views Tasks page (Kanban board)
2. Selects asset from "To Edit" column
3. Clicks "Start Editing"
4. Check for duplicate active time log
   - If exists → Show error
5. Create Editor_Time_Logs record:
   - start_time = now
   - end_time = null
   - task_status = 'In Progress'
6. Update Assets:
   - status = 'In Progress'
   - current_editor_status = 'Working'
7. Force refresh Editor_Time_Logs and Assets
8. Asset moves to "In Progress" column

During Editing:
- Can take breaks (linked to time_log_id)
- Can save work links
- Can update progress (0-100%)

Finish Editing:
1. Click "Finish Editing" button
2. Check if active break exists → Auto-end break
3. Calculate work duration: now - start_time
4. Subtract break time from duration
5. Update Editor_Time_Logs:
   - end_time = now
   - work_duration = calculated hours
   - task_status = 'Completed'
6. Update Assets:
   - status = 'Review'
   - current_editor_status = 'Completed'
7. Force refresh all sheets
8. Asset moves to "Review" column
```

### 4.8 Asset Approval Flow (Manager/Lead)

```
1. Manager/Lead views dashboard
2. Sees "Assets Pending Review" section
3. Clicks on asset → Opens ApprovalModal
4. Options:
   
   Approve (Final):
   - Update Assets: status = 'Final', current_editor_status = 'Completed'
   - Force refresh Assets
   
   Publish:
   - Update Assets: status = 'Published', current_editor_status = 'Completed'
   - Force refresh Assets
   
   Request Revision:
   - Enter revision_notes (required)
   - Update Assets: status = 'Revision', revision_notes = notes, current_editor_status = 'Revision'
   - Force refresh Assets
   - Editor sees asset in "Revision Needed" column with notes
```

### 4.9 Photographer Shoot Workflow

```
Start Shoot:
1. Photographer views Shoots page
2. Selects assigned shoot
3. Clicks "Start Shoot"
4. Check for duplicate active shoot attendance
   - If exists → Show error
5. Create Photographer_Attendance record:
   - shoot_id = selected shoot
   - start_time = now
   - status = 'In Progress'
6. Update Shoots:
   - status = 'in_progress'
7. Force refresh Photographer_Attendance and Shoots

During Shoot:
- Can take breaks (linked to photographer_attendance_id)
- Can save work links
- Timer shows elapsed time

End Shoot:
1. Click "End Shoot" button
2. Check if active break → Auto-end break
3. Calculate work duration: now - start_time
4. Subtract break time
5. Update Photographer_Attendance:
   - end_time = now
   - status = 'Completed'
   - work_duration = calculated hours
6. Update Shoots:
   - status = 'completed'
7. Force refresh all sheets
```

### 4.10 Work Hours Calculation Flow (Manager/Lead)

```
1. Navigate to /work-hours
2. Select month (YYYY-MM format)
3. For each employee:
   
   Check Monthly_Hours:
   - If manual override exists → Use override.hours
   - Otherwise → Calculate from data
   
   Calculate from Attendance:
   - Filter: employee_id = employee, date in month, status = 'clocked_out'
   - Sum: hours_worked (or calculate from clock_in/clock_out - breaks)
   
   Calculate from Photographer_Attendance:
   - Filter: photographer_email = employee, status = 'Completed', date in month
   - Sum: work_duration or duration
   
   Calculate from Editor_Time_Logs:
   - Filter: editor_email = employee, task_status = 'Completed', end_time exists, date in month
   - Sum: work_duration or duration
   
   Total = Attendance hours + Shoot hours + Editing hours

4. Display in table with edit capability
5. Manager/Lead can manually override hours
6. Save to Monthly_Hours sheet
```

### 4.11 Leave Request Flow

```
Submit Leave:
1. Employee navigates to /leave
2. Fills form:
   - Leave Type (Sick/Casual/Other)
   - Start Date
   - End Date
   - Reason
3. Check for duplicate:
   - Same date range + status = Pending
   - If duplicate → Show error
4. Create Leave_Requests record:
   - status = 'Pending'
5. Force refresh Leave_Requests
6. Show success message

Approve/Reject (Manager):
1. Manager views /leave page
2. Sees pending requests
3. Clicks "Approve" or "Reject"
4. Update Leave_Requests:
   - status = 'Approved' or 'Rejected'
   - manager_email = manager.email
   - manager_notes = optional notes
5. Force refresh Leave_Requests
```

---

## 5. Technical Stack

### 5.1 Frontend Dependencies

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.9.6",
  "lucide-react": "^0.553.0",
  "date-fns": "^4.1.0",
  "react-big-calendar": "^1.19.4",
  "recharts": "^3.4.1"
}
```

### 5.2 Backend Dependencies

```json
{
  "googleapis": "^166.0.0",
  "@google-cloud/local-auth": "^3.0.1"
}
```

### 5.3 Build Tools

```json
{
  "vite": "^7.2.2",
  "tailwindcss": "^3.4.18",
  "autoprefixer": "^10.4.22",
  "postcss": "^8.5.6"
}
```

### 5.4 Environment Variables

**Frontend (.env):**
```env
VITE_GOOGLE_SHEET_ID=your_spreadsheet_id
VITE_GOOGLE_API_KEY=your_api_key
VITE_API_URL=/api (optional, defaults to /api)
```

**Backend (Vercel Environment Variables):**
```env
GOOGLE_SHEET_ID=your_spreadsheet_id
SERVICE_ACCOUNT_KEY={"type":"service_account",...} (JSON string)
```

---

## 6. API Architecture

### 6.1 Frontend API Services

#### SheetsAPI (`src/services/sheetsApi.js`)
- **Purpose:** Read-only operations from Google Sheets
- **Authentication:** API Key (public read access)
- **Methods:**
  - `getSheetData(sheetName)` - Fetch all rows from sheet
  - `getSheetHeaders(sheetName)` - Fetch header row
  - `findRowIndex(sheetName, columnName, value)` - Find row by value
- **Features:**
  - Retry logic (3 attempts, exponential backoff)
  - Timeout handling (10s for reads)
  - Graceful error handling (returns [] for 400/404)

#### BackendAPI (`src/services/backendApi.js`)
- **Purpose:** Write operations to Google Sheets
- **Authentication:** Service Account (via serverless functions)
- **Methods:**
  - `appendRow(sheetName, rowData)` - Add new row
  - `updateRow(sheetName, rowIndex, rowData)` - Update existing row
- **Features:**
  - Retry logic (3 attempts, exponential backoff)
  - Timeout handling (15s for writes)
  - 404 error handling (local development)

### 6.2 Serverless API Endpoints

#### POST /api/write
```javascript
Request Body:
{
  sheetName: string,
  rowData: object
}

Response:
{
  success: boolean,
  updatedCells: number,
  updatedRange: string
}

Errors:
- 400: Missing sheetName or rowData
- 500: Service Account not configured
- 500: Failed to write to Google Sheets
```

**Implementation:**
- Uses Google Service Account for authentication
- Case-insensitive header matching
- Auto-creates headers if sheet is empty
- Maps rowData to sheet column order

#### POST /api/update
```javascript
Request Body:
{
  sheetName: string,
  rowIndex: number (1-based, includes header),
  rowData: object
}

Response:
{
  success: boolean,
  updatedCells: number,
  updatedRange: string
}

Errors:
- 400: Missing sheetName, rowIndex, or rowData
- 500: Service Account not configured
- 500: Failed to update Google Sheets
```

**Implementation:**
- Uses Google Service Account for authentication
- Case-insensitive header matching
- Updates specific row by index

### 6.3 Data Sync Architecture

#### DataContext (`src/contexts/DataContext.jsx`)
- **Polling Interval:** 15 seconds
- **Min Fetch Interval:** 10 seconds (prevents excessive requests)
- **Smart Polling:** Only fetches sheets needed by active pages
- **Force Refresh:** Immediate fetch for specific sheets after mutations
- **Optimistic Updates:** UI updates immediately, rolls back on error

**DataSync Class:**
```javascript
class DataSync {
  - pollInterval: 15000ms
  - minFetchInterval: 10000ms
  - activePages: Map<pageName, Set<sheetNames>>
  - lastFetch: { [sheetName]: timestamp }
  
  Methods:
  - startPolling(pageName, sheetNames)
  - stopPolling(pageName)
  - fetchSheets(sheetNames, forceImmediate)
  - forceRefresh(sheetNames)
}
```

---

## 7. Component Structure

### 7.1 Page Components (15)

```
src/pages/
├── LoginPage.jsx                    # Authentication
├── dashboard/
│   ├── ManagerDashboard.jsx         # Manager overview
│   ├── LeadDashboard.jsx            # Lead overview + clock-in
│   ├── PhotographerDashboard.jsx   # Photographer dashboard
│   ├── EditorDashboard.jsx          # Editor Kanban board
│   └── ContentCreatorDashboard.jsx # Content creator dashboard
├── ClientsPage.jsx                  # Client management
├── ShootsPage.jsx                   # Shoot management
├── TasksPage.jsx                    # Task Kanban board
├── AssignTasksPage.jsx              # Task/Shoot assignment
├── CalendarPage.jsx                 # Content calendar
├── TeamFeedPage.jsx                 # Team collaboration
├── AttendancePage.jsx                # Attendance tracking
├── ActiveWorkPage.jsx               # Active workers (Manager/Lead)
├── WorkHoursPage.jsx                # Monthly work hours
├── LeavePage.jsx                    # Leave management
└── SettingsPage.jsx                 # User management (Manager only)
```

### 7.2 Reusable Components (13)

```
src/components/
├── DashboardLayout.jsx              # Main layout with sidebar
├── ConnectionStatus.jsx            # Google Sheets connection indicator
├── ErrorBoundary.jsx               # Error boundary wrapper
├── Toast.jsx                        # Toast notification system
├── ApprovalModal.jsx               # Asset approval modal
├── ApprovalsList.jsx               # List of assets pending review
├── BreakDialog.jsx                 # Break type selection
├── BreakTimer.jsx                  # Break countdown timer
├── ConfirmDialog.jsx               # Confirmation dialogs
├── ProgressTracker.jsx             # Progress update modal
├── WorkLinksModal.jsx              # Work links input modal
├── StartShootForm.jsx              # Start shoot form (legacy)
└── GoogleAuthButton.jsx            # Google OAuth button (deprecated)
```

### 7.3 Context Providers

```
src/contexts/
├── AuthContext.jsx                  # Authentication state
└── DataContext.jsx                  # Data fetching and state
```

### 7.4 Service Layer

```
src/services/
├── sheetsApi.js                     # Google Sheets read API
├── backendApi.js                    # Backend write API
└── googleAuth.js                    # Google OAuth (deprecated)
```

---

## 8. State Management

### 8.1 Authentication State (AuthContext)

```javascript
State:
- user: { email, name, role, avatar } | null
- loading: boolean
- isAuthenticated: boolean

Methods:
- login(email, password): Promise<{success, user?, error?}>
- logout(): void
- getRoleRoute(role): string
```

**Persistence:**
- Stored in `localStorage` as JSON
- Persists across page refreshes
- Cleared on logout

### 8.2 Data State (DataContext)

```javascript
State:
- data: { [sheetName]: Array<object> }
- loading: { [sheetName]: boolean }
- error: string | null
- isConnected: boolean

Methods:
- refreshData(sheetName): Promise<void>
- forceRefresh(sheetNames): Promise<void>
- addRow(sheetName, rowData): Promise<{success}>
- updateRow(sheetName, rowIndex, rowData): Promise<{success}>
- startPolling(pageName, sheetNames): void
- stopPolling(pageName): void
```

**Optimistic Updates:**
- `addRow`: Immediately adds to local state with temp ID
- `updateRow`: Immediately updates local state
- On error: Rolls back optimistic update
- On success: Removes temp ID, refreshes from server

### 8.3 Local Component State

Each page/component manages its own local state:
- Form inputs
- Modal visibility
- Selected items
- Loading states
- Filter/sort preferences

---

## 9. Data Flow Diagrams

### 9.1 Read Flow

```
Component
  │
  ├─→ useData() hook
  │     │
  │     ├─→ DataContext.data[sheetName]
  │     │     │
  │     │     └─→ (if not loaded)
  │     │           │
  │     │           └─→ DataSync.fetchSheets()
  │     │                 │
  │     │                 └─→ sheetsAPI.getSheetData()
  │     │                       │
  │     │                       └─→ Google Sheets API
  │     │                             │
  │     │                             └─→ Google Sheets
  │     │
  │     └─→ Polling (every 15s)
  │           │
  │           └─→ DataSync.fetchSheets()
  │                 │
  │                 └─→ (same as above)
  │
  └─→ Component renders with data
```

### 9.2 Write Flow

```
Component
  │
  ├─→ User action (click button, submit form)
  │     │
  │     ├─→ Optimistic UI update
  │     │     │
  │     │     └─→ setData() (local state)
  │     │
  │     └─→ useData().addRow() or updateRow()
  │           │
  │           ├─→ Optimistic update (temp ID)
  │           │
  │           └─→ backendAPI.appendRow() or updateRow()
  │                 │
  │                 └─→ POST /api/write or /api/update
  │                       │
  │                       └─→ Serverless Function
  │                             │
  │                             ├─→ Google Service Account Auth
  │                             │
  │                             └─→ Google Sheets API (write)
  │                                   │
  │                                   └─→ Google Sheets
  │                                         │
  │                                         └─→ (success)
  │                                               │
  │                                               └─→ forceRefresh()
  │                                                     │
  │                                                     └─→ DataSync.fetchSheets()
  │                                                           │
  │                                                           └─→ (Read Flow)
```

### 9.3 Authentication Flow

```
LoginPage
  │
  ├─→ User enters email + password
  │     │
  │     └─→ AuthContext.login()
  │           │
  │           ├─→ sheetsAPI.getSheetData('Users')
  │           │     │
  │           │     └─→ Google Sheets API
  │           │           │
  │           │           └─→ Google Sheets (Users sheet)
  │           │
  │           ├─→ Validate email (case-insensitive)
  │           ├─→ Validate password
  │           ├─→ Check active status
  │           │
  │           └─→ setUser() + localStorage.setItem()
  │                 │
  │                 └─→ Navigate to role-specific dashboard
```

---

## 10. Error Handling

### 10.1 Error Types

#### Network Errors
- **Detection:** Fetch timeout, network failure
- **Handling:** Retry with exponential backoff (1s, 2s, 4s)
- **User Feedback:** Toast notification

#### API Errors
- **400/404:** Sheet not found → Return empty array, log warning
- **429:** Rate limit → Retry with longer delay
- **500/503:** Server error → Retry, show error message
- **401:** Authentication error → Show error, redirect to login

#### Validation Errors
- **Missing required fields:** Show error message
- **Duplicate entries:** Show error, prevent creation
- **Invalid data format:** Show error, highlight field

#### State Errors
- **Data not loaded:** Show loading state
- **Connection lost:** Show "Syncing..." indicator
- **Optimistic update failed:** Rollback, show error

### 10.2 Error Boundaries

```javascript
<ErrorBoundary>
  <App>
    <Routes>
      {/* All routes */}
    </Routes>
  </App>
</ErrorBoundary>
```

**ErrorBoundary Component:**
- Catches React errors
- Displays fallback UI
- Logs error to console
- Allows app to continue

### 10.3 Toast Notification System

```javascript
const { success, error, warning, info } = useToast();

// Usage:
success('Operation completed!');
error('Something went wrong: ' + err.message);
warning('Please check your input');
info('Data syncing...');
```

**Toast Types:**
- `success` - Green, checkmark icon
- `error` - Red, X icon
- `warning` - Yellow, alert icon
- `info` - Blue, info icon

---

## 11. UI/UX Design System

### 11.1 Color Palette

```css
Primary (Brand):
  - #d5214b (buttons, CTAs, highlights, active states)
  
Secondary:
  - #fdde00 (accents, badges, warnings, hover effects)
  
Background:
  - #ffffff (main background)
  - #f9fafb (gray-50, card backgrounds)
  
Text:
  - #000000 / #1a1a1a (primary text)
  - #666666 (secondary text, metadata)
  - #d5214b (links)
  
Status Colors:
  - Pending/In Progress: #fdde00 (yellow)
  - Completed/Approved: #28a745 (green)
  - Rejected/Cancelled: #dc3545 (red)
  - Review: #17a2b8 (blue)
  - Revision: #fd7e14 (orange)
```

### 11.2 Typography

```css
Headings:
  - Font: system-ui, Avenir, Helvetica, Arial, sans-serif
  - Size: 24px-32px
  - Weight: Bold

Body:
  - Font: system-ui, Avenir, Helvetica, Arial, sans-serif
  - Size: 16px
  - Weight: Regular

Small:
  - Size: 14px
  - Weight: Regular
```

### 11.3 Component Styles

#### Buttons
```css
Primary Button:
  - Background: #d5214b
  - Text: white
  - Border radius: 8px
  - Padding: 12px 24px
  - Hover: scale(1.05)
  - Active: scale(0.95)
  - Shadow: 2px blur, rgba(0,0,0,0.1)

Secondary Button:
  - Background: #fdde00
  - Text: #000000
  - Same styling as primary
```

#### Cards
```css
Card:
  - Background: white
  - Border radius: 12px
  - Padding: 16px-24px
  - Shadow: 2px blur, rgba(0,0,0,0.1)
  - Hover: Slight elevation increase
```

#### Modals
```css
Modal:
  - Background: white
  - Border radius: 12px
  - Padding: 24px
  - Shadow: 2xl
  - Backdrop: rgba(0,0,0,0.3) with blur
  - Animation: fadeIn 0.3s
```

### 11.4 Mobile Responsiveness

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Optimizations:**
- Touch-friendly buttons (min 44x44px)
- Horizontal scroll for Kanban boards
- Collapsible sidebar (hamburger menu)
- Landscape orientation support
- Reduced padding on mobile
- Larger tap targets

**Responsive Patterns:**
```css
Mobile:
  - Single column layout
  - Stacked cards
  - Full-width buttons
  - Bottom navigation (if needed)

Tablet:
  - 2-column grid where appropriate
  - Sidebar always visible
  - Optimized spacing

Desktop:
  - Multi-column layouts
  - Sidebar always visible
  - Hover effects enabled
```

### 11.5 Animation & Transitions

```css
Transitions:
  - Duration: 200ms
  - Easing: cubic-bezier(0.4, 0, 0.2, 1)
  - Properties: color, background-color, border-color, transform, opacity

Animations:
  - fadeIn: 0.3s ease-out
  - slideIn: 0.3s ease-out (from right)
  - scale: transform scale(1.05) on hover, scale(0.95) on active
```

---

## 12. Testing Checklist

### 12.1 Authentication Testing

- [ ] Login with valid credentials
- [ ] Login with invalid email
- [ ] Login with invalid password
- [ ] Login with inactive user
- [ ] Login with case-insensitive email
- [ ] Login with trimmed email/password
- [ ] Logout functionality
- [ ] Session persistence (localStorage)
- [ ] Redirect to role-specific dashboard after login

### 12.2 Clock-In/Out Testing

- [ ] Clock in as Lead
- [ ] Clock in as Photographer (with shoot)
- [ ] Clock in as Photographer (general shoot)
- [ ] Clock in as Editor (with asset)
- [ ] Clock in as Editor (general)
- [ ] Clock in as Content Creator (with task)
- [ ] Clock in as Content Creator (general)
- [ ] Prevent duplicate clock-in
- [ ] Clock out functionality
- [ ] Auto clock-out after 12 hours
- [ ] Hours calculation (excludes breaks)
- [ ] Force clock-out (Manager/Lead)

### 12.3 Break System Testing

- [ ] Take break (all roles)
- [ ] Prevent duplicate breaks
- [ ] End break functionality
- [ ] Break timer display
- [ ] Break time excluded from hours calculation
- [ ] Break linked to attendance_id
- [ ] Break linked to time_log_id
- [ ] Break linked to photographer_attendance_id
- [ ] Auto-end break on clock-out

### 12.4 Task Assignment Testing

- [ ] Create task (Manager/Lead/Content Creator)
- [ ] Assign task to Editor
- [ ] Assign task to Content Creator
- [ ] Prevent duplicate tasks
- [ ] Client field optional
- [ ] Create shoot (Manager/Lead)
- [ ] Assign shoot to Photographer
- [ ] Prevent duplicate shoots
- [ ] Edit shoot (Manager/Lead)
- [ ] Cancel shoot (Manager/Lead)
- [ ] Postpone shoot (Manager/Lead)

### 12.5 Editor Workflow Testing

- [ ] View assigned tasks (Kanban board)
- [ ] Start editing task
- [ ] Prevent duplicate time logs
- [ ] Update progress
- [ ] Save work links
- [ ] Take break during editing
- [ ] Finish editing (moves to Review)
- [ ] View revision notes
- [ ] Restart work on revision

### 12.6 Photographer Workflow Testing

- [ ] View assigned shoots
- [ ] Start shoot
- [ ] Prevent duplicate shoot attendance
- [ ] Save work links
- [ ] Take break during shoot
- [ ] End shoot
- [ ] General shoot option

### 12.7 Approval Workflow Testing

- [ ] View assets in Review (Manager/Lead)
- [ ] Approve asset (Final)
- [ ] Publish asset
- [ ] Request revision with notes
- [ ] Editor sees revision notes
- [ ] Editor can restart work on revision

### 12.8 Work Hours Testing

- [ ] View work hours (Manager/Lead)
- [ ] Select month
- [ ] Calculate hours from Attendance
- [ ] Calculate hours from Photographer_Attendance
- [ ] Calculate hours from Editor_Time_Logs
- [ ] Manual override hours
- [ ] View completed work details
- [ ] Expand work breakdown modal

### 12.9 Data Sync Testing

- [ ] Initial data load
- [ ] Polling every 15 seconds
- [ ] Force refresh after mutations
- [ ] Optimistic updates
- [ ] Rollback on error
- [ ] Connection status indicator
- [ ] Handle missing sheets gracefully
- [ ] Retry on network errors

### 12.10 Mobile Testing

- [ ] Responsive layout
- [ ] Touch-friendly buttons
- [ ] Sidebar toggle
- [ ] Landscape orientation
- [ ] Horizontal scroll (Kanban)
- [ ] Modal positioning
- [ ] Form inputs
- [ ] Navigation

### 12.11 Error Handling Testing

- [ ] Network timeout
- [ ] API 404 error
- [ ] API 500 error
- [ ] Rate limit (429)
- [ ] Missing required fields
- [ ] Duplicate prevention
- [ ] Invalid data format
- [ ] Error boundary

### 12.12 Permission Testing

- [ ] Manager access to all pages
- [ ] Lead access restrictions
- [ ] Photographer access restrictions
- [ ] Editor access restrictions
- [ ] Content Creator access restrictions
- [ ] Unauthorized page redirect
- [ ] Role-based data filtering

---

## Appendix A: Known Issues & Limitations

### A.1 Current Limitations

1. **Password Security:** Passwords stored as plain text (MVP)
2. **No Real-time Updates:** Polling-based, not WebSocket
3. **No Offline Support:** Requires internet connection
4. **Limited File Upload:** Work links are text URLs, not file uploads
5. **No Email Notifications:** Manual communication required
6. **No Audit Log:** No history of who changed what

### A.2 Potential Issues

1. **Google Sheets Rate Limits:** 100 requests per 100 seconds per user
2. **Large Data Sets:** Performance may degrade with 1000+ rows
3. **Concurrent Edits:** No conflict resolution (last write wins)
4. **Browser Compatibility:** Modern browsers only (ES6+)

---

## Appendix B: Deployment

### B.1 Vercel Deployment

1. **Connect GitHub repository**
2. **Set environment variables:**
   - `GOOGLE_SHEET_ID`
   - `SERVICE_ACCOUNT_KEY` (JSON string)
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. **Auto-deploy on push to main**

### B.2 Local Development

```bash
# Frontend only
npm run dev

# Full stack (frontend + serverless functions)
npm run dev:full
# or
npx vercel dev
```

---

## Appendix C: Troubleshooting

### C.1 Common Errors

**"Users sheet is empty"**
- Check Google Sheet has Users tab
- Verify sheet is shared as "Anyone with link can view"
- Check API key has read access

**"Failed to write to Attendance: Not Found"**
- Run `npm run dev:full` for local development
- Or deploy to Vercel
- Check SERVICE_ACCOUNT_KEY is set

**"Invalid email or password"**
- Check email/password in Users sheet
- Verify no extra spaces
- Check active status is TRUE

**"Connection lost"**
- Check internet connection
- Verify API key is valid
- Check Google Sheet permissions
- Review browser console for errors

---

**End of Documentation**
```

This documentation covers:
- System architecture
- Data models (12 sheets)
- User roles and permissions
- Workflows
- Technical stack
- API architecture
- Component structure
- State management
- Data flow
- Error handling
- UI/UX design system
- Testing checklist

Use it to evaluate the app, find errors, and guide development.
