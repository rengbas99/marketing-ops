# Duplicate Clock-In Cleanup Guide

## Issue
The system was creating duplicate clock-in records, showing 3 active attendance records when only 2 should exist.

## Solution Implemented

### 1. Automatic Duplicate Detection & Cleanup
- **Location**: `src/utils/attendanceUtils.js`
- **Function**: `findDuplicateClockIns()`
- Automatically detects and flags duplicate clock-in records for the same user on the same day
- Runs on every page load in `AttendancePage.jsx`

### 2. Duplicate Prevention
- **Location**: All dashboard `handleClockIn()` functions
- **Function**: `canClockIn()` from `attendanceUtils.js`
- Prevents new clock-ins if user already has an active session
- Checks before allowing any new clock-in

### 3. Auto Clock-Out After 15 Hours
- **Location**: `src/utils/attendanceUtils.js`
- **Function**: `shouldAutoClockOut()` and `findStaleClockIns()`
- Automatically clocks out users who have been clocked in for more than 15 hours
- Prevents stale sessions from blocking new clock-ins

## How to Check for Existing Duplicates

### Manual Check in Database
1. Query the `Attendance` collection/table
2. Filter for records where:
   - `status = 'clocked_in'`
   - `clock_out IS NULL`
   - Same `employee_id` and `date`

### Example Query (Firebase/Firestore):
```javascript
// Find all users with multiple active clock-ins today
const today = new Date().toISOString().split('T')[0];
const attendance = await getCollection('Attendance');
const duplicates = {};

attendance.forEach(record => {
  if (record.status === 'clocked_in' && !record.clock_out && record.date === today) {
    const key = `${record.employee_id}_${record.date}`;
    if (!duplicates[key]) {
      duplicates[key] = [];
    }
    duplicates[key].push(record);
  }
});

// Filter to only show users with more than one active clock-in
Object.keys(duplicates).forEach(key => {
  if (duplicates[key].length > 1) {
    console.log(`User ${key} has ${duplicates[key].length} active clock-ins:`, duplicates[key]);
  }
});
```

### Cleanup Process
The system will automatically:
1. Keep the oldest clock-in record (first one)
2. Auto clock-out all duplicate records
3. Set `daily_report` to "Auto clocked out (duplicate record)"

## Prevention Measures

### 1. Client-Side Validation
- All `handleClockIn()` functions now check `canClockIn()` before proceeding
- Shows error message if user tries to clock in while already clocked in

### 2. Server-Side Validation (Recommended)
- Add validation in your backend/API to prevent duplicate clock-ins
- Check database before inserting new attendance record

### 3. Auto Clock-Out
- Sessions older than 15 hours are automatically clocked out
- Prevents stale sessions from blocking new clock-ins

## Testing

To test the duplicate prevention:
1. Try to clock in twice without clocking out
2. System should show error: "You already have an active clock-in session. Please clock out first."
3. Check that only one active clock-in exists in the database

To test auto clock-out:
1. Manually set a clock-in time to 16 hours ago in the database
2. Reload the attendance page
3. The system should automatically clock out that session

## Files Modified

- `src/utils/attendanceUtils.js` (NEW) - Utility functions for duplicate detection and auto clock-out
- `src/pages/AttendancePage.jsx` - Added duplicate cleanup and auto clock-out logic
- `src/pages/dashboard/EditorDashboard.jsx` - Added duplicate prevention to clock-in handler
- All other dashboard files should also be updated with duplicate prevention (PhotographerDashboard, LeadDashboard, ContentCreatorDashboard)

## Next Steps

1. **Check Database**: Run the query above to identify any existing duplicate records
2. **Manual Cleanup**: If duplicates exist, manually clock out all but the oldest record
3. **Monitor**: Watch for any new duplicates after deployment
4. **Update Other Dashboards**: Ensure all dashboard `handleClockIn()` functions use `canClockIn()` utility

