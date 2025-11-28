# GLIDE APP BUILD PROMPT: YourCompany — Ops Dashboard (ENHANCED)

## EXECUTIVE SUMMARY

Build a comprehensive operations management app for a digital marketing team with 5 role-based interfaces, 9 data tables, automated workflows, leave management, time tracking, and team collaboration features. Target: small team (5-20 people), mobile-first design with maps, real-time updates, and polished UI.

---

## 1. APP CONFIGURATION

### Authentication & Access

```yaml
Sign-in Method: Private with Email (Glide default)
Persistent Login: Enabled
User Identification: Users.email column
Role Management: Users.role column (photographer|editor|creative|sales|manager)
Password Reset: Glide automatic
Row Owners: Enabled for user-specific data filtering
Session Timeout: 7 days
```

### Branding & Theme

```yaml
App Name: YourCompany — Ops
Primary Color: #d5214b (buttons, CTAs, highlights, active states)
Secondary Color: #fdde00 (accents, badges, warnings, hover effects)
Background: #ffffff (clean, professional white)
Text Colors:
  - Primary Text: #000000 or #1a1a1a (dark for readability)
  - Secondary Text: #666666 (for metadata, timestamps)
  - Link Color: #d5214b
Button Style: Rounded 8px, bold labels, shadow on hover
Typography: 
  - Headings: Bold, 24px-32px
  - Body: Regular, 16px
  - Small: 14px
Design Philosophy: Sharp, bold, minimal, modern
Logo: Upload company logo → appears in header and login screen
Favicon: Company logo (auto-generated from upload)
Status Badge Colors:
  - Pending/In Progress: #fdde00 (yellow, #fff3cd background)
  - Completed/Approved: #28a745 (green, #d4edda background)
  - Rejected/Cancelled: #dc3545 (red, #f8d7da background)
  - Review: #17a2b8 (blue, #d1ecf1 background)
  - Revision: #fd7e14 (orange, #ffeaa7 background)
Card Shadows: Subtle elevation (2px blur, rgba(0,0,0,0.1))
```

---

## 2. DATA STRUCTURE (9 Google Sheets)

### Sheet 1: Users
```
Columns: 
  - email (text, unique, required)
  - name (text, required)
  - role (choice: photographer|editor|creative|sales|manager, required)
  - avatar (image URL, optional)
  - active (boolean, default=TRUE)
  - phone (text, optional)
  - department (text, optional)
  - created_at (datetime, auto)
Purpose: Employee directory and authentication
Row Owners: email column
Notes: active=TRUE for current employees
```

### Sheet 2: Shoots
```
Columns:
  - shoot_id (text, unique, auto-generated: "SH-"&TEXT(ROW()-1,"0000"))
  - shoot_name (text, required)
  - date (date, required)
  - client_id (text, relation to Clients)
  - photographer_id (text, relation to Users.email where role=photographer)
  - status (choice: scheduled|in_progress|completed|cancelled, default=scheduled)
  - location_name (text, optional)
  - location_address (text, optional)
  - location_gps (location, optional)
  - notes (long text, optional)
  - created_at (datetime, auto)
Purpose: Photography shoot scheduling
Relations: client_id → Clients, photographer_id → Users
```

### Sheet 3: Photographer_Attendance
```
Columns:
  - attendance_id (text, unique, auto-generated: "ATT-"&TEXT(ROW()-1,"0000"))
  - shoot_id (text, relation to Shoots, required)
  - photographer_email (text, relation to Users.email, required)
  - start_time (datetime, required)
  - end_time (datetime, optional)
  - status (choice: In Progress|Completed, default=In Progress)
  - notes (long text, optional)
  - photos (file/image array, multiple, optional)
  - gps_latitude (number, optional)
  - gps_longitude (number, optional)
  - gps_address (text, optional)
  - duration_hours (number, formula: =IF(E2="", "", (E2-D2)*24))
Purpose: Track photographer check-in/out with location proof
Row Owners: photographer_email
GPS: Captures lat/long on form submission via Glide Location component
```

### Sheet 4: Assets
```
Columns:
  - asset_id (text, unique, auto-generated: "AST-"&TEXT(ROW()-1,"0000"))
  - title (text, required)
  - description (long text, optional)
  - shoot_id (text, relation to Shoots, optional)
  - assigned_editor_email (text, relation to Users.email where role IN [editor,creative], optional)
  - status (choice: To Edit|In Progress|Review|Revision|Final|Published, default=To Edit)
  - deadline (date, optional)
  - versions (file array, multiple, optional)
  - thumbnail (image, optional, auto from first version)
  - notes (long text, optional)
  - revision_notes (long text, optional)
  - comments_count (number, default=0)
  - kudos_count (number, default=0)
  - created_at (datetime, auto)
  - updated_at (datetime, auto)
Purpose: Content files requiring editing/review
Row Owners: assigned_editor_email
Counters: comments_count and kudos_count auto-increment via Glide actions
```

### Sheet 5: Editor_Time_Logs
```
Columns:
  - log_id (text, unique, auto-generated: "LOG-"&TEXT(ROW()-1,"0000"))
  - asset_id (text, relation to Assets, required)
  - editor_email (text, relation to Users.email, required)
  - start_time (datetime, required)
  - end_time (datetime, optional)
  - duration (number, formula: =IF(D2="", "", (D2-C2)*24))
  - notes (long text, optional)
Purpose: Track editing work hours per asset
Row Owners: editor_email
```

### Sheet 6: Content_Calendar
```
Columns:
  - calendar_id (text, unique, auto-generated: "CAL-"&TEXT(ROW()-1,"0000"))
  - asset_id (text, relation to Assets, required)
  - publish_date (date, required)
  - publish_time (time, optional, default=09:00)
  - channel (choice: instagram|facebook|tiktok|youtube|website|email, required)
  - status (choice: scheduled|published|cancelled, default=scheduled)
  - notes (long text, optional)
  - created_at (datetime, auto)
Purpose: Publishing schedule across platforms
```

### Sheet 7: Clients
```
Columns:
  - client_id (text, unique, auto-generated: "CLI-"&TEXT(ROW()-1,"0000"))
  - company_name (text, required)
  - contact_name (text, optional)
  - contact_email (email, required)
  - contact_phone (text, optional)
  - agreement_status (choice: Pending|Signed|Expired, default=Pending)
  - agreement_link (file, optional)
  - agreement_date (date, optional)
  - next_followup (date, optional)
  - notes (long text, optional)
  - created_at (datetime, auto)
Purpose: Client relationship management
Agreement Status: Pending, Signed, Expired
Row Owners: Not applicable (sales/manager access only)
```

### Sheet 8: Asset_Comments
```
Columns:
  - comment_id (text, unique, auto-generated: "COM-"&TEXT(ROW()-1,"0000"))
  - asset_id (text, relation to Assets, required)
  - user_email (text, relation to Users.email, required)
  - user_name (text, lookup from Users.name, auto)
  - user_avatar (image, lookup from Users.avatar, auto)
  - comment_text (long text, required)
  - timestamp (datetime, auto, default=now)
  - edited (boolean, default=FALSE)
  - edited_at (datetime, optional)
Purpose: Team collaboration and feedback on assets
Visibility: All authenticated users
Auto-fields: user_email, user_name, timestamp (from current user/time)
```

### Sheet 9: Leave_Requests
```
Columns:
  - request_id (text, unique, auto-generated: "L-"&TEXT(ROW()-1,"0000"))
  - employee_email (text, relation to Users.email, required)
  - leave_type (choice: Sick|Casual|Other, required)
  - start_date (date, required)
  - end_date (date, required)
  - days_count (number, formula: =E2-D2+1)
  - reason (long text, required)
  - status (choice: Pending|Approved|Rejected, default=Pending)
  - manager_email (text, relation to Users.email where role=manager, optional)
  - manager_notes (long text, optional)
  - created_at (datetime, auto)
  - updated_at (datetime, auto)
Purpose: Employee leave application and approval
Row Owners: employee_email
```

---

## 3. RELATIONS (Glide Data Editor)

Configure these relationships in Glide's Data Editor:

