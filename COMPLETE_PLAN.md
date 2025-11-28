# Complete Feature Matrix & Information Architecture

## Technology Decision: Google Sheets API

**Why:** Faster setup (30 min vs 45 min), data already exists, sufficient for MVP scale

---

## Complete Feature Matrix by Role

### 👔 MANAGER

**Pages Access:**
- Dashboard (overview)
- Clients (view all)
- Shoots (view all)
- Tasks/Assets (view all)
- Content Calendar (view all)
- Team Feed (view all)
- Leave Management (approve/reject)
- Settings (add users)

**Features:**
1. **Dashboard Overview**
   - Stats: Team on shoots, Shoots today, Leave pending, Assets in review
   - Activity feed (last 10 activities)
   - Charts: Asset pipeline, Editor hours

2. **Client Management**
   - View all clients
   - See client progress (shoots completed, assets completed)
   - View content calendar per client
   - View team members working on each client

3. **User Management**
   - Add new employees (email, name, role)
   - Edit user details
   - Deactivate users

4. **Leave Management**
   - View all leave requests
   - Approve/reject with notes
   - See leave history

5. **Team Visibility**
   - See who's on shoots (which client)
   - See who's editing (which client)
   - View all activities

---

### 🎯 LEAD

**Pages Access:**
- Dashboard (team overview)
- Clients (full CRUD)
- Shoots (view all, manage)
- Content Calendar (full CRUD)
- Team Feed (view all)

**Features:**
1. **Client Management**
   - Add new clients (company name, contact, email)
   - Edit client details
   - Upload agreements
   - Set follow-up dates

2. **Content Calendar Management**
   - Add calendar entries (publish date, channel, asset)
   - Edit calendar entries
   - View calendar by client
   - See completed vs scheduled

3. **Team Progress View**
   - "Team on Shoots" section:
     - Photographer name → Client name → Shoot name → Status → Duration
   - "Team Editing" section:
     - Editor name → Client name → Asset name → Status → Progress %

4. **Shoot Management**
   - View all shoots
   - Clock in/out for shoots (with break tracking)
   - See active shoots with team members
   - Update shoot status

5. **Assistant Management**
   - Update assistant details
   - Assign assistants to shoots

---

### 📸 PHOTOGRAPHER

**Pages Access:**
- Dashboard (my shoots)
- Shoots (assigned only)
- Attendance (my attendance)
- Leave (request leave)

**Features:**
1. **View Assigned Shoots**
   - List of shoots where photographer_id = current user
   - Shows: shoot name, date, client, status
   - Filter by status (scheduled, in_progress, completed)

2. **Shoot Clock In/Out**
   - "Start Shoot" button (if no active shoot)
   - Select shoot from dropdown
   - System creates Photographer_Attendance record
   - "End Shoot" button appears
   - System updates attendance with end_time

3. **File Links Upload**
   - After shoot, add file links (Google Drive URLs)
   - System updates shoot record with file_links array
   - View uploaded links

4. **Attendance History**
   - View all past shoot attendance
   - See duration, dates, client names

5. **Leave Requests**
   - Apply for leave
   - View leave status

---

### ✏️ EDITOR

**Pages Access:**
- Dashboard (my tasks)
- Tasks/Assets (assigned only)
- Content Calendar (read-only)
- Leave (request leave)

**Features:**
1. **Kanban Board View**
   - 3 columns: To Edit, In Progress, In Review
   - Cards show: asset title, client (via shoot), deadline
   - Drag cards between columns (optional)

2. **Start Editing**
   - Click asset card → detail view
   - "Start Editing" button
   - System creates Editor_Time_Logs record
   - Asset status → "In Progress"
   - Timer shows active time

3. **Upload Revisions**
   - "Upload Version" button
   - Add file link (URL)
   - System appends to asset.versions array

4. **Mark Ready for Review**
   - "Finish Editing" or "Mark Ready for Review"
   - System updates Editor_Time_Logs (end_time, duration)
   - Asset status → "Review"
   - Creative Lead sees in approvals

5. **View Content Calendar**
   - See all scheduled content
   - Filter by client
   - See what's publishing when

---

### 🎨 CONTENT CREATOR

**Pages Access:**
- Dashboard (attendance, calendar)
- Content Calendar (read-only)
- Leave (request leave)

**Features:**
1. **Daily Clock In/Out**
   - "Clock In" button at start of day
   - System creates Attendance record
   - "Clock Out" button at end of day
   - System updates attendance

2. **View Content Calendar**
   - See all upcoming content
   - Filter by client
   - See scheduled posts

3. **Post Task Updates**
   - "Post Update" button
   - Write update text
   - Link to asset (optional)
   - System adds to Task_Updates sheet
   - Appears in Team Feed

4. **View Personal Tasks**
   - See assigned tasks (if any)
   - View task status

---

## Information Architecture

### Data Hierarchy

