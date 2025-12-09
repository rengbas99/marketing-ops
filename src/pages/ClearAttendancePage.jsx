import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/primitives/Card.jsx';
import { ROLES, COLLECTIONS } from '../constants';
import { clearOldAttendance, clearOldPhotographerAttendance } from '../utils/clearOldAttendance';
import { Trash2, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

export default function ClearAttendancePage() {
  const { data, deleteRow, forceRefresh } = useData();
  const { success, error } = useToast();
  const { user } = useAuth();
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);

  // Only allow Managers to access this page
  if (user?.role !== ROLES.MANAGER) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card glass className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only managers can access this page.</p>
          </Card>
        </div>
      </div>
    );
  }

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const today = new Date().toISOString().split('T')[0];

  // Count records
  const todayAttendanceCount = attendance.filter(a => {
    if (!a) return false;
    const recordDate = a.date ? new Date(a.date).toISOString().split('T')[0] : 
                      (a.clock_in ? new Date(a.clock_in).toISOString().split('T')[0] : '');
    return recordDate === today;
  }).length;

  const oldAttendanceCount = attendance.length - todayAttendanceCount;

  const todayPhotographerCount = photographerAttendance.filter(a => {
    if (!a) return false;
    const recordDate = a.date ? new Date(a.date).toISOString().split('T')[0] : 
                      (a.start_time ? new Date(a.start_time).toISOString().split('T')[0] : '');
    return recordDate === today;
  }).length;

  const oldPhotographerCount = photographerAttendance.length - todayPhotographerCount;

  const handleClearAttendance = async () => {
    if (!confirm(`Are you sure you want to delete ${oldAttendanceCount} old attendance records? This action cannot be undone.`)) {
      return;
    }

    setIsClearing(true);
    setProgress({ deleted: 0, total: oldAttendanceCount, current: 0 });
    setResults(null);

    try {
      const result = await clearOldAttendance(
        deleteRow,
        attendance,
        (progressData) => setProgress(progressData)
      );

      setResults(result);
      
      if (result.errors.length > 0) {
        error(`Cleared ${result.deleted} records. ${result.errors.length} errors occurred.`);
      } else {
        success(`Successfully cleared ${result.deleted} old attendance records. Kept ${result.kept} today's records.`);
      }

      // Refresh data
      await forceRefresh([COLLECTIONS.ATTENDANCE]);
    } catch (err) {
      console.error('Error clearing attendance:', err);
      error('Error clearing attendance: ' + err.message);
    } finally {
      setIsClearing(false);
      setProgress(null);
    }
  };

  const handleClearPhotographerAttendance = async () => {
    if (!confirm(`Are you sure you want to delete ${oldPhotographerCount} old photographer attendance records? This action cannot be undone.`)) {
      return;
    }

    setIsClearing(true);
    setProgress({ deleted: 0, total: oldPhotographerCount, current: 0 });
    setResults(null);

    try {
      const result = await clearOldPhotographerAttendance(
        deleteRow,
        photographerAttendance,
        (progressData) => setProgress(progressData)
      );

      setResults(result);
      
      if (result.errors.length > 0) {
        error(`Cleared ${result.deleted} records. ${result.errors.length} errors occurred.`);
      } else {
        success(`Successfully cleared ${result.deleted} old photographer attendance records. Kept ${result.kept} today's records.`);
      }

      // Refresh data
      await forceRefresh([COLLECTIONS.PHOTOGRAPHER_ATTENDANCE]);
    } catch (err) {
      console.error('Error clearing photographer attendance:', err);
      error('Error clearing photographer attendance: ' + err.message);
    } finally {
      setIsClearing(false);
      setProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clear Old Attendance Data</h1>
          <p className="text-gray-600">Remove all attendance records except today's ({today})</p>
        </div>

        <div className="space-y-6">
          {/* Attendance Records */}
          <Card glass className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Attendance Records</h2>
                <p className="text-sm text-gray-600">
                  Total: {attendance.length} | Today: {todayAttendanceCount} | Old: {oldAttendanceCount}
                </p>
              </div>
              <button
                onClick={handleClearAttendance}
                disabled={isClearing || oldAttendanceCount === 0}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Clear Old Records
                  </>
                )}
              </button>
            </div>

            {progress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress: {progress.current} / {progress.total}</span>
                  <span className="text-gray-600">{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-[transform,opacity,colors,shadow] duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {results && (
              <div className={`mt-4 p-4 rounded-xl ${results.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-start gap-3">
                  {results.errors.length > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-gray-900">
                      Deleted: {results.deleted} | Kept: {results.kept}
                    </p>
                    {results.errors.length > 0 && (
                      <p className="text-sm text-yellow-700 mt-1">
                        {results.errors.length} errors occurred. Check console for details.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Photographer Attendance Records */}
          <Card glass className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Photographer Attendance Records</h2>
                <p className="text-sm text-gray-600">
                  Total: {photographerAttendance.length} | Today: {todayPhotographerCount} | Old: {oldPhotographerCount}
                </p>
              </div>
              <button
                onClick={handleClearPhotographerAttendance}
                disabled={isClearing || oldPhotographerCount === 0}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Clear Old Records
                  </>
                )}
              </button>
            </div>
          </Card>

          {/* Warning */}
          <Card glass className="p-6 bg-yellow-50 border-2 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-2">Warning</h3>
                <p className="text-sm text-yellow-800">
                  This action is irreversible. All attendance records except today's will be permanently deleted.
                  Make sure you have a backup before proceeding.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