```yaml
Relation 1: Shoot_Assets
  From: Shoots.shoot_id
  To: Assets.shoot_id
  Type: Multiple (one shoot → many assets)
  Display: Asset title

Relation 2: Asset_TimeLogs
  From: Assets.asset_id
  To: Editor_Time_Logs.asset_id
  Type: Multiple (one asset → many time logs)
  Display: Duration + editor name

Relation 3: Asset_Comments_Relation
  From: Assets.asset_id
  To: Asset_Comments.asset_id
  Type: Multiple (one asset → many comments)
  Display: Comment text + user name
  Sort: timestamp descending

Relation 4: Asset_Calendar
  From: Assets.asset_id
  To: Content_Calendar.asset_id
  Type: Single (one asset → one calendar entry)
  Display: publish_date + channel

Relation 5: User_Attendance
  From: Users.email
  To: Photographer_Attendance.photographer_email
  Type: Multiple (one user → many attendance records)
  Display: Shoot name + start_time
  Sort: start_time descending

Relation 6: User_ActiveAttendance
  From: Users.email
  To: Photographer_Attendance.photographer_email
  Type: Multiple
  Filter: end_time is empty AND status = "In Progress"
  Display: Shoot name
  Purpose: Shows only active/ongoing shoots

Relation 7: User_LeaveRequests
  From: Users.email
  To: Leave_Requests.employee_email
  Type: Multiple (one user → many leave requests)
  Display: Leave type + date range
  Sort: created_at descending

Relation 8: Client_Shoots
  From: Clients.client_id
  To: Shoots.client_id
  Type: Multiple (one client → many shoots)
  Display: Shoot name + date
  Sort: date descending

Relation 9: Editor_OpenTimeLogs
  From: Assets.asset_id + Editor_Time_Logs.editor_email
  To: Editor_Time_Logs
  Type: Single
  Filter: asset_id = current asset AND editor_email = current user AND end_time is empty
  Purpose: Find the currently active time log for "Finish Editing" action

Relation 10: User_AssignedAssets
  From: Users.email
  To: Assets.assigned_editor_email
  Type: Multiple
  Filter: assigned_editor_email = current user
  Display: Asset title + status
  Sort: deadline ascending

Relation 11: Shoot_Photographer
  From: Shoots.photographer_id
  To: Users.email
  Type: Single
  Display: User name + avatar

Relation 12: Asset_Editor
  From: Assets.assigned_editor_email
  To: Users.email
  Type: Single
  Display: User name + avatar
```

---

## 4. COMPUTED COLUMNS (Glide Data Editor)

Add these computed columns for dynamic data:

```yaml
Users.IsOnShoot (Boolean):
  Type: relation exists
  Check: User_ActiveAttendance relation is not empty
  Purpose: Show "End Shoot" button only when photographer is actively on a shoot

Users.EditorTotalHours (Number):
  Type: rollup
  Source: Editor_Time_Logs via User relation (filter: editor_email = current user)
  Operation: sum(duration)
  Purpose: Display total hours worked by editor

Users.EditorWeekHours (Number):
  Type: rollup
  Source: Editor_Time_Logs via User relation
  Operation: sum(duration)
  Filter: editor_email = current user AND start_time >= (today - 7 days)
  Purpose: Hours worked this week

Users.PendingLeaveCount (Number):
  Type: rollup
  Source: Leave_Requests via User_LeaveRequests relation
  Operation: count
  Filter: status = "Pending"
  Purpose: Badge/notification for pending leave requests

Assets.LatestVersion (File):
  Type: lookup
  Source: versions array
  Operation: last item
  Purpose: Quick access to most recent file upload

Assets.IsOverdue (Boolean):
  Type: formula
  Formula: deadline < today AND status NOT IN ["Final", "Published"]
  Purpose: Highlight overdue tasks

Assets.DaysUntilDeadline (Number):
  Type: formula
  Formula: deadline - today
  Purpose: Show countdown to deadline

Photographer_Attendance.DurationDisplay (Text):
  Type: formula
  Formula: IF(end_time="", "In Progress", TEXT(duration_hours, "0.0") & " hours")
  Purpose: Human-readable duration display

Photographer_Attendance.LocationDisplay (Text):
  Type: formula
  Formula: IF(gps_address="", "Location captured", gps_address)
  Purpose: Show location address or confirmation
```

---

## 5. PAGE STRUCTURE & COMPONENTS

### PAGE 1: Login Screen

**Visibility:** Everyone (before authentication)

**Layout:** Centered, full-screen

```yaml
Components (Vertical Stack, Centered):
  
  - Container (Padding: 40px, Max Width: 400px):
    
    - Image: Company logo
      Size: 200px width, auto height
      Alignment: Center
      Margin Bottom: 30px
    
    - Text Block (Heading 1):
      Text: "Welcome to YourCompany Ops"
      Color: #1a1a1a
      Font Size: 28px
      Font Weight: Bold
      Alignment: Center
      Margin Bottom: 10px
    
    - Text Block (Body):
      Text: "Sign in with your company email to access your dashboard"
      Color: #666666
      Font Size: 16px
      Alignment: Center
      Margin Bottom: 40px
    
    - Glide Sign-in Component:
      Style: Button (Full Width)
      Color: #d5214b
      Label: "Sign In with Email"
      Border Radius: 8px
      Height: 50px
      Font Weight: Bold
      Action: Glide authentication
      Margin Bottom: 20px
    
    - Text Block (Small):
      Text: "Contact admin if you need access"
      Color: #999999
      Font Size: 14px
      Alignment: Center
      Style: Italic

Background: #ffffff
```

---

### PAGE 2: Photographer Dashboard

**Visibility:** `current_user.role = "photographer"`

**Navigation:** Bottom Tab Bar (6 tabs)

**Tab Navigation:** Home | My Shoots | Attendance | Leave | Uploads | Profile

#### Tab: Home

```yaml
Layout: Vertical Stack with Sections

Section 1: Header
  - Text Block (Heading):
      Text: "Welcome back, [User.name]!"
      Font Size: 24px
      Font Weight: Bold
      Color: #1a1a1a
      Margin Bottom: 20px
  
  - Text Block (Subtitle):
      Text: "[Current Date, formatted: "Monday, January 15, 2024"]"
      Font Size: 14px
      Color: #666666

Section 2: Stats Cards (2 columns, responsive)
  Card 1: "Active Shoots"
    - Number: Count where IsOnShoot = true
    - Label: "Active Shoots"
    - Icon: 📸
    - Background: #fff3cd (yellow tint)
    - Border: 2px solid #fdde00
    - Border Radius: 12px
    - Padding: 20px
  
  Card 2: "Completed This Week"
    - Number: Count attendance where status="Completed" and start_time >= week_start
    - Label: "Completed This Week"
    - Icon: ✅
    - Background: #d4edda (green tint)
    - Border: 2px solid #28a745
    - Border Radius: 12px
    - Padding: 20px

Section 3: Quick Actions
  Action Button 1 (Large, Primary):
    Label: "📸 Start Shoot"
    Icon: Camera icon
    Visibility: IsOnShoot = false
    Color: #d5214b
    Height: 60px
    Font Size: 18px
    Font Weight: Bold
    Border Radius: 8px
    Shadow: Yes
    Action: Open Form Screen
    Form Target: Photographer_Attendance
    Form Title: "Start New Shoot"
    Form Fields:
      - shoot_id (Relation Picker → Shoots table)
        Filter: status = "scheduled" AND photographer_id = current user email
        Display: shoot_name + date
        Required: Yes
        Label: "Select Shoot"
      
      - notes (Text Area)
        Placeholder: "Location details, client notes, special instructions..."
        Required: No
        Label: "Notes"
        Rows: 4
      
      - photos (File Upload, Multiple)
        Accept: images only
        Label: "Upload Initial Photos (Optional)"
        Max Files: 10
      
      - Location Component (Glide Location Picker)
        Label: "Capture Location"
        Auto-capture: Yes
        Required: Yes
        Stores: gps_latitude, gps_longitude, gps_address
    
    Form Submit Actions:
      1. Set Column: start_time = Current Time
      2. Set Column: photographer_email = Current User Email
      3. Set Column: status = "In Progress"
      4. Set Column: attendance_id = auto-generated unique ID
      5. If location captured: Set gps_latitude, gps_longitude, gps_address
    
    Success Message: "✅ Shoot started! Don't forget to log your end time."
    Success Action: Navigate to "My Shoots" tab

  Action Button 2 (Secondary):
    Label: "⏹️ End Shoot"
    Icon: Stop icon
    Visibility: IsOnShoot = true
    Color: #28a745
    Height: 60px
    Font Size: 18px
    Font Weight: Bold
    Border Radius: 8px
    Action: Action Sequence
    Steps:
      1. Open Confirmation Dialog:
         Title: "End Shoot?"
         Message: "Are you sure you want to end this shoot? This will log your completion time."
         Buttons: Cancel (gray), End Shoot (green)
      2. If confirmed: Set Columns on User_ActiveAttendance relation
         Updates:
           - end_time = Current Time
           - status = "Completed"
      3. Show Success Message: "✅ Shoot completed. Great work!"
      4. Refresh page data
    
    Display Active Shoot Info:
      - Text: "Currently on: [Shoot Name via relation]"
      - Text: "Started: [start_time, formatted]"
      - Text: "Duration: [calculated duration]"

Section 4: Recent Activity (Optional)
  - List Component (Last 3 completed shoots)
    Data: Photographer_Attendance
    Filter: photographer_email = current user AND status = "Completed"
    Sort: start_time descending
    Limit: 3
    Display: Shoot name, date, duration
```

#### Tab: My Shoots