```
CLIENT (Root Entity)
│
├── SHOOTS
│   ├── shoot_id
│   ├── client_id (FK)
│   ├── photographer_id (FK → Users)
│   ├── lead_id (FK → Users)
│   ├── date, status, location
│   └── PHOTOGRAPHER_ATTENDANCE
│       ├── attendance_id
│       ├── shoot_id (FK)
│       ├── photographer_email (FK → Users)
│       ├── clock_in, clock_out
│       ├── break_start, break_end
│       └── status
│
├── ASSETS
│   ├── asset_id
│   ├── shoot_id (FK) → links to client
│   ├── assigned_editor_id (FK → Users)
│   ├── title, description, status
│   ├── file_links (array)
│   ├── revision_notes
│   ├── EDITOR_TIME_LOGS
│   │   ├── log_id
│   │   ├── asset_id (FK)
│   │   ├── editor_email (FK → Users)
│   │   ├── start_time, end_time
│   │   └── duration
│   ├── ASSET_COMMENTS
│   │   ├── comment_id
│   │   ├── asset_id (FK)
│   │   ├── user_email (FK → Users)
│   │   ├── comment_text
│   │   └── timestamp
│   └── CONTENT_CALENDAR
│       ├── calendar_id
│       ├── asset_id (FK)
│       ├── client_id (FK)
│       ├── publish_date, publish_time
│       ├── channel
│       └── status
│
└── LEAVE_REQUESTS
    ├── request_id
    ├── employee_email (FK → Users)
    ├── leave_type, start_date, end_date
    ├── reason, status
    └── manager_email (FK → Users)
```

### Entity Relationships

**Primary Relationships:**
1. **Client → Shoots** (One-to-Many)
   - One client has many shoots
   - Query: `Shoots WHERE client_id = X`

2. **Shoot → Assets** (One-to-Many)
   - One shoot produces many assets
   - Query: `Assets WHERE shoot_id = X`

3. **Client → Assets** (One-to-Many via Shoots)
   - One client has many assets (through shoots)
   - Query: `Assets JOIN Shoots WHERE Shoots.client_id = X`

4. **Client → Content Calendar** (One-to-Many via Assets)
   - One client has many calendar entries (through assets)
   - Query: `Content_Calendar JOIN Assets JOIN Shoots WHERE Shoots.client_id = X`

5. **User → Shoots** (One-to-Many)
   - One photographer has many shoots
   - Query: `Shoots WHERE photographer_id = X`

6. **User → Assets** (One-to-Many)
   - One editor has many assigned assets
   - Query: `Assets WHERE assigned_editor_id = X`

### Data Flow Connections

**How Lead Sees Team Progress:**

```
Query 1: Active Shoot Attendance
  Photographer_Attendance
    WHERE status = "In Progress"
    JOIN Shoots (get client_id, shoot_name)
    JOIN Clients (get company_name)
    JOIN Users (get photographer name)
  Result: "Chris → Acme Corp → Product Launch (2h active)"

Query 2: Active Editing
  Editor_Time_Logs
    WHERE end_time IS NULL
    JOIN Assets (get title, shoot_id)
    JOIN Shoots (get client_id)
    JOIN Clients (get company_name)
    JOIN Users (get editor name)
  Result: "Maya → Acme Corp → Logo Redesign (1.5h active)"
```

**How Content Calendar Links to Clients:**

```
Content_Calendar
  JOIN Assets (get asset_id)
  JOIN Shoots (get client_id via shoot_id)
  JOIN Clients (get company_name)
  Result: Calendar events with client names
```

---

## Data Transmission Algorithm

### Strategy: Smart Polling with Debouncing

**Why Not Real-Time:**
- Google Sheets API doesn't support WebSockets
- Real-time requires Supabase (future migration)
- Polling is simpler, more reliable for MVP

**Algorithm:**

```javascript
// Smart Polling Strategy
class DataSync {
  constructor() {
    this.pollInterval = 30000; // 30 seconds
    this.activePages = new Set();
    this.lastFetch = {};
    this.debounceTimer = null;
  }

  // Only poll sheets for active pages
  startPolling(pageName, sheetNames) {
    this.activePages.add(pageName);
    this.scheduleFetch(sheetNames);
  }

  stopPolling(pageName) {
    this.activePages.delete(pageName);
  }

  // Debounced fetching (batch multiple requests)
  scheduleFetch(sheetNames) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.fetchSheets(sheetNames);
    }, 500); // Wait 500ms for multiple page loads
  }

  async fetchSheets(sheetNames) {
    const now = Date.now();
    
    // Only fetch if not recently fetched (avoid duplicate calls)
    const needsFetch = sheetNames.filter(name => {
      const lastFetchTime = this.lastFetch[name] || 0;
      return (now - lastFetchTime) > 25000; // 25 seconds minimum
    });

    if (needsFetch.length === 0) return;

    // Batch fetch all needed sheets
    const promises = needsFetch.map(name => 
      this.fetchSheet(name)
    );

    const results = await Promise.all(promises);
    
    // Update last fetch time
    needsFetch.forEach(name => {
      this.lastFetch[name] = now;
    });

    // Update context
    this.updateContext(results);
  }

  // Set up interval polling
  startInterval() {
    setInterval(() => {
      if (this.activePages.size > 0) {
        // Get all sheets needed by active pages
        const allSheets = this.getActiveSheets();
        this.fetchSheets(allSheets);
      }
    }, this.pollInterval);
  }
}
```

