# Final AI-IDE Developer Prompt (Updated)

## Additional Issues to Include

### 1. Different Clock-In UI for Leads vs Content Creators & Others
- Leads should have a distinct clock-in interface (e.g., may not require asset/shoot/task selection).
- Content Creators, Editors, and Photographers require specific task/shoot selection during clock-in.
- Ensure role-based dynamic rendering of the clock-in modal.

---

### 2. Break Duration Formatting Issue
**Current Behavior:**
- Break duration displays in raw minutes or shows incorrect formatting.
- Sometimes displays values like `120` instead of `2h 0m`.

**Required Behavior:**
- No NaN values.
- Break duration must display in **hours and minutes** formatted as:
  ```
  Xh Ym
  ```
- Apply formatting consistently in:
  - Attendance table
  - Editor_Time_Logs
  - Photographer_Attendance
  - UI timers

---

### 3. Dashboard Widgets Should Be Clickable
- Each dashboard statistic card (e.g., "Pending Review", "Tasks In Progress", "Shoots Today") should act as a navigation button.
- On click, navigate to the respective page (e.g., /assets, /calendar, /tasks).

---

### 4. Client Storage Issue
**Problem:**
- Only client_id is being stored in the spreadsheet.
- Other details like:
  - client_name  
  - contact_person  
  - email  
  - phone_number  
  - project_type  
  - status  

are not saved.

**Fix Required:**
- Ensure full client object is sent and stored.
- Validate API payloads for missing keys.

---

### 5. Content Calendar Not Updating UI
**Problem:**
- New or updated tasks/shoots do not appear in the calendar UI.
- Calendar does not refresh or re-render after updates.

**Fix Required:**
- Force re-fetch of calendar data on:
  - Task assignment
  - Shoot assignment
  - Update of assets
  - Update of shoot status
- Ensure correct mapping to:
  - date
  - employee email
  - status
- Confirm calendar component subscribes to state changes.

---

This content should be merged into the master prompt previously generated.