```yaml
Layout: List (Card style, swipeable)

Data Source: Photographer_Attendance
Filter: photographer_email = Current User Email
Sort: start_time descending

Card Style:
  - Background: White
  - Border: 1px solid #e0e0e0
  - Border Radius: 12px
  - Padding: 16px
  - Margin: 8px
  - Shadow: Subtle

Card Display:
  - Row 1 (Horizontal):
      - Thumbnail Image (if photos exist):
          Source: First photo from photos array
          Size: 80x80px
          Border Radius: 8px
          Aspect Ratio: Square
      - Column (Flex: 1):
          - Shoot Name (Bold, 18px):
              Source: Shoots relation → shoot_name
              Color: #1a1a1a
          - Date (14px, #666666):
              Format: "MMM DD, YYYY"
              Source: start_time
          - Duration (14px, #666666):
              Format: "X.X hours" or "In Progress"
              Source: DurationDisplay computed column
  
  - Row 2:
      - Status Badge:
          Color: Yellow if "In Progress", Green if "Completed"
          Text: Status value
          Padding: 4px 12px
          Border Radius: 12px
          Font Size: 12px
          Font Weight: Bold
  
  - Row 3 (if notes exist):
      - Notes Preview (truncated to 50 chars):
          Color: #666666
          Font Size: 14px

Actions:
  - Tap Card → Detail Screen
  
Detail Screen Components:
  - Header Image (if photos exist):
      Source: First photo, full width, height: 200px
      Object Fit: Cover
  
  - Content Section:
      - Shoot Name (Heading, 24px)
      - Date Range (Subtitle):
          Format: "Started: [start_time] | Ended: [end_time]"
      - Duration (Stat):
          Large number + "hours"
      - Status Badge (large)
      
      - Location Section (if GPS exists):
          - Map Component (Glide Map):
              Latitude: gps_latitude
              Longitude: gps_longitude
              Zoom: 15
              Height: 200px
              Border Radius: 8px
          - Address Text:
              Source: gps_address
              Color: #666666
      
      - Notes Section (if exists):
          - Label: "Notes"
          - Text: notes (full text)
      
      - Photo Gallery (if photos exist):
          - Label: "Photos ([count])"
          - Grid Layout (2 columns)
          - Images: photos array
          - Tap to view full screen
      
      - Action Button: "View Shoot Details"
          Action: Navigate to Shoots detail (via relation)
```

#### Tab: Attendance

```yaml
Layout: 
  - Mobile: Cards (swipeable list)
  - Desktop: Table

Data Source: Photographer_Attendance
Filter: photographer_email = Current User Email
Sort: start_time descending

Mobile Card Display:
  - Date Header (Grouped by date):
      Format: "Monday, January 15"
      Sticky header
  
  - Card (same style as My Shoots):
      - Shoot Name
      - Time Range: "[start_time] - [end_time]"
      - Duration
      - Status Badge
      - Location (if exists): Map thumbnail + address
      - Photos Count: "[X] photos"

Desktop Table:
  Columns:
    - Date (start_time, formatted)
    - Shoot Name
    - Start Time
    - End Time
    - Duration
    - Status
    - Photos (count)
    - Location (map icon, click to view)
  
  Row Style:
    - Hover: Light gray background
    - Border: 1px solid #e0e0e0

Actions:
  - View details (tap row/card)
  - Export to CSV (desktop only, top right button)
```

#### Tab: Leave

```yaml
Layout: List + Floating Action Button

Data Source: Leave_Requests
Filter: employee_email = Current User Email
Sort: created_at descending

Header:
  - Text: "My Leave Requests"
  - Stat Badge: PendingLeaveCount (if > 0, show red badge)

Card Display:
  - Leave Type (Icon + Text, large):
      Icons: 🏥 (Sick), 🏖️ (Casual), 📅 (Other)
      Font Size: 20px
      Font Weight: Bold
  
  - Date Range:
      Format: "MMM DD - MMM DD, YYYY"
      Font Size: 16px
      Color: #1a1a1a
  
  - Days Count:
      Format: "[X] days"
      Color: #666666
  
  - Status Badge:
      Colors: Pending=orange, Approved=green, Rejected=red
      Size: Large
  
  - Reason (truncated to 100 chars):
      Color: #666666
      Font Size: 14px
  
  - Created Date:
      Format: "Applied on [date]"
      Color: #999999
      Font Size: 12px

Floating Action Button (Bottom Right):
  Label: "+"
  Color: #d5214b
  Size: 56px
  Shadow: Yes
  Action: Open Form Screen
  
Form: Leave Request
  Title: "Apply for Leave"
  Fields:
    - leave_type (Choice Picker):
        Options: Sick, Casual, Other
        Icons: 🏥, 🏖️, 📅
        Required: Yes
        Label: "Leave Type"
    
    - start_date (Date Picker):
        Min Date: Today
        Required: Yes
        Label: "Start Date"
    
    - end_date (Date Picker):
        Min Date: start_date
        Required: Yes
        Label: "End Date"
        Validation: Must be >= start_date
    
    - reason (Text Area):
        Placeholder: "Please provide a reason for your leave request..."
        Required: Yes
        Rows: 4
        Label: "Reason"
  
  Form Submit Actions:
    1. Set Column: employee_email = Current User Email
    2. Set Column: status = "Pending"
    3. Set Column: created_at = Current Time
    4. Set Column: request_id = auto-generated
    5. Calculate: days_count = end_date - start_date + 1
  
  Success Message: "✅ Leave request submitted. Manager will review shortly."
  Success Action: Close form, refresh list
```

#### Tab: Uploads

```yaml
Layout: Vertical Stack

Section 1: Upload Area
  - Container (Dashed border, rounded):
      Background: #f8f9fa
      Border: 2px dashed #d5214b
      Border Radius: 12px
      Padding: 40px
      Alignment: Center
  
  - File Upload Component:
      Target: Assets.versions
      Filter: assigned_editor_email contains Current User Email OR shoot photographer = current user
      Multiple: true
      Accept: images, videos, documents
      Action: Append to versions array
      Label: "Drop files here or click to upload"
      Icon: 📤
      Max File Size: 100MB
      Success Message: "Files uploaded successfully!"
  
  - Text (Small):
      Text: "Supported: Images, Videos, PDFs (Max 100MB per file)"
      Color: #999999

Section 2: Recent Uploads
  - Label: "Recent Uploads"
  - List Component:
      Data: Assets (filtered by user's uploads)
      Sort: updated_at descending
      Limit: 20
      Display:
        - Thumbnail (if image)
        - File name
        - Upload date
        - Asset title (if linked)
```

#### Tab: Profile

```yaml
Layout: Vertical Stack, Centered

Components:
  - Avatar (Large, 120px):
      Source: Users.avatar or default
      Border: 4px solid #d5214b
      Border Radius: 50%
  
  - Name (Heading, 24px):
      Source: Users.name
  
  - Email (Text, 16px, #666666):
      Source: Users.email
  
  - Role Badge:
      Text: Users.role (capitalized)
      Color: #d5214b
      Background: #fff3cd
      Padding: 8px 16px
      Border Radius: 20px
  
  - Stats Section (2 columns):
      Stat 1: "Total Shoots"
        Value: Count User_Attendance
      Stat 2: "Hours This Week"
        Value: Sum duration from attendance (this week)
  
  - Action Button: "Edit Profile"
      Action: Open form to edit name, avatar, phone
      Visibility: Current user only
```

---

### PAGE 3: Editor Dashboard

**Visibility:** `current_user.role = "editor" OR current_user.role = "creative"`

**Navigation:** Bottom Tab Bar (7 tabs)

**Tab Navigation:** Home | My Tasks | Revision Tasks | Content Calendar | Leave | History | Profile

#### Tab: Home

```yaml
Layout: Dashboard with stats + quick actions

Section 1: Greeting
  - Text: "Hi [User.name], here's your workload"
  - Font Size: 24px
  - Font Weight: Bold

Section 2: Stats Cards (3 columns, responsive)
  Card 1: "To Edit"
    - Number: Count where status="To Edit" AND assigned_editor_email = current user
    - Label: "To Edit"
    - Icon: 📝
    - Background: #fff3cd
    - Color: #fdde00
  
  Card 2: "In Progress"
    - Number: Count where status="In Progress" AND assigned_editor_email = current user
    - Label: "In Progress"
    - Icon: ⏳
    - Background: #d1ecf1
    - Color: #17a2b8
  
  Card 3: "In Review"
    - Number: Count where status="Review" AND assigned_editor_email = current user
    - Label: "In Review"
    - Icon: 👀
    - Background: #d4edda
    - Color: #28a745

Section 3: Hours This Week
  - Large Stat Card:
      Number: EditorWeekHours
      Label: "Hours This Week"
      Icon: ⏰
      Color: #d5214b
      Size: Large (48px number)

Section 4: Quick Actions
  - Button Row (2 columns):
      Button 1: "View All Tasks"
        Action: Navigate to "My Tasks" tab
        Color: #d5214b
      
      Button 2: "Check Revisions"
        Action: Navigate to "Revision Tasks" tab
        Color: #fd7e14
```

