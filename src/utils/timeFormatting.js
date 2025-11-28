/**
 * Format break duration to "Xh Ym" format
 * Handles NaN, null, undefined, and negative values
 * @param {number|string} minutes - Total minutes
 * @returns {string} Formatted string (e.g., "2h 30m")
 */
export const formatBreakDuration = (minutes) => {
  const totalMinutes = Math.floor(parseFloat(minutes) || 0);
  if (totalMinutes < 0) return '0h 0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
};

/**
 * General time formatter (for non-break durations)
 * @param {number|string} minutes - Total minutes
 * @returns {string} Formatted string (e.g., "30m" or "2h 30m")
 */
export const formatTime = (minutes) => {
  const totalMinutes = Math.floor(parseFloat(minutes) || 0);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

/**
 * Calculate total break duration from Time_Breaks array
 * Aggregates all breaks linked to a time_log_id or attendance_id
 * @param {Array} breaks - Array of break records from Time_Breaks
 * @param {string} timeLogId - Optional time log ID to filter breaks
 * @param {string} attendanceId - Optional attendance ID to filter breaks
 * @returns {number} Total break duration in minutes
 */
export const calculateTotalBreakDuration = (breaks = [], timeLogId = null, attendanceId = null) => {
  if (!Array.isArray(breaks) || breaks.length === 0) return 0;
  
  const relevantBreaks = breaks.filter(b => {
    if (!b) return false;
    // If break has an end time, use the stored duration
    if (b.break_end && b.duration) {
      // Filter by time_log_id or attendance_id
      if (timeLogId && b.time_log_id === timeLogId) return true;
      if (attendanceId && b.attendance_id === attendanceId) return true;
      return false;
    }
    // If break is still active (no end time), calculate duration from start
    if (!b.break_end && b.break_start) {
      const now = new Date();
      const start = new Date(b.break_start);
      const duration = Math.floor((now - start) / (1000 * 60));
      // Filter by time_log_id or attendance_id
      if (timeLogId && b.time_log_id === timeLogId) return true;
      if (attendanceId && b.attendance_id === attendanceId) return true;
      return false;
    }
    return false;
  });
  
  return relevantBreaks.reduce((total, b) => {
    if (b.break_end && b.duration) {
      return total + (parseFloat(b.duration) || 0);
    } else if (!b.break_end && b.break_start) {
      const now = new Date();
      const start = new Date(b.break_start);
      return total + Math.floor((now - start) / (1000 * 60));
    }
    return total;
  }, 0);
};