**Optimization Features:**
1. **Page-Based Polling**: Only fetch data for visible pages
2. **Debouncing**: Batch multiple page loads (500ms window)
3. **Minimum Interval**: Don't fetch same sheet within 25 seconds
4. **Batch Requests**: Fetch multiple sheets in parallel
5. **Error Handling**: Retry failed requests with exponential backoff

**Usage Example:**

```javascript
// In ClientsPage component
useEffect(() => {
  // Start polling when page loads
  dataSync.startPolling('clients', ['Clients', 'Shoots', 'Assets', 'Content_Calendar']);
  
  return () => {
    // Stop polling when page unmounts
    dataSync.stopPolling('clients');
  };
}, []);
```

---

## Complete Feature Connection Map

### Manager Dashboard Flow

```
Manager logs in
  ↓
AuthContext checks role → "manager"
  ↓
Router redirects to /dashboard/manager
  ↓
Manager Dashboard loads
  ↓
DataContext fetches:
  - Users (for team list)
  - Photographer_Attendance (active shoots)
  - Editor_Time_Logs (active editing)
  - Leave_Requests (pending)
  - Assets (in review)
  ↓
Dashboard displays:
  - Stats cards (calculated from data)
  - Activity feed (combined from all sheets)
  - Charts (processed data)
  ↓
User clicks "Clients"
  ↓
Router navigates to /clients
  ↓
ClientsPage loads
  ↓
DataContext fetches:
  - Clients
  - Shoots (filtered by client)
  - Assets (via shoots)
  - Content_Calendar (via assets)
  ↓
Page displays client list + detail view
  ↓
Polling continues every 30 seconds
```

### Lead Dashboard Flow

```
Lead logs in
  ↓
AuthContext checks role → "lead"
  ↓
Router redirects to /dashboard/lead
  ↓
Lead Dashboard loads
  ↓
DataContext fetches:
  - Clients
  - Shoots
  - Photographer_Attendance (active)
  - Editor_Time_Logs (active)
  - Assets
  ↓
Dashboard displays:
  - Team on shoots (with client names)
  - Team editing (with client names)
  - Client list
  ↓
User clicks "+ Add Client"
  ↓
Form opens
  ↓
User submits
  ↓
SheetsAPI.appendRow('Clients', data)
  ↓
DataContext.refreshData('Clients')
  ↓
UI updates immediately
  ↓
Polling continues
```

### Photographer Workflow

```
Photographer logs in
  ↓
Router → /dashboard/photographer
  ↓
Dashboard shows assigned shoots
  ↓
User clicks "Start Shoot"
  ↓
Form: Select shoot
  ↓
SheetsAPI.appendRow('Photographer_Attendance', {
  shoot_id: selected,
  photographer_email: currentUser.email,
  clock_in: now(),
  status: "In Progress"
})
  ↓
DataContext.refreshData('Photographer_Attendance')
  ↓
Button changes to "End Shoot"
  ↓
Lead sees update in dashboard (via polling)
  ↓
User clicks "End Shoot"
  ↓
SheetsAPI.updateRow('Photographer_Attendance', {
  clock_out: now(),
  status: "Completed"
})
  ↓
System calculates duration
  ↓
All dashboards update
```

---

## Implementation Priority

### Phase 1: Foundation (60 min)
1. Project setup
2. Google Sheets API configuration
3. AuthContext + DataContext
4. Base layout + routing

### Phase 2: Core Pages (90 min)
1. Manager Dashboard
2. Clients Page (with calendar)
3. Editor Tasks (Kanban)
4. Content Calendar

### Phase 3: Features (60 min)
1. Photographer pages
2. Team Feed
3. Leave Management

### Phase 4: Polish (30 min)
1. Testing
2. Error handling
3. Deployment

---

## Success Criteria

✅ All 5 roles can login and access dashboards
✅ Lead can add clients and manage calendar
✅ Lead sees team members on shoots (which client)
✅ Lead sees team members editing (which client)
✅ Photographers can clock in/out for shoots
✅ Editors can manage tasks with time tracking
✅ Content calendar shows entries linked to clients
✅ All data persists in Google Sheets
✅ Smart polling updates data every 30 seconds
✅ App deployed and accessible

---

**Ready to build!** This plan provides complete feature matrix, information architecture, and data transmission strategy.