#### Tab: My Tasks

```yaml
Layout: Kanban Board (Cards grouped by status)

Data Source: Assets
Filter: assigned_editor_email = Current User Email AND status IN ["To Edit", "In Progress", "Review"]
Sort: deadline ascending (within each column)

View Options:
  - Toggle: List View / Kanban View
  - Filter: By deadline (Overdue, This Week, All)

Kanban Columns:
  Column 1: "To Edit" (status = "To Edit")
    Background: #fff3cd
    Header: Count badge
  
  Column 2: "In Progress" (status = "In Progress")
    Background: #d1ecf1
    Header: Count badge
  
  Column 3: "Review" (status = "Review")
    Background: #d4edda
    Header: Count badge

Card Style:
  - Background: White
  - Border: 1px solid #e0e0e0
  - Border Radius: 8px
  - Padding: 12px
  - Margin: 8px
  - Shadow: Subtle
  - Min Height: 120px

Card Display:
  - Thumbnail (Assets.thumbnail):
      Size: Full width, height: 100px
      Object Fit: Cover
      Border Radius: 4px
  
  - Title (Assets.title):
      Font Size: 16px
      Font Weight: Bold
      Color: #1a1a1a
      Margin Top: 8px
      Truncate: 2 lines
  
  - Shoot Name (via Shoots relation):
      Font Size: 12px
      Color: #666666
  
  - Deadline (with color coding):
      Font Size: 12px
      Color: 
        - Red if overdue
        - Orange if within 2 days
        - Gray if > 2 days
      Format: "Due: [date]"
  
  - Badges Row:
      - Comments Badge: 💬 [comments_count]
      - Status indicator dot

Card Tap Action: Open Asset Detail Screen

Asset Detail Screen:
  Layout: Scrollable
  
  Section 1: Image Gallery
    - Carousel/Swipeable Gallery:
        Source: versions array
        Full width, height: 300px
        Indicators: Dots
        Tap to fullscreen
  
  Section 2: Header Info
    - Title (24px, Bold)
    - Description (if exists)
    - Status Badge (large)
    - Assigned Shoot Info (via relation)
    - Deadline (prominent, color-coded)
  
  Section 3: Action Buttons (Horizontal Row, Sticky Bottom)
    Button 1: "⏱️ Start Editing"
      Visibility: No open time log exists (Editor_OpenTimeLogs relation is empty)
      Color: #d5214b
      Action: Add Row to Editor_Time_Logs
      Values:
        - asset_id = Current Asset ID
        - editor_email = Current User Email
        - start_time = Current Time
      Success: "⏱️ Timer started! Don't forget to finish when done."
      Show Timer: Display active timer (current time - start_time)
    
    Button 2: "📤 Upload Version"
      Color: #17a2b8
      Action: File Upload
      Target: Assets.versions
      Append: true
      Success: "✅ Version uploaded successfully"
      Refresh: Yes
    
    Button 3: "✅ Mark Ready for Review"
      Visibility: status != "Review" AND status != "Final" AND status != "Published"
      Color: #28a745
      Action: Set Columns on Current Asset
      Updates:
        - status = "Review"
      Success: "✅ Asset sent to review!"
      Confirmation: "Mark this asset as ready for review?"
    
    Button 4: "⏹️ Finish Editing"
      Visibility: Open time log exists (Editor_OpenTimeLogs relation not empty)
      Color: #28a745
      Action: Action Sequence
      Steps:
        1. Set Columns on Editor_OpenTimeLogs relation:
           - end_time = Current Time
           - duration = (end_time - start_time) * 24
        2. Set Columns on Current Asset:
           - status = "Review"
      Success: "✅ Editing completed! Asset in review."
      Confirmation: "Finish editing and send to review?"
  
  Section 4: Comments Thread
    - Label: "Comments ([comments_count])"
    - List Component:
        Data Source: Asset_Comments_Relation
        Filter: asset_id = Current Asset ID
        Sort: timestamp descending
        Display:
          - Row (Horizontal):
              - Avatar (40px, circular):
                  Source: user_avatar or default
              - Column (Flex: 1):
                  - Name (Bold, 14px):
                      Source: user_name
                  - Comment Text (14px):
                      Source: comment_text
                      Color: #1a1a1a
                      Margin: 4px 0
                  - Timestamp (12px, #999999):
                      Format: Relative ("2 hours ago" or "Jan 15, 2:30 PM")
          - Divider (1px solid #e0e0e0)
    
    - Add Comment Section:
        - Text Area:
            Placeholder: "Leave feedback or updates..."
            Rows: 3
        - Button: "Post Comment"
            Color: #d5214b
            Action: Add Row to Asset_Comments
            Form Submit Actions:
              1. Set Column: asset_id = Current Asset ID
              2. Set Column: user_email = Current User Email
              3. Set Column: user_name = Current User Name
              4. Set Column: user_avatar = Current User Avatar
              5. Set Column: timestamp = Current Time
              6. Increment Column: Current Asset.comments_count by 1
            Success: "💬 Comment added!"
            Refresh: Yes
  
  Section 5: Time Logs (if exists)
    - Label: "Time Logged"
    - List: Editor_Time_Logs (via relation)
    - Display: Date, duration, notes
```

#### Tab: Revision Tasks

```yaml
Layout: List (Card style, priority: deadline ascending)

Data Source: Assets
Filter: assigned_editor_email = Current User Email AND status = "Revision"
Sort: deadline ascending

Card Display:
  - Thumbnail (large, 120px)
  - Title (Bold, 18px)
  - "Needs Revision" badge (red, prominent)
  - Revision Notes (highlighted):
      Background: #fff3cd
      Border: 2px solid #fdde00
      Padding: 12px
      Border Radius: 8px
      Text: revision_notes (full text)
      Icon: ⚠️
  - Deadline (red if overdue)
  - Original submission date

Card Tap Action: Open Asset Detail Screen

Action Button (in detail screen):
  Label: "📤 Upload Revised Version"
  Color: #fd7e14
  Size: Large
  Action: Action Sequence
  Steps:
    1. File Upload → Assets.versions (append)
    2. Set Columns on Current Asset:
       - status = "Review"
       - revision_notes = "" (clear notes)
  Success: "✅ Revision uploaded and sent back to review!"
  Confirmation: "Upload revision and send to review?"
```

#### Tab: Content Calendar

```yaml
Layout: Calendar Component (Glide built-in)

Data Source: Content_Calendar
Date Field: publish_date
Time Field: publish_time (optional)

View Modes: Month, Week, Day (toggle buttons)

Calendar Display:
  - Event Card (on calendar):
      - Asset Title (via Assets relation, bold)
      - Channel (with icon):
          Icons: 📷 (instagram), 👥 (facebook), 🎵 (tiktok), ▶️ (youtube), 🌐 (website), 📧 (email)
      - Status Badge (small)
      - Time (if publish_time exists)
      - Thumbnail (small, if asset has thumbnail)

Event Tap Action: Open Detail Screen
  Display:
    - Asset preview (large)
    - Full asset details
    - Channel + publish date/time
    - Status
    - Notes
  Actions (if creative/manager):
    - Edit entry
    - Change status
    - Delete entry

Add Event Button (if creative/manager):
  Label: "+ Schedule Post"
  Action: Form to create calendar entry
  Fields:
    - asset_id (Relation picker)
    - publish_date (Date picker)
    - publish_time (Time picker, optional)
    - channel (Choice picker)
    - status (default: scheduled)
    - notes (optional)
```

#### Tab: Leave
(Same as Photographer Leave tab - see above)

#### Tab: History

```yaml
Layout: List + Stats Card

Section 1: Stats
  - Large Stat Card:
      Number: EditorTotalHours
      Label: "Total Hours Logged"
      Icon: ⏰
      Color: #d5214b
      Size: Large

Section 2: Completed Assets
  Data Source: Assets
  Filter: assigned_editor_email = Current User Email AND status IN ["Final", "Published"]
  Sort: deadline descending

  Card Display:
    - Thumbnail (large, square)
    - Title (Bold)
    - Completion Date
    - Status Badge (green)
    - Kudos Count (star icon + number, prominent)
    - Comments Count
    - Time Logged (sum of related time logs)

  Card Tap: Open asset detail (read-only)
```

---

### PAGE 4: Creative Lead Dashboard

**Visibility:** `current_user.role = "creative"`

**Navigation:** Bottom Tab Bar (7 tabs)

**Tab Navigation:** Home | Calendar | Assets Overview | Assign Tasks | Leave | Approvals | Profile

#### Tab: Home

