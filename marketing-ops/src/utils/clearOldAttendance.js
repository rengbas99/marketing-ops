/**
 * Utility function to clear old attendance records, keeping only today's records
 * This should be run manually or through an admin interface
 */

import { COLLECTIONS } from '../constants';

/**
 * Clear all attendance records except today's
 * @param {Function} deleteRow - The deleteRow function from DataContext
 * @param {Array} attendance - Array of attendance records
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<{deleted: number, kept: number}>}
 */
export async function clearOldAttendance(deleteRow, attendance, onProgress) {
  if (!attendance || !Array.isArray(attendance)) {
    throw new Error('Invalid attendance data');
  }

  const today = new Date().toISOString().split('T')[0];
  let deleted = 0;
  let kept = 0;
  const errors = [];

  // Filter to find records that are NOT from today
  const recordsToDelete = attendance.filter((record, index) => {
    if (!record) return false;
    
    // Get the date from the record
    let recordDate = '';
    if (record.date) {
      recordDate = new Date(record.date).toISOString().split('T')[0];
    } else if (record.clock_in) {
      recordDate = new Date(record.clock_in).toISOString().split('T')[0];
    } else if (record.created_at) {
      recordDate = new Date(record.created_at).toISOString().split('T')[0];
    }

    // Keep today's records
    if (recordDate === today) {
      kept++;
      return false;
    }

    // Mark for deletion
    return true;
  });

  // Delete records (in reverse order to maintain indices)
  for (let i = recordsToDelete.length - 1; i >= 0; i--) {
    const record = recordsToDelete[i];
    const originalIndex = attendance.findIndex(r => r && (
      r.attendance_id === record.attendance_id ||
      r.id === record.id ||
      r._id === record._id
    ));

    if (originalIndex !== -1) {
      try {
        // Calculate row index (1-based with header row)
        const rowIndex = originalIndex + 2;
        await deleteRow(COLLECTIONS.ATTENDANCE, rowIndex);
        deleted++;
        
        if (onProgress) {
          onProgress({
            deleted,
            total: recordsToDelete.length,
            current: recordsToDelete.length - i
          });
        }
      } catch (error) {
        console.error(`Error deleting attendance record ${record.attendance_id || record.id}:`, error);
        errors.push({ record, error: error.message });
      }
    }
  }

  return {
    deleted,
    kept,
    errors,
    total: attendance.length
  };
}

/**
 * Clear old attendance records from Photographer_Attendance collection
 * @param {Function} deleteRow - The deleteRow function from DataContext
 * @param {Array} photographerAttendance - Array of photographer attendance records
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<{deleted: number, kept: number}>}
 */
export async function clearOldPhotographerAttendance(deleteRow, photographerAttendance, onProgress) {
  if (!photographerAttendance || !Array.isArray(photographerAttendance)) {
    throw new Error('Invalid photographer attendance data');
  }

  const today = new Date().toISOString().split('T')[0];
  let deleted = 0;
  let kept = 0;
  const errors = [];

  const recordsToDelete = photographerAttendance.filter((record, index) => {
    if (!record) return false;
    
    let recordDate = '';
    if (record.date) {
      recordDate = new Date(record.date).toISOString().split('T')[0];
    } else if (record.start_time) {
      recordDate = new Date(record.start_time).toISOString().split('T')[0];
    } else if (record.clock_in) {
      recordDate = new Date(record.clock_in).toISOString().split('T')[0];
    }

    if (recordDate === today) {
      kept++;
      return false;
    }

    return true;
  });

  for (let i = recordsToDelete.length - 1; i >= 0; i--) {
    const record = recordsToDelete[i];
    const originalIndex = photographerAttendance.findIndex(r => r && (
      r.attendance_id === record.attendance_id ||
      r.id === record.id ||
      r._id === record._id
    ));

    if (originalIndex !== -1) {
      try {
        const rowIndex = originalIndex + 2;
        await deleteRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, rowIndex);
        deleted++;
        
        if (onProgress) {
          onProgress({
            deleted,
            total: recordsToDelete.length,
            current: recordsToDelete.length - i
          });
        }
      } catch (error) {
        console.error(`Error deleting photographer attendance record:`, error);
        errors.push({ record, error: error.message });
      }
    }
  }

  return {
    deleted,
    kept,
    errors,
    total: photographerAttendance.length
  };
}

