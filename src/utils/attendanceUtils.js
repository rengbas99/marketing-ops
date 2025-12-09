/**
 * Attendance utility functions for duplicate prevention and auto clock-out
 */

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object without undefined values
 */
function removeUndefinedValues(obj) {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

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
 * Check if user can clock in (no active clock-in without clock-out on the same day)
 * @param {Array} attendance - Array of attendance records
 * @param {string} userEmail - User email to check
 * @param {string} date - Date to check (YYYY-MM-DD format)
 * @returns {Object} { canClockIn: boolean, reason: string, existingRecord: Object|null }
 */
export function canClockIn(attendance, userEmail, date) {
  if (!attendance || !Array.isArray(attendance)) {
    return { canClockIn: true, reason: '', existingRecord: null };
  }

  // Helper to get date from record (check both date field and clock_in timestamp)
  const getRecordDate = (record) => {
    if (record.date) {
      return new Date(record.date).toISOString().split('T')[0];
    }
    if (record.clock_in) {
      return new Date(record.clock_in).toISOString().split('T')[0];
    }
    return null;
  };

  // Check for ANY active clock-in on the same day (not just matching date field)
  // This prevents multiple clock-in sessions on the same day
  const activeClockIn = attendance.find(a => {
    if (!a || !a.employee_id || !a.clock_in) return false;
    
    // Match employee email (trim to handle spaces)
    if (a.employee_id.trim() !== userEmail.trim()) return false;
    
    // Check if record is from the same day
    const recordDate = getRecordDate(a);
    if (recordDate !== date) return false;
    
    // Check if it's an active clock-in (no clock_out)
    if (a.clock_out) return false;
    
    // Check status - should be clocked_in or missing status
    if (a.status && a.status !== 'clocked_in') return false;
    
    return true;
  });

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

/**
 * Apply clock-out times to attendance records that are missing clock_out
 * @param {Array} attendance - Array of attendance records
 * @param {Object} options - Options for applying clock-out
 * @param {string} options.employeeEmail - Optional: filter by specific employee email
 * @param {string} options.month - Optional: filter by month (YYYY-MM format, e.g., "2024-12")
 * @param {Function} options.updateRow - Function to update a row (updateRow(collection, rowIndex, data))
 * @param {Function} options.forceRefresh - Function to refresh data (forceRefresh([collections]))
 * @param {string} options.collection - Collection name (default: 'ATTENDANCE')
 * @param {number} options.defaultClockOutHour - Default clock-out hour (default: 17 for 5 PM)
 * @returns {Promise<Object>} { updated: number, errors: number, results: Array }
 */
export async function applyClockOutTimes(attendance, options = {}) {
  const {
    employeeEmail = null,
    month = null,
    updateRow,
    forceRefresh,
    collection = 'ATTENDANCE',
    defaultClockOutHour = 17
  } = options;

  if (!attendance || !Array.isArray(attendance)) {
    return { updated: 0, errors: 0, results: [] };
  }

  if (!updateRow) {
    throw new Error('updateRow function is required');
  }

  // Filter records that need clock-out
  let recordsToFix = attendance.filter(a => {
    if (!a) return false;
    
    // Must have clock_in but no clock_out
    if (!a.clock_in || a.clock_out) return false;
    
    // Status should be clocked_in or missing status
    if (a.status && a.status !== 'clocked_in') return false;
    
    // Filter by employee email if provided
    if (employeeEmail && a.employee_id !== employeeEmail) return false;
    
    // Filter by month if provided
    if (month) {
      const recordDate = a.date ? new Date(a.date) : (a.clock_in ? new Date(a.clock_in) : null);
      if (!recordDate) return false;
      const recordMonth = recordDate.toISOString().slice(0, 7); // YYYY-MM
      if (recordMonth !== month) return false;
    }
    
    return true;
  });

  const results = [];
  let updated = 0;
  let errors = 0;

  for (const record of recordsToFix) {
    try {
      const clockInTime = new Date(record.clock_in);
      
      // Determine clock-out time
      let clockOutTime = new Date(clockInTime);
      
      // If clock-in is after default hour, set clock-out to same day at default hour + 1
      if (clockInTime.getHours() >= defaultClockOutHour) {
        clockOutTime.setHours(defaultClockOutHour + 1, 0, 0, 0);
      } else {
        // Set to default hour on the same day
        clockOutTime.setHours(defaultClockOutHour, 0, 0, 0);
      }
      
      // If clock-out is before clock-in (shouldn't happen, but safety check)
      if (clockOutTime <= clockInTime) {
        // Set to end of day
        clockOutTime = new Date(clockInTime);
        clockOutTime.setHours(23, 59, 59, 999);
      }

      // Calculate hours worked
      const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
      const breakMinutes = parseFloat(record.total_break_duration || 0);
      const workMinutes = Math.max(0, totalMinutes - breakMinutes);
      const hoursWorked = workMinutes / 60;

      // Find record index
      const index = attendance.findIndex(
        a => a && a.attendance_id === record.attendance_id
      );

      if (index === -1) {
        results.push({
          record,
          status: 'error',
          message: 'Record not found in attendance array'
        });
        errors++;
        continue;
      }

      // Update the record - clean object to remove undefined values
      const updateData = {
        ...record,
        clock_out: clockOutTime.toISOString(),
        status: 'clocked_out',
        hours_worked: hoursWorked.toFixed(2),
      };
      
      // Only include daily_report if it exists or set default
      if (record.daily_report) {
        updateData.daily_report = record.daily_report;
      } else {
        updateData.daily_report = 'Auto clocked out - clock-out time applied';
      }
      
      // Remove any undefined values before updating
      await updateRow(collection, index + 2, removeUndefinedValues(updateData));

      results.push({
        record,
        status: 'success',
        clockOut: clockOutTime.toISOString(),
        hoursWorked: hoursWorked.toFixed(2)
      });
      updated++;
    } catch (err) {
      results.push({
        record,
        status: 'error',
        message: err.message || 'Unknown error'
      });
      errors++;
    }
  }

  // Refresh data if function provided
  if (forceRefresh && updated > 0) {
    try {
      await forceRefresh([collection]);
    } catch (err) {
      console.error('Error refreshing data after applying clock-out times:', err);
    }
  }

  return { updated, errors, results };
}

/**
 * Auto clock-out stale attendance records (over 15 hours)
 * @param {Array} attendance - Array of attendance records
 * @param {Function} updateRow - Function to update a row
 * @param {Function} forceRefresh - Function to refresh data
 * @param {string} collection - Collection name (default: 'ATTENDANCE')
 * @returns {Promise<Object>} { updated: number, errors: number }
 */
export async function autoClockOutStaleRecords(attendance, updateRow, forceRefresh, collection = 'ATTENDANCE') {
  if (!attendance || !Array.isArray(attendance)) {
    return { updated: 0, errors: 0 };
  }

  const staleRecords = findStaleClockIns(attendance);
  let updated = 0;
  let errors = 0;

  for (const record of staleRecords) {
    try {
      const index = attendance.findIndex(
        a => a && a.attendance_id === record.attendance_id
      );

      if (index === -1) {
        errors++;
        continue;
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(record.clock_in);
      const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
      const breakMinutes = parseFloat(record.total_break_duration || 0);
      const workMinutes = Math.max(0, totalMinutes - breakMinutes);
      const hoursWorked = workMinutes / 60;

      // Build update object, removing undefined values
      const updateData = {
        ...record,
        clock_out: clockOutTime.toISOString(),
        status: 'clocked_out',
        hours_worked: hoursWorked.toFixed(2),
      };
      
      // Only include daily_report if it exists or set default
      if (record.daily_report) {
        updateData.daily_report = record.daily_report;
      } else {
        updateData.daily_report = 'Auto clocked out after 15 hours';
      }
      
      // Remove any undefined values before updating
      await updateRow(collection, index + 2, removeUndefinedValues(updateData));

      updated++;
    } catch (err) {
      console.error(`Error auto clocking out record ${record.attendance_id}:`, err);
      errors++;
    }
  }

  if (updated > 0 && forceRefresh) {
    try {
      await forceRefresh([collection]);
    } catch (err) {
      console.error('Error refreshing data after auto clock-out:', err);
    }
  }

  return { updated, errors };
}