```yaml
Layout: Dashboard with team overview

Section 1: Greeting
  - Text: "Hello [User.name], here's your team status"
  - Font Size: 24px

Section 2: Stats Cards (4 columns, responsive)
  Card 1: "Total Assets"
    - Number: Count all assets
    - Icon: 📁
    - Color: #17a2b8
  
  Card 2: "Awaiting Review"
    - Number: Count where status="Review"
    - Icon: 👀
    - Color: #fdde00
    - Badge: Red if count > 0
  
  Card 3: "Needs Revision"
    - Number: Count where status="Revision"
    - Icon: ⚠️
    - Color: #fd7e14
  
  Card 4: "Published This Week"
    - Number: Count where status="Published" and calendar.publish_date >= week_start
    - Icon: ✅
    - Color: #28a745

Section 3: Quick Actions
  - Button: "Review Assets" → Navigate to Approvals
  - Button: "Assign Tasks" → Navigate to Assign Tasks
```

#### Tab: Calendar
(Same as Editor Calendar, but with full edit access - see Editor Calendar tab)

#### Tab: Assets Overview

```yaml
Layout: List with Filters and Search

Header:
  - Search Bar (full width)
  - Filter Toggles (horizontal scroll):
      - By Status: All, To Edit, In Progress, Review, Revision, Final, Published
      - By Editor: All editors dropdown
      - By Deadline: Overdue, This Week, This Month, All
      - By Shoot: All shoots dropdown

List Display: Cards (grid, 2 columns on mobile, 3 on tablet, 4 on desktop)

Card Display:
  - Thumbnail (square, 150px)
  - Title (Bold, 16px)
  - Assigned Editor (with avatar, small):
      Source: Asset_Editor relation
  - Status Badge
  - Deadline (color-coded)
  - Comments + Kudos count (small icons)

Card Actions:
  - Tap → Detail screen
  - Long Press / Menu → Quick actions:
      - Assign to Editor
      - Change Status
      - View Comments

Assign Editor Action:
  - Opens Picker: Select from Users where role IN [editor, creative]
  - Updates: assigned_editor_email
  - Success: "Asset assigned to [editor name]"
```

#### Tab: Assign Tasks

```yaml
Layout: Form + Unassigned Assets List

Section 1: Quick Assign Form
  - Asset Picker (Relation):
      Filter: assigned_editor_email is empty OR status = "To Edit"
      Display: title + current editor (if any)
  - Editor Picker (Relation):
      Filter: role IN [editor, creative]
      Display: name + avatar
  - Button: "Assign"
      Action: Set assigned_editor_email
      Success: "Asset assigned!"

Section 2: Unassigned Assets
  - Label: "Unassigned Assets ([count])"
  - List: Assets where assigned_editor_email is empty
  - Display: Thumbnail, title, deadline
  - Action: Tap to assign
```

#### Tab: Approvals

```yaml
Layout: List (Priority: Review status first, sorted by deadline)

Data Source: Assets
Filter: status = "Review"
Sort: deadline ascending

Card Style: Large, prominent

Card Display:
  - Thumbnail (large, 200px height)
  - Title + Description (Bold, 20px)
  - Assigned Editor (name + avatar, large)
  - Deadline (prominent, red if overdue)
  - Comments count (with preview)
  - Latest version preview (small carousel)

Action Buttons (per card, horizontal row):
  
  Button 1: "✅ Approve"
    Style: Success (green, large)
    Action: Set Columns on Current Asset
    Updates:
      - status = "Final"
    Success: "✅ Asset approved!"
    Confirmation: "Approve this asset?"
  
  Button 2: "🚀 Publish"
    Style: Success (green, large)
    Action: Set Columns on Current Asset
    Updates:
      - status = "Published"
    Success: "🚀 Asset published!"
    Confirmation: "Publish this asset now?"
  
  Button 3: "⚠️ Send to Revision"
    Style: Warning (orange, large)
    Action: Open Form Screen
    Form Fields:
      - revision_notes (Text Area, required)
        Placeholder: "Explain what needs to be changed..."
        Rows: 5
        Label: "Revision Notes"
    Form Submit Actions:
      1. Set Columns on Current Asset:
         - status = "Revision"
         - revision_notes = form input value
    Success: "⚠️ Revision request sent to editor"
    Confirmation: "Send this asset back for revision?"

Card Tap: Open full asset detail with all versions
```

---

### PAGE 5: Sales Lead Dashboard

**Visibility:** `current_user.role = "sales"`

**Navigation:** Bottom Tab Bar (6 tabs)

**Tab Navigation:** Home | Clients | Agreements | Leave | Add Client | Profile

#### Tab: Home

```yaml
Layout: Dashboard

Section 1: Greeting
  - Text: "Hi [User.name], manage your client pipeline"

Section 2: Stats Cards (3 columns)
  Card 1: "Total Clients"
    - Number: Count Clients
    - Icon: 👥
  
  Card 2: "Pending Agreements"
    - Number: Count where agreement_status="Pending"
    - Icon: 📄
    - Color: #fdde00
    - Badge: Red if count > 0
  
  Card 3: "Follow-ups This Week"
    - Number: Count where next_followup between today and +7 days
    - Icon: 📅
    - Color: #17a2b8

Section 3: Upcoming Follow-ups
  - List: Clients where next_followup <= today + 7 days
  - Sort: next_followup ascending
  - Display: Company name, follow-up date, status
```

#### Tab: Clients

```yaml
Layout: List (Searchable, sortable)

Header:
  - Search Bar
  - Sort Options: Name, Follow-up Date, Status

Data Source: Clients
Sort: next_followup ascending

Card Display:
  - Company Name (large, bold, 20px)
  - Contact Name (if exists)
  - Contact Email (with mailto link)
  - Contact Phone (with tel link, if exists)
  - Agreement Status Badge:
      Colors: Pending=orange, Signed=green, Expired=red
  - Next Follow-up Date:
      Highlight if within 3 days (orange background)
      Format: "Follow-up: [date]"
  - Notes Preview (truncated, if exists)

Card Tap Action: Client Detail Screen

Client Detail Screen:
  Section 1: Client Info
    - Company Name (Heading)
    - Contact Details (email, phone)
    - Agreement Status (large badge)
    - Agreement Date (if signed)
  
  Section 2: Agreement
    - Status Badge
    - Agreement Link (download button, if exists)
    - Upload/Update Agreement Button:
        Action: File Upload → agreement_link
        Then: Set agreement_status = "Signed"
        Then: Set agreement_date = Today
  
  Section 3: Related Shoots
    - List: Client_Shoots relation
    - Display: Shoot name, date, status
    - Tap to view shoot details
  
  Section 4: Actions
    - Button: "Edit Client Info"
    - Button: "Schedule Follow-up"
      Action: Date Picker → updates next_followup
    - Button: "Add Notes"
      Action: Text Area → updates notes
```

#### Tab: Agreements

```yaml
Layout: List with Upload Action

Data Source: Clients
Filter: agreement_status != "Signed" (optional toggle to show all)
Sort: next_followup ascending

Card Display:
  - Company Name (Bold, 20px)
  - Agreement Status (badge)
  - Upload Date (if exists)
  - Next Follow-up Date

Action Button (per card):
  Label: "📄 Upload Signed Agreement"
  Color: #28a745
  Action: Action Sequence
  Steps:
    1. File Upload → Clients.agreement_link
    2. Set Columns on Current Client:
       - agreement_status = "Signed"
       - agreement_date = Today
  Success: "✅ Agreement uploaded and marked as signed!"
```

#### Tab: Add Client

```yaml
Layout: Form (Full Screen, scrollable)

Form Target: Clients
Form Title: "Add New Client"

Form Fields:
  - company_name (Text Input):
      Required: Yes
      Label: "Company Name"
      Placeholder: "Enter company name"
  
  - contact_name (Text Input):
      Required: No
      Label: "Contact Name"
  
  - contact_email (Email Input):
      Required: Yes
      Label: "Contact Email"
      Validation: Valid email format
  
  - contact_phone (Text Input):
      Required: No
      Label: "Contact Phone"
      Input Type: Phone
  
  - agreement_status (Choice Picker):
      Options: Pending, Signed, Expired
      Default: Pending
      Label: "Agreement Status"
  
  - agreement_link (File Upload):
      Required: No (if status = Signed, show as required)
      Label: "Agreement Document"
      Accept: PDF, DOC, DOCX
  
  - agreement_date (Date Picker):
      Required: No (if status = Signed)
      Label: "Agreement Date"
  
  - next_followup (Date Picker):
      Required: Yes
      Label: "Next Follow-up Date"
      Min Date: Today
  
  - notes (Text Area):
      Required: No
      Label: "Notes"
      Rows: 4

Form Submit Actions:
  1. Add Row to Clients with all field values
  2. Set Column: client_id = auto-generated unique ID
  3. Set Column: created_at = Current Time

Success Message: "✅ Client added successfully!"
Success Action: Navigate to Clients tab
```

---

### PAGE 6: Manager Dashboard

**Visibility:** `current_user.role = "manager"`

**Navigation:** Bottom Tab Bar (7 tabs)

**Tab Navigation:** Dashboard | Team Feed | Leave Management | Attendance | Employees | Approvals | Profile

