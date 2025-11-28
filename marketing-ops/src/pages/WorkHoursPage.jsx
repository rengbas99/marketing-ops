import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Clock, Calendar, Edit2, Save, X, ChevronLeft, ChevronRight, User, Camera, FileEdit, BarChart3, CheckCircle } from 'lucide-react';
import { COLLECTIONS, ROLES, SHOOT_STATUS, ASSET_STATUS } from '../constants';

export default function WorkHoursPage() {
  const { data, loading, startPolling, stopPolling, updateRow, addRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [editingHours, setEditingHours] = useState(null); // employeeEmail
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null); // email of employee whose details are shown
  const [showWorkDetailsModal, setShowWorkDetailsModal] = useState(null); // employee email whose modal is shown

  useEffect(() => {
    startPolling('work-hours-page', [
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.USERS,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.MONTHLY_HOURS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.ASSETS,
      COLLECTIONS.CLIENTS
    ]);
    return () => stopPolling('work-hours-page');
  }, [startPolling, stopPolling]);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const editorTimeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const monthlyHours = Array.isArray(data.Monthly_Hours) ? data.Monthly_Hours : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  // Calculate monthly hours for a user
  const calculateMonthlyHours = (employeeEmail, month) => {
    const monthStart = new Date(month + '-01');
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0); // Last day of month

    // Check if there's a manual override in Monthly_Hours table
    const manualOverride = monthlyHours.find(
      mh => mh && mh.employee_email === employeeEmail && mh.month === month
    );

    if (manualOverride && manualOverride.hours !== undefined && manualOverride.hours !== '') {
      return parseFloat(manualOverride.hours) || 0;
    }

    // Calculate from attendance records
    const dailyHours = attendance
      .filter(a => {
        if (!a || a.employee_id !== employeeEmail) return false;
        try {
          const date = new Date(a.date);
          return date >= monthStart && date <= monthEnd && a.status === 'clocked_out';
        } catch {
          return false;
        }
      })
      .reduce((sum, a) => {
        if (a.hours_worked) {
          return sum + parseFloat(a.hours_worked);
        }
        if (a.clock_in && a.clock_out) {
          try {
            const inTime = new Date(a.clock_in);
            const outTime = new Date(a.clock_out);
            const totalMinutes = (outTime - inTime) / (1000 * 60);
            // Exclude break time from calculation
            const breakMinutes = parseFloat(a.total_break_duration || 0);
            const workMinutes = Math.max(0, totalMinutes - breakMinutes);
            const hours = workMinutes / 60;
            return sum + hours;
          } catch {
            return sum;
          }
        }
        return sum;
      }, 0);

    // Photographer shoot hours
    const shootHours = photographerAttendance
      .filter(a => {
        if (!a || a.photographer_email !== employeeEmail || a.status !== SHOOT_STATUS.COMPLETED) return false;
        try {
          const date = new Date(a.date || a.start_time || a.clock_in);
          return date >= monthStart && date <= monthEnd;
        } catch {
          return false;
        }
      })
      .reduce((sum, a) => {
        const hours = parseFloat(a.work_duration || a.duration || 0);
        return sum + hours;
      }, 0);

    // Editor time log hours
    const editingHours = editorTimeLogs
      .filter(log => {
        if (!log || log.editor_email !== employeeEmail || !log.end_time || log.task_status !== ASSET_STATUS.COMPLETED) return false;
        try {
          const date = new Date(log.start_time);
          return date >= monthStart && date <= monthEnd;
        } catch {
          return false;
        }
      })
      .reduce((sum, log) => {
        const hours = parseFloat(log.work_duration || log.duration || 0);
        return sum + hours;
      }, 0);

    return dailyHours + shootHours + editingHours;
  };

  // Get users to display (all employees except managers for leads, all for managers)
  const getUsersToDisplay = () => {
    if (user?.role === ROLES.MANAGER) {
      return users.filter(u => u && u.active !== 'FALSE' && u.active !== false);
    }

    if (user?.role === ROLES.LEAD) {
      return users.filter(u => u && u.active !== 'FALSE' && u.active !== false && u.role !== ROLES.MANAGER);
    }

    return [];
  };

  const usersToDisplay = getUsersToDisplay();

  // Get detailed work for an employee for selected month
  const getEmployeeWorkDetails = (employeeEmail) => {
    const monthStart = new Date(selectedMonth + '-01');
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    // Get completed shoots
    const employeeShoots = photographerAttendance
      .filter(a => {
        if (!a || a.photographer_email !== employeeEmail || a.status !== SHOOT_STATUS.COMPLETED) return false;
        try {
          const date = new Date(a.start_time || a.clock_in || a.date);
          return date >= monthStart && date <= monthEnd;
        } catch {
          return false;
        }
      })
      .map(att => {
        let shoot = null;
        if (att.shoot_id === 'GENERAL') {
          shoot = { shoot_id: 'GENERAL', shoot_name: 'General Shoot', client_id: null };
        } else {
          shoot = shoots.find(s => s && s.shoot_id === att.shoot_id);
        }
        const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
        return { ...att, shoot, client };
      });

    // Get completed tasks
    const employeeTasks = editorTimeLogs
      .filter(log => {
        if (!log || log.editor_email !== employeeEmail || log.task_status !== ASSET_STATUS.COMPLETED || !log.end_time) return false;
        try {
          const date = new Date(log.start_time);
          return date >= monthStart && date <= monthEnd;
        } catch {
          return false;
        }
      })
      .map(log => {
        const asset = assets.find(a => a && a.asset_id === log.asset_id);
        const shoot = asset ? shoots.find(s => s && s.shoot_id === (asset.shoot_id || asset.linked_shoot_id)) : null;
        const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
        return { ...log, asset, shoot, client };
      });

    return { shoots: employeeShoots, tasks: employeeTasks };
  };

  const handleEditHours = (employeeEmail, currentHours) => {
    setEditingHours(employeeEmail);
    setEditValue(currentHours.toFixed(2));
  };

  const handleCancelEdit = () => {
    setEditingHours(null);
    setEditValue('');
  };

  const handleSaveHours = async (employeeEmail) => {
    if (!editValue || isNaN(parseFloat(editValue)) || parseFloat(editValue) < 0) {
      error('Please enter a valid number of hours');
      return;
    }

    setIsSaving(true);
    try {
      const hoursValue = parseFloat(editValue);

      // Check if record exists in Monthly_Hours
      const existingRecord = monthlyHours.find(
        mh => mh && mh.employee_email === employeeEmail && mh.month === selectedMonth
      );

      if (existingRecord) {
        // Update existing record
        const index = monthlyHours.findIndex(
          mh => mh && mh.employee_email === employeeEmail && mh.month === selectedMonth
        );
        await updateRow(COLLECTIONS.MONTHLY_HOURS, index + 2, {
          ...existingRecord,
          hours: hoursValue.toFixed(2),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Create new record
        await addRow(COLLECTIONS.MONTHLY_HOURS, {
          monthly_hours_id: `MH-${Date.now()}`,
          employee_email: employeeEmail,
          month: selectedMonth,
          hours: hoursValue.toFixed(2),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      await forceRefresh([COLLECTIONS.MONTHLY_HOURS]);
      setEditingHours(null);
      setEditValue('');
      success(`Hours updated successfully for ${users.find(u => u.email === employeeEmail)?.name || employeeEmail}`);
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      if (errorMsg.includes('OAuth2_REQUIRED') || errorMsg.includes('OAuth2')) {
        success('Hours updated! (Data saved locally. OAuth2 setup needed for Google Sheets sync)');
        setEditingHours(null);
        setEditValue('');
      } else {
        error('Error updating hours: ' + errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isManager = user?.role === ROLES.MANAGER;
  const isLead = user?.role === ROLES.LEAD;

  if (!isManager && !isLead) {
    return (
      <div className="animate-fadeIn mobile-padding pb-8">
        <div className="glass-card p-8 text-center">
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = selectedMonth === currentMonth;

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          Work Hours & Completed Work
        </h1>
        <p className="text-gray-600">
          View monthly work hours and detailed completed work for each employee
        </p>
      </div>

      {/* Month Selector */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => {
                  const current = new Date(selectedMonth + '-01');
                  current.setMonth(current.getMonth() - 1);
                  setSelectedMonth(current.toISOString().slice(0, 7));
                }}
                className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 text-center"
              />
              <button
                onClick={() => {
                  const current = new Date(selectedMonth + '-01');
                  const now = new Date();
                  if (current < now) {
                    current.setMonth(current.getMonth() + 1);
                    setSelectedMonth(current.toISOString().slice(0, 7));
                  }
                }}
                disabled={selectedMonth >= currentMonth}
                className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setSelectedMonth(currentMonth)}
              className="px-4 py-2 text-sm bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors"
            >
              Current Month
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            {isCurrentMonth && (
              <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Work Hours Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Completed Work
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usersToDisplay.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    No employees found
                  </td>
                </tr>
              ) : (
                usersToDisplay.map((employee, index) => {
                  const hours = calculateMonthlyHours(employee.email, selectedMonth);
                  const isEditing = editingHours === employee.email;
                  const workDetails = getEmployeeWorkDetails(employee.email);
                  const completedShootsCount = workDetails.shoots.length;
                  const completedTasksCount = workDetails.tasks.length;
                  const totalCompleted = completedShootsCount + completedTasksCount;
                  const isExpanded = expandedEmployee === employee.email;

                  return (
                    <>
                      <tr
                        key={employee.email || index}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
                              {employee.name?.charAt(0) || <User className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {employee.name || employee.email}
                              </div>
                              <div className="text-xs text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-600 capitalize bg-gray-100 px-2 py-1 rounded">
                            {employee.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                min="0"
                                step="0.1"
                                className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-right font-bold"
                                autoFocus
                                disabled={isSaving}
                              />
                              <span className="text-sm text-gray-500 font-medium">hrs</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-bold text-gray-900">
                                {hours.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500 font-medium">hrs</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isManager && totalCompleted > 0 ? (
                            <button
                              onClick={() => setShowWorkDetailsModal(employee.email)}
                              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition-all hover:scale-105 active:scale-95 shadow-sm border border-blue-100"
                            >
                              {totalCompleted} {totalCompleted === 1 ? 'Item' : 'Items'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (totalCompleted > 0) {
                                  setExpandedEmployee(isExpanded ? null : employee.email);
                                }
                              }}
                              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${totalCompleted > 0
                                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:scale-105 active:scale-95 shadow-sm border border-blue-100 cursor-pointer'
                                  : 'text-gray-400 cursor-default'
                                }`}
                            >
                              {totalCompleted > 0 ? (
                                <span>{totalCompleted} {totalCompleted === 1 ? 'Item' : 'Items'}</span>
                              ) : (
                                <span>No work</span>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSaveHours(employee.email)}
                                disabled={isSaving}
                                className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditHours(employee.email, hours)}
                              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Edit hours"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="px-6 py-6 bg-gray-50/50 border-t border-gray-100 shadow-inner">
                            <div className="space-y-6 max-w-4xl mx-auto">
                              {completedShootsCount > 0 && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                    <Camera className="w-4 h-4" />
                                    Completed Shoots
                                  </h4>
                                  <div className="grid gap-3">
                                    {workDetails.shoots.map((shoot, idx) => (
                                      <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <div className="font-bold text-gray-900">
                                              {shoot.shoot?.shoot_name || 'General Shoot'}
                                            </div>
                                            {shoot.client && (
                                              <div className="text-xs text-primary font-bold uppercase tracking-wider mt-1">
                                                {shoot.client.company_name}
                                              </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1 font-medium">
                                              {new Date(shoot.start_time || shoot.clock_in || shoot.date).toLocaleDateString()}
                                            </div>
                                          </div>
                                          <div className="text-right bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <div className="font-bold text-gray-900">
                                              {parseFloat(shoot.work_duration || shoot.duration || 0).toFixed(2)}h
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Work Time</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {completedTasksCount > 0 && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                    <FileEdit className="w-4 h-4" />
                                    Completed Tasks
                                  </h4>
                                  <div className="grid gap-3">
                                    {workDetails.tasks.map((task, idx) => (
                                      <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <div className="font-bold text-gray-900">
                                              {task.asset?.title || 'Untitled Task'}
                                            </div>
                                            {task.client && (
                                              <div className="text-xs text-primary font-bold uppercase tracking-wider mt-1">
                                                {task.client.company_name}
                                              </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1 font-medium">
                                              {new Date(task.start_time).toLocaleDateString()}
                                            </div>
                                          </div>
                                          <div className="text-right bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <div className="font-bold text-gray-900">
                                              {parseFloat(task.work_duration || task.duration || 0).toFixed(2)}h
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Work Time</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-4 bg-blue-50/50 border-blue-100 flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-900 mb-1">How it works</h3>
          <ul className="text-xs text-blue-800 space-y-1 font-medium">
            <li>• Hours are calculated automatically from attendance, shoots, and editing logs</li>
            <li>• You can manually override hours by clicking the edit button</li>
            <li>• Each month starts fresh - hours reset to zero at the beginning of each month</li>
            <li>• View previous months by selecting them from the month picker</li>
          </ul>
        </div>
      </div>

      {/* Work Details Modal for Managers */}
      {showWorkDetailsModal && isManager && (() => {
        const employee = users.find(u => u && u.email === showWorkDetailsModal);
        const workDetails = getEmployeeWorkDetails(showWorkDetailsModal);
        const completedShoots = workDetails.shoots;
        const completedTasks = workDetails.tasks;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity z-[100]"
              onClick={() => setShowWorkDetailsModal(null)}
            />
            <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[101] animate-fadeIn p-0 flex flex-col bg-white/95 shadow-2xl">
              <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-[102]">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Work Details - {employee?.name || showWorkDetailsModal}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">
                    {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkDetailsModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto">
                {/* Completed Shoots */}
                {completedShoots.length > 0 && (
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-primary" />
                      Completed Shoots ({completedShoots.length})
                    </h4>
                    <div className="grid gap-3">
                      {completedShoots.map((shoot, idx) => {
                        const shootObj = shoots.find(s => s && s.shoot_id === shoot.shoot_id);
                        const client = shootObj ? clients.find(c => c && c.client_id === shootObj.client_id) : null;
                        return (
                          <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-gray-900">
                                  {shootObj?.title || shootObj?.shoot_name || 'General Shoot'}
                                </div>
                                {client && (
                                  <div className="text-xs text-primary font-bold uppercase tracking-wider mt-1">
                                    {client.company_name}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1 font-medium">
                                  {new Date(shoot.start_time || shoot.clock_in || shoot.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                <div className="font-bold text-gray-900">
                                  {parseFloat(shoot.work_duration || shoot.duration || 0).toFixed(2)}h
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Hours</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileEdit className="w-5 h-5 text-purple-600" />
                      Completed Tasks ({completedTasks.length})
                    </h4>
                    <div className="grid gap-3">
                      {completedTasks.map((task, idx) => {
                        const asset = assets.find(a => a && a.asset_id === task.asset_id);
                        const shoot = asset ? shoots.find(s => s && s.shoot_id === (asset.shoot_id || asset.linked_shoot_id)) : null;
                        const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                        return (
                          <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-gray-900">
                                  {asset?.title || 'Untitled Task'}
                                </div>
                                {client && (
                                  <div className="text-xs text-primary font-bold uppercase tracking-wider mt-1">
                                    {client.company_name}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1 font-medium">
                                  {new Date(task.start_time).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                <div className="font-bold text-gray-900">
                                  {parseFloat(task.work_duration || task.duration || 0).toFixed(2)}h
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Hours</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {completedShoots.length === 0 && completedTasks.length === 0 && (
                  <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <p>No completed work for this month</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
