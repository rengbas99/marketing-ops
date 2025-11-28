/**
 * Attendance utility functions for duplicate prevention and auto clock-out
 */

/**
 * Check for duplicate clock-in records and return duplicates to remove
 * @param {Array} attendance - Array of attendance records
 * @param {string} userEmail - User email to check
 * @param {string} date - Date to check (YYYY-MM-DD format)
 * @returns {Array} Array of duplicate attendance records (all but the first one)
 */
export function findDuplicateClockIns(attendance, userEmail, date) {
  if (!attendance || !Array.isArray(attendance)) return [];
  
  const todayRecords = attendance.filter(a => 
    a && 
    a.employee_id === userEmail && 
    a.date === date &&
    a.status === 'clocked_in' &&
    !a.clock_out
  );

  // If more than one active clock-in, return all but the first (oldest)
  if (todayRecords.length > 1) {
    // Sort by clock_in time, keep the oldest one
    const sorted = [...todayRecords].sort((a, b) => {
      const timeA = new Date(a.clock_in || 0).getTime();
      const timeB = new Date(b.clock_in || 0).getTime();
      return timeA - timeB;
    });
    
    // Return all except the first (oldest) one
    return sorted.slice(1);
  }

  return [];
}

/**
 * Check if a user has been clocked in for more than 15 hours and auto clock-out
 * @param {Object} attendanceRecord - Attendance record to check
 * @returns {boolean} True if should be auto clocked out
 */
export function shouldAutoClockOut(attendanceRecord) {
  if (!attendanceRecord || !attendanceRecord.clock_in || attendanceRecord.clock_out) {
    return false;
  }

  const clockInTime = new Date(attendanceRecord.clock_in);
  const now = new Date();
  const hoursElapsed = (now - clockInTime) / (1000 * 60 * 60);

  // Auto clock-out after 15 hours
  return hoursElapsed >= 15;
}

/**
 * Check if user can clock in (no active clock-in without clock-out)
 * @param {Array} attendance - Array of attendance records
 * @param {string} userEmail - User email to check
 * @param {string} date - Date to check (YYYY-MM-DD format)
 * @returns {Object} { canClockIn: boolean, reason: string, existingRecord: Object|null }
 */
export function canClockIn(attendance, userEmail, date) {
  if (!attendance || !Array.isArray(attendance)) {
    return { canClockIn: true, reason: '', existingRecord: null };
  }

  // Check for any active clock-in (status is clocked_in and no clock_out)
  const activeClockIn = attendance.find(a => 
    a && 
    a.employee_id === userEmail && 
    a.date === date &&
    a.status === 'clocked_in' &&
    !a.clock_out
  );

  if (activeClockIn) {
    // Check if it's been more than 15 hours (should auto clock-out)
    if (shouldAutoClockOut(activeClockIn)) {
      return { 
        canClockIn: true, 
        reason: 'auto_clockout_needed', 
        existingRecord: activeClockIn 
      };
    }
    
    return { 
      canClockIn: false, 
      reason: 'already_clocked_in', 
      existingRecord: activeClockIn 
    };
  }

  return { canClockIn: true, reason: '', existingRecord: null };
}

/**
 * Find all users with clock-ins older than 15 hours across all attendance records
 * @param {Array} attendance - Array of attendance records
 * @returns {Array} Array of attendance records that should be auto clocked out
 */
export function findStaleClockIns(attendance) {
  if (!attendance || !Array.isArray(attendance)) return [];
  
  return attendance.filter(a => 
    a && 
    a.status === 'clocked_in' &&
    !a.clock_out &&
    shouldAutoClockOut(a)
  );
}