#### Tab: Dashboard

```yaml
Layout: Multi-section dashboard with stats, charts, and quick lists

Section 1: Key Metrics (Cards - 3x3 grid, responsive)
  Card 1: "Photographers On Shoot"
    - Number: Count where Photographer_Attendance.status="In Progress"
    - Icon: 📸
    - Color: #fdde00
  
  Card 2: "To Edit"
    - Number: Count Assets where status="To Edit"
    - Icon: 📝
    - Color: #fff3cd
  
  Card 3: "In Progress"
    - Number: Count Assets where status="In Progress"
    - Icon: ⏳
    - Color: #d1ecf1
  
  Card 4: "In Review"
    - Number: Count Assets where status="Review"
    - Icon: 👀
    - Color: #17a2b8
    - Badge: Red if count > 5
  
  Card 5: "Needs Revision"
    - Number: Count Assets where status="Revision"
    - Icon: ⚠️
    - Color: #fd7e14
  
  Card 6: "Published"
    - Number: Count Assets where status="Published"
    - Icon: ✅
    - Color: #28a745
  
  Card 7: "Pending Leave Requests"
    - Number: Count Leave_Requests where status="Pending"
    - Icon: 📅
    - Color: #dc3545
    - Badge: Red if count > 0
  
  Card 8: "Total Kudos Given"
    - Number: Sum Assets.kudos_count
    - Icon: ⭐
    - Color: #d5214b
  
  Card 9: "Hours This Week"
    - Number: Sum Editor_Time_Logs.duration where start_time >= week_start
    - Icon: ⏰
    - Color: #17a2b8
    - Format: "X.X hours"

Section 2: Quick Lists (2 columns, responsive)
  List 1: "Today's Shoots"
    Data: Shoots where date = today
    Display:
      - Shoot name (Bold)
      - Photographer (via relation, with avatar)
      - Time (if scheduled)
      - Status badge
    Tap: View shoot details
  
  List 2: "Pending Agreements"
    Data: Clients where agreement_status = "Pending"
    Display:
      - Company name (Bold)
      - Contact email
      - Next followup date
    Tap: View client details

Section 3: Activity Feed (Recent)
  - Label: "Recent Activity"
  - List: Combined feed from:
      - New assets created
      - Leave requests submitted
      - Shoots completed
  - Sort: created_at/updated_at descending
  - Limit: 10
  - Display: Icon, description, timestamp
```

#### Tab: Team Feed

```yaml
Purpose: Company-wide visibility, encouragement, recognition
Layout: Social feed style (Instagram-like cards, infinite scroll)

Data Source: Assets
Filter: status != "To Edit" (show work in progress and completed)
Sort: updated_at descending

Card Style:
  - Background: White
  - Border: 1px solid #e0e0e0
  - Border Radius: 12px
  - Padding: 16px
  - Margin: 12px
  - Shadow: Subtle

Card Display:
  - Header Row (Horizontal):
      - Avatar (circular, 40px):
          Source: Asset_Editor relation → avatar
      - Column (Flex: 1):
          - Editor Name (Bold, 16px):
              Source: Asset_Editor relation → name
          - Time (12px, #999999):
              Format: Relative ("2 hours ago")
      - Status Badge (small)
  
  - Thumbnail (large, square aspect ratio, full width):
      Source: Assets.thumbnail or LatestVersion
      Height: 300px
      Object Fit: Cover
      Border Radius: 8px
      Tap: Fullscreen view
  
  - Title (Bold, 18px):
      Source: Assets.title
      Color: #1a1a1a
      Margin: 12px 0
  
  - Metadata Row:
      - Shoot Name (via relation, smaller text, #666666)
      - Deadline (if exists, #666666)
  
  - Engagement Row (Horizontal, centered):
      - Comments Count (💬 icon + number):
          Source: comments_count
          Color: #666666
          Tap: Scroll to comments
      - Kudos Count (⭐ icon + number):
          Source: kudos_count
          Color: #d5214b
          Font Weight: Bold
      - Spacer
      - Status Badge

Card Tap Action: Open Asset Detail with:
  - Full image/file preview (swipeable gallery)
  - All metadata
  - Comments thread (inline list, expanded)
  - Time logs (if editor)
  - Action buttons (if applicable)

Action Buttons (visible to all users, in card footer):
  
  Button 1: "💬 Add Comment"
    Style: Text button, full width
    Color: #666666
    Action: Open Form (inline or modal)
    Form Target: Asset_Comments
    Form Fields:
      - comment_text (Text Area, placeholder: "Leave encouraging feedback, suggestions, or kudos!")
      Rows: 3
    Form Submit Actions:
      1. Add Row to Asset_Comments
      2. Set Columns: asset_id, user_email, user_name, user_avatar, timestamp
      3. Increment: Current Asset.comments_count by 1
    Success: "💬 Comment posted!"
    Refresh: Yes
  
  Button 2: "⭐ Give Kudos"
    Style: Icon button (star, filled when clicked)
    Color: #d5214b (when active)
    Action: Increment Column
    Target: Current Asset.kudos_count
    Amount: +1
    Success: "⭐ Kudos given! Great work recognized."
    Animation: Star fill animation
    Note: Consider adding a "User_Kudos_Given" table to track who gave kudos (prevents spam)

Design Notes:
  - Bright, engaging layout
  - Encourage positive feedback culture
  - Show recent activity at top
  - Monthly "Most Kudos" spotlight (optional feature)
  - Pull to refresh
  - Infinite scroll
```

#### Tab: Leave Management

```yaml
Layout: Table (Desktop) / Cards (Mobile) with filters

Header:
  - Title: "Leave Management"
  - Filter Toggles (horizontal):
      - By Status: All, Pending, Approved, Rejected
      - By Employee: All employees dropdown
      - By Date Range: This Week, This Month, Custom Range

Stats Cards (top of page, 3 columns):
  Card 1: "Pending Count"
    - Number: Count where status="Pending"
    - Color: #fdde00
    - Badge: Red if count > 0
  
  Card 2: "Approved This Month"
    - Number: Count where status="Approved" and created_at >= month_start
    - Color: #28a745
  
  Card 3: "Team on Leave Today"
    - Number: Count where today between start_date and end_date and status="Approved"
    - Color: #17a2b8

Data Source: Leave_Requests
Sort: created_at descending

Desktop Table:
  Columns:
    - Employee Name (via Users relation, with avatar)
    - Leave Type (icon + text)
    - Start Date
    - End Date
    - Days (calculated: days_count)
    - Reason (truncated, click to expand)
    - Status (badge)
    - Actions (buttons)
  
  Row Style:
    - Hover: Light gray background
    - Border: 1px solid #e0e0e0
    - Alternating row colors

Mobile Cards:
  - Employee Name + Avatar
  - Leave Type + Date Range
  - Days Count
  - Status Badge
  - Reason (truncated)
  - Action Buttons

Action Buttons (per row/card):
  
  Button 1: "✅ Approve"
    Style: Success (green)
    Visibility: status = "Pending"
    Action: Action Sequence
    Steps:
      1. Open Confirmation Dialog:
         Title: "Approve Leave Request?"
         Message: "Approve [employee name]'s leave from [start] to [end]?"
      2. If confirmed: Set Columns on Current Leave Request
         Updates:
           - status = "Approved"
           - manager_email = Current User Email
           - updated_at = Current Time
      3. Success Message: "✅ Leave approved"
    Optional: Send email notification to employee
  
  Button 2: "❌ Reject"
    Style: Danger (red)
    Visibility: status = "Pending"
    Action: Action Sequence
    Steps:
      1. Open Form:
         Fields:
           - manager_notes (Text Area, required)
             Placeholder: "Please provide a reason for rejection..."
             Label: "Rejection Reason"
      2. Set Columns on Current Leave Request
         Updates:
           - status = "Rejected"
           - manager_email = Current User Email
           - manager_notes = form input
           - updated_at = Current Time
      3. Success Message: "❌ Leave rejected"
    Optional: Send email notification to employee

Bulk Actions (Desktop only):
  - Checkbox column (select multiple)
  - Bulk Approve button
  - Bulk Reject button
```

#### Tab: Approvals
(Same as Creative Lead Approvals tab - see above)

#### Tab: Attendance

```yaml
Layout: Table with export option and filters

Header:
  - Title: "Photographer Attendance"
  - Filter Toggles:
      - By Photographer (dropdown)
      - By Shoot (dropdown)
      - By Date Range (date picker)
  - Export Button (top right):
      Label: "📥 Export to CSV"
      Action: Glide export feature

Data Source: Photographer_Attendance
Filters: Applied based on toggles
Sort: start_time descending

Table Columns:
  - Photographer Name (via Users relation, with avatar)
  - Shoot Name (via Shoots relation)
  - Start Time (datetime format: "MMM DD, YYYY HH:MM")
  - End Time (datetime format, or "In Progress")
  - Duration (calculated, in hours, format: "X.X hours")
  - Status (badge)
  - Photos Count (array length, with gallery icon)
  - GPS Location (map preview icon, click to view)
  - Notes (truncated, click to expand)

Row Actions:
  - View Details (tap row):
      Opens detail screen with:
        - Full attendance record
        - Photo gallery (if exists)
        - Map view (if GPS exists):
            Component: Glide Map
            Latitude: gps_latitude
            Longitude: gps_longitude
            Zoom: 15
            Height: 300px
            Marker: Custom (camera icon)
        - Edit button (manager only)
  
  - Edit Record (manager only):
      Opens form with editable fields
      Can update: start_time, end_time, status, notes
  
  - Delete Record (manager only, with confirmation):
      Action: Delete row
      Confirmation: "Are you sure? This action cannot be undone."

Export Action:
  - Generates CSV with all visible columns
  - Includes filtered data
  - Downloadable file
```

#### Tab: Employees

```yaml
Layout: Table with add/edit functionality

Header:
  - Title: "Employee Management"
  - Search Bar
  - Add Employee Button (top right):
      Label: "+ Add Employee"
      Color: #d5214b
      Icon: Plus

Data Source: Users
Sort: name ascending
Filter: active = TRUE (toggle to show inactive)

Table Columns:
  - Avatar (thumbnail, 50px, circular)
  - Name (editable, tap to edit)
  - Email (read-only)
  - Role (editable dropdown)
  - Active Status (toggle switch)
  - Actions (edit/deactivate buttons)

Row Style:
  - Hover: Light background
  - Border: 1px solid #e0e0e0

Add Employee Action:
  Opens Form Screen
  Form Target: Users
  Form Title: "Add New Employee"
  Form Fields:
    - name (Text Input, required)
      Label: "Full Name"
      Placeholder: "Enter employee name"
    
    - email (Email Input, required)
      Label: "Email Address"
      Placeholder: "employee@company.com"
      Validation: Valid email, unique
    
    - role (Choice Picker, required)
      Options: photographer, editor, creative, sales, manager
      Label: "Role"
      Icons: 📸, ✏️, 🎨, 💼, 👔
    
    - active (Switch, default=TRUE)
      Label: "Active Employee"
    
    - avatar (Image Upload, optional)
      Label: "Profile Photo"
      Accept: Images only
      Size: Max 5MB
  
  Form Submit Actions:
    1. Add Row to Users with all field values
    2. Set Column: created_at = Current Time
  
  Success Message: "✅ Employee added! They can now sign in with [email]"
  Success Action: Refresh table
  Note: Glide will automatically create user account on first sign-in

Edit Action:
  - Opens same form with current values pre-filled
  - Updates row on submit
  - Success: "✅ Employee updated"

Deactivate Action:
  - Opens Confirmation Dialog:
      Title: "Deactivate Employee?"
      Message: "This will revoke [name]'s access. Their data will be preserved."
  - If confirmed: Sets active = FALSE
  - Success: "✅ Employee deactivated"
  - User loses access but data preserved

Reactivate Action (for inactive employees):
  - Button: "Reactivate"
  - Sets active = TRUE
  - Success: "✅ Employee reactivated"
```

---

## 6. SECURITY & VISIBILITY RULES

### Row Ownership (Glide Row Owners Feature)

```yaml
Photographer_Attendance:
  Row Owner Column: photographer_email
  Access: 
    - Owner: Read/Write own records
    - Manager: Read all, Write all
    - Others: No access

Assets:
  Row Owner Column: assigned_editor_email
  Access:
    - Owner: Read/Write own assets
    - Creative/Manager: Read all, Write all (assign, approve, etc.)
    - Others: Read only (via Team Feed)

Editor_Time_Logs:
  Row Owner Column: editor_email
  Access:
    - Owner: Read/Write own logs
    - Manager: Read all, Write all
    - Others: No access

Leave_Requests:
  Row Owner Column: employee_email
  Access:
    - Owner: Read/Write own requests
    - Manager: Read all, Write all (approve/reject)
    - Others: No access

Asset_Comments:
  Row Owner: None (all authenticated users can read)
  Write Access: All authenticated users
  Edit Access: Owner only (own comments)

Users:
  Read Access: All authenticated users (for names, avatars, role display)
  Write Access: Manager only
  Edit Own Profile: Limited (name, avatar, phone - not role)

Clients:
  Access: Sales and Manager roles only
  Read/Write: Both roles have full access
  Others: No access

Shoots:
  Read Access: All authenticated users
  Write Access: Manager, Creative, Sales
  Photographer: Read own shoots only

Content_Calendar:
  Read Access: All authenticated users
  Write Access: Creative, Manager
  Others: Read only
```

### Component Visibility Rules

```yaml
"Start Shoot" Button: 
  Condition: role=photographer AND IsOnShoot=false
  Page: Photographer Dashboard > Home

"End Shoot" Button: 
  Condition: role=photographer AND IsOnShoot=true
  Page: Photographer Dashboard > Home

"Assign Editor" Action: 
  Condition: role=creative OR role=manager
  Pages: Creative Dashboard > Assets Overview, Assign Tasks

"Approve Leave" Button: 
  Condition: role=manager AND leave_status=Pending
  Page: Manager Dashboard > Leave Management

"Edit Employee" Action: 
  Condition: role=manager
  Page: Manager Dashboard > Employees

"Publish Asset" Button: 
  Condition: role=creative OR role=manager
  Pages: Creative Dashboard > Approvals, Manager Dashboard > Approvals

Team Feed Kudos Button: 
  Condition: All authenticated users
  Page: Manager Dashboard > Team Feed

Manager Dashboard Tab: 
  Condition: role=manager only
  Navigation: Hidden for other roles

Sales Dashboard Tab: 
  Condition: role=sales OR role=manager
  Navigation: Hidden for other roles

Creative Dashboard Tab: 
  Condition: role=creative OR role=manager OR role=editor
  Navigation: Visible based on role

Photographer Dashboard Tab: 
  Condition: role=photographer OR role=manager
  Navigation: Hidden for other roles
```

---

## 7. WORKFLOWS & USER JOURNEYS

### Workflow 1: Photographer Shoot Logging

```
1. Photographer logs in → sees Photographer Dashboard
2. Home tab shows "Start Shoot" button (if not on active shoot)
3. Taps "Start Shoot" button
4. Form opens:
   - Selects shoot from dropdown (filtered to scheduled shoots assigned to them)
   - Adds notes (optional)
   - Uploads sample photos (optional)
   - Location automatically captured via GPS
5. Submits form → attendance record created with:
   - start_time = Current Time
   - photographer_email = Current User Email
   - status = "In Progress"
   - GPS coordinates stored
6. Success message: "✅ Shoot started!"
7. "End Shoot" button now visible on home tab
8. Active shoot info displayed
9. At end of shoot, taps "End Shoot"
10. Confirmation dialog appears
11. If confirmed, record updated with:
    - end_time = Current Time
    - status = "Completed"
    - duration calculated automatically
12. Success message: "✅ Shoot completed!"
13. Can view completed shoot in "My Shoots" tab with:
    - Full details
    - Photo gallery
    - Map view of location
```

### Workflow 2: Editor Task Completion

```
1. Editor logs in → sees Editor Dashboard
2. Home tab shows stats: To Edit, In Progress, In Review
3. Navigates to "My Tasks" tab (Kanban board)
4. Sees asset card in "To Edit" column
5. Taps asset card → detail screen opens
6. Views asset:
   - Image gallery (swipeable)
   - Title, description, deadline
   - Assigned shoot info
7. Taps "⏱️ Start Editing" button
8. Time log created automatically:
   - start_time = Current Time
   - Timer display shows active editing time
9. Works on asset, uploads revised version via "📤 Upload Version"
10. File appended to versions array
11. Success: "✅ Version uploaded!"
12. When done, taps "⏹️ Finish Editing"
13. Confirmation: "Finish editing and send to review?"
14. If confirmed:
    - Time log updated: end_time = Current Time, duration calculated
    - Asset status changed to "Review"
15. Success: "✅ Editing completed! Asset in review."
16. Asset moves to "Review" column in Kanban
17. Creative Lead sees asset in "Approvals" tab
```

### Workflow 3: Creative Lead Approval Process

```
1. Creative Lead logs in → sees Creative Dashboard
2. Home tab shows "Awaiting Review" count (with badge if > 0)
3. Navigates to "Approvals" tab
4. Sees list of assets with status = "Review", sorted by deadline
5. Taps asset card → full detail view:
   - Large image preview
   - All versions (swipeable gallery)
   - Editor info
   - Comments thread
   - Deadline (highlighted if overdue)
6. Reviews asset and comments
7. Three options:
   
   Option A: Approve
   - Taps "✅ Approve" button
   - Confirmation dialog
   - Asset status → "Final"
   - Success: "✅ Asset approved!"
   
   Option B: Publish
   - Taps "🚀 Publish" button
   - Confirmation dialog
   - Asset status → "Published"
   - Success: "🚀 Asset published!"
   
   Option C: Request Revision
   - Taps "⚠️ Send to Revision" button
   - Form opens: "Revision Notes" (required)
   - Enters detailed feedback
   - Submits → Asset status → "Revision"
   - revision_notes field populated
   - Success: "⚠️ Revision request sent to editor"
8. Editor sees asset in "Revision Tasks" tab
9. Revision notes highlighted in yellow
10. Editor follows Workflow 2 to submit revision
```

### Workflow 4: Leave Request & Approval

```
1. Employee (any role) navigates to "Leave" tab
2. Sees list of own leave requests
3. Taps floating action button "+"
4. Form opens:
   - Selects leave type (Sick, Casual, Other)
   - Picks start date (min: today)
   - Picks end date (min: start date)
   - Enters reason (required)
5. Submits form
6. Request created with:
   - status = "Pending"
   - employee_email = Current User Email
   - days_count calculated automatically
7. Success: "✅ Leave request submitted!"
8. Manager sees request in "Leave Management" tab
9. Pending count badge shows on dashboard
10. Manager reviews request:
    - Sees employee name, dates, reason
    - Can view employee's leave history
11. Manager actions:
    
    Option A: Approve
    - Taps "✅ Approve" button
    - Confirmation dialog
    - Status → "Approved"
    - manager_email set
    - Success: "✅ Leave approved"
    
    Option B: Reject
    - Taps "❌ Reject" button
    - Form opens: "Rejection Reason" (required)
    - Enters reason
    - Status → "Rejected"
    - manager_notes populated
    - Success: "❌ Leave rejected"
12. Employee sees updated status in "Leave" tab
13. Badge color changes (green=approved, red=rejected)
```

### Workflow 5: Team Collaboration (Comments & Kudos)

```
1. User (any role) navigates to "Team Feed" tab (Manager) or views asset detail
2. Sees social feed of completed/in-progress assets
3. Taps asset card → detail view
4. Scrolls to comments section
5. Sees existing comments:
   - User avatar + name
   - Comment text
   - Timestamp (relative: "2 hours ago")
6. Taps "💬 Add Comment" button
7. Text area appears
8. Types feedback/encouragement
9. Taps "Post Comment"
10. Comment added:
    - comment_id auto-generated
    - user_email, user_name, user_avatar auto-filled
    - timestamp = Current Time
    - comments_count incremented
11. Success: "💬 Comment posted!"
12. Comment appears at top of thread
13. Other users see new comment in real-time (if using real-time features)
14. User can also give kudos:
    - Taps "⭐ Give Kudos" button
    - kudos_count incremented by 1
    - Star icon fills with color
    - Success: "⭐ Kudos given!"
15. Asset shows updated engagement metrics
16. High kudos assets featured prominently in feed
```

---

## 8. UI/UX ENHANCEMENTS

### Map Integration

```yaml
Map Components (Glide Map):
  Usage Locations:
    1. Photographer_Attendance Detail Screen:
       - Display GPS location of shoot
       - Marker: Camera icon
       - Zoom: 15
       - Height: 200-300px
       - Click to open fullscreen map
    
    2. Manager Attendance Tab:
       - Map preview icon in table
       - Click to view full map
       - Multiple markers for multiple locations
    
    3. Shoot Detail Screen:
       - If shoot has location_gps, display map
       - Show route if multiple locations

Map Styling:
  - Border Radius: 8px
  - Shadow: Subtle
  - Controls: Zoom, fullscreen
  - Marker Customization: Company colors
```

### Real-time Updates

```yaml
Real-time Features (if using Firebase/Glide real-time):
  - Team Feed: Auto-refresh when new assets/comments added
  - Comments: Live updates as users post
  - Status Changes: Instant badge updates
  - Notifications: Push notifications for:
    - New assignments
    - Status changes
    - Comments on your assets
    - Leave request updates
```

### Loading States

```yaml
Loading Indicators:
  - Skeleton screens for lists
  - Spinner for form submissions
  - Progress bar for file uploads
  - Shimmer effect for images
```

### Error Handling

```yaml
Error Messages:
  - Network errors: "Connection issue. Please check your internet."
  - Validation errors: Inline, below fields
  - Permission errors: "You don't have access to this feature."
  - File upload errors: "File too large" or "Invalid file type"
```

### Responsive Design

```yaml
Breakpoints:
  - Mobile: < 768px (single column, cards)
  - Tablet: 768px - 1024px (2 columns, mixed)
  - Desktop: > 1024px (tables, 3-4 columns)

Adaptive Components:
  - Tables → Cards on mobile
  - Horizontal scroll for filters on mobile
  - Bottom navigation on mobile
  - Side navigation on desktop
  - Sticky headers on scroll
```

### Accessibility

```yaml
Accessibility Features:
  - Alt text for all images
  - ARIA labels for buttons
  - Keyboard navigation support
  - High contrast mode support
  - Screen reader compatibility
  - Font size scaling
```

---

## 9. TESTING CHECKLIST

```yaml
Authentication:
  ✅ Login with valid email
  ✅ Login with invalid email (error)
  ✅ Persistent login (stay logged in)
  ✅ Logout functionality
  ✅ Password reset (if enabled)

Role-Based Access:
  ✅ Photographer sees only photographer dashboard
  ✅ Editor sees editor dashboard
  ✅ Creative sees creative dashboard
  ✅ Sales sees sales dashboard
  ✅ Manager sees manager dashboard
  ✅ Cross-role access denied

Data Operations:
  ✅ Create shoot attendance record
  ✅ End shoot (update record)
  ✅ Upload asset versions
  ✅ Start/stop time logging
  ✅ Add comments
  ✅ Give kudos
  ✅ Submit leave request
  ✅ Approve/reject leave
  ✅ Assign assets to editors
  ✅ Approve/publish assets
  ✅ Request revisions

Maps & Location:
  ✅ GPS capture on form submit
  ✅ Map display with correct coordinates
  ✅ Multiple location markers
  ✅ Map fullscreen view

File Uploads:
  ✅ Single file upload
  ✅ Multiple file upload
  ✅ Image preview
  ✅ File type validation
  ✅ File size validation

Real-time Features:
  ✅ Comments update live
  ✅ Status changes reflect immediately
  ✅ Notifications appear

Mobile Responsiveness:
  ✅ All pages work on mobile
  ✅ Tables convert to cards
  ✅ Navigation accessible
  ✅ Forms usable on small screens
```

---

## 10. DEPLOYMENT NOTES

```yaml
Pre-Launch:
  1. Test all workflows with sample data
  2. Verify all role permissions
  3. Test on multiple devices (iOS, Android, Web)
  4. Set up Google Sheets with proper formulas
  5. Configure all relations in Glide
  6. Set up computed columns
  7. Test file upload limits
  8. Verify map functionality
  9. Test email notifications (if enabled)
  10. Set up backup strategy for Google Sheets

Launch:
  1. Add all employees to Users sheet
  2. Set up initial clients and shoots
  3. Train team on app usage
  4. Monitor for issues first week
  5. Gather feedback and iterate

Post-Launch:
  1. Regular data backups
  2. Monitor usage analytics
  3. Update based on feedback
  4. Add new features as needed
```

---

## 11. GLIDE-SPECIFIC IMPLEMENTATION NOTES

### Form Configuration

```yaml
All Forms Should:
  - Have clear titles
  - Show required field indicators (*)
  - Include helpful placeholders
  - Validate inputs before submit
  - Show success/error messages
  - Refresh data after submit
  - Navigate appropriately after success
```

### Action Sequences

```yaml
Complex Actions Should:
  - Use Action Sequences for multi-step operations
  - Include confirmation dialogs for destructive actions
  - Show loading states during processing
  - Provide clear success/error feedback
  - Refresh relevant data after completion
```

### Data Refresh

```yaml
Auto-Refresh Settings:
  - Lists: Refresh on screen open
  - Forms: Refresh after submit
  - Stats: Refresh every 30 seconds (if real-time not available)
  - Team Feed: Pull-to-refresh enabled
```

### Performance Optimization

```yaml
Optimization Tips:
  - Limit list items (use pagination or "Load More")
  - Optimize image sizes (Glide auto-optimizes)
  - Use filters to reduce data load
  - Cache computed columns
  - Lazy load images in galleries
```

---

## END OF PROMPT

This enhanced prompt provides comprehensive specifications for building a production-ready operations management app in Glide. All pages, components, workflows, and UI elements are detailed with specific styling, actions, and user experiences.

**Key Improvements:**
- ✅ Complete page structures with all tabs
- ✅ Detailed UI specifications (colors, sizes, spacing)
- ✅ Map integration for location tracking
- ✅ Comprehensive form configurations
- ✅ Action sequences for complex workflows
- ✅ Security and visibility rules
- ✅ Responsive design specifications
- ✅ Testing checklist
- ✅ Deployment guidelines

Follow this prompt step-by-step in Glide to build the complete app.

