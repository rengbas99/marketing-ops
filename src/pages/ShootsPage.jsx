import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import StartShootForm from '../components/StartShootForm';
import BreakDialog from '../components/BreakDialog';
import BreakTimer from '../components/BreakTimer';
import WorkLinksModal from '../components/WorkLinksModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Camera, Calendar, MapPin, Clock, User, Play, Square, Coffee, Link as LinkIcon, Plus, Edit, X, Calendar as CalendarIcon, AlertCircle, Trash2 } from 'lucide-react';
import { formatBreakDuration } from '../utils/timeFormatting';
import { COLLECTIONS, ROLES, SHOOT_STATUS } from '../constants';

export default function ShootsPage() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling, addRow, updateRow, deleteRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [activeShoot, setActiveShoot] = useState(null);
  const [selectedShoot, setSelectedShoot] = useState(null);
  const [showStartForm, setShowStartForm] = useState(false);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showWorkLinks, setShowWorkLinks] = useState(false);
  const [activeBreak, setActiveBreak] = useState(null);
  const [showEndShootConfirm, setShowEndShootConfirm] = useState(false);
  const [editingShoot, setEditingShoot] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [shootToCancel, setShootToCancel] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shootToDelete, setShootToDelete] = useState(null);
  const [showShootAssignment, setShowShootAssignment] = useState(false);
  const [isCreatingShoot, setIsCreatingShoot] = useState(false);
  const [newShoot, setNewShoot] = useState({
    shoot_name: '',
    client_id: '',
    photographer_id: '',
    date: '',
    time: '',
    location_name: '',
  });

  useEffect(() => {
    startPolling('shoots-page', [
      COLLECTIONS.SHOOTS,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.USERS,
      COLLECTIONS.ASSETS
    ]);
    return () => stopPolling('shoots-page');
  }, [startPolling, stopPolling]);

  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const attendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];
  const users = Array.isArray(data.Users) ? data.Users : [];

  // Available photographers for shoot assignment
  const availablePhotographers = (Array.isArray(users) ? users : []).filter(
    u => u && u.active !== 'FALSE' && u.active !== false && 
    (u.role === ROLES.PHOTOGRAPHER || u.role === ROLES.LEAD)
  );

  useEffect(() => {
    if (user?.role === ROLES.PHOTOGRAPHER) {
      const active = attendance.find(
        a => a && a.photographer_email === user?.email && a.status === 'In Progress'
      );
      if (active) {
        const shoot = shoots.find(s => s && s.shoot_id === active.shoot_id);
        setActiveShoot({ ...active, shoot });

        const activeBreakRecord = breaks.find(
          b => b && b.attendance_id === active.attendance_id && !b.break_end
        );
        setActiveBreak(activeBreakRecord);
      } else {
        setActiveShoot(null);
        setActiveBreak(null);
      }
    }
  }, [data, user, attendance, shoots, breaks]);

  const visibleShoots = user?.role === ROLES.PHOTOGRAPHER
    ? shoots.filter(s => s && s.photographer_id === user?.email)
    : shoots;

  const handleStartShoot = async (shootData) => {
    const existingAttendance = attendance.find(
      a => a && a.shoot_id === shootData.shoot_id &&
        a.photographer_email === user?.email &&
        a.status === 'In Progress' && !a.end_time
    );

    if (existingAttendance) {
      error('You are already working on this shoot!');
      return;
    }

    try {
      const gps = { lat: null, lng: null };

      const attendanceData = {
        attendance_id: `ATT-${Date.now()}`,
        shoot_id: shootData.shoot_id,
        photographer_email: user.email,
        start_time: new Date().toISOString(),
        clock_in: new Date().toISOString(),
        status: 'In Progress',
        date: new Date().toISOString().split('T')[0],
        notes: shootData.notes || '',
        location_name: shootData.location_name || '',
        gps_latitude: gps.lat,
        gps_longitude: gps.lng,
        break_start_time: null,
        break_end_time: null,
        total_break_duration: 0,
        work_duration: 0,
        upload_links: '',
      };

      await addRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, attendanceData);

      const shootIndex = shoots.findIndex(s => s && s.shoot_id === shootData.shoot_id);
      if (shootIndex !== -1) {
        await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, { status: SHOOT_STATUS.IN_PROGRESS });
      }

      await forceRefresh([COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.SHOOTS, COLLECTIONS.CONTENT_CALENDAR]);

      success('Shoot started!');
    } catch (err) {
      error('Error starting shoot: ' + err.message);
    }
  };

  const handleTakeBreak = async (breakType) => {
    if (!activeShoot) return;

    if (activeBreak) {
      error('You are already on a break!');
      return;
    }

    try {
      const breakData = {
        break_id: `BRK-${Date.now()}`,
        user_email: user.email,
        attendance_id: activeShoot.attendance_id,
        time_log_id: null,
        break_start: new Date().toISOString(),
        break_end: null,
        duration: 0,
        break_type: breakType,
        created_at: new Date().toISOString(),
      };

      await addRow(COLLECTIONS.TIME_BREAKS, breakData);

      const index = attendance.findIndex(a => a && a.attendance_id === activeShoot.attendance_id);
      if (index !== -1) {
        await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, index + 2, {
          ...activeShoot,
          break_start_time: new Date().toISOString(),
        });
      }

      await forceRefresh([COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.TIME_BREAKS]);

      success(`Break started (${breakType})`);
    } catch (err) {
      error('Error starting break: ' + err.message);
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak) return;

    try {
      const breakEnd = new Date();
      const breakStart = new Date(activeBreak.break_start);
      const duration = Math.floor((breakEnd - breakStart) / 1000 / 60);

      const breakIndex = breaks.findIndex(b => b && b.break_id === activeBreak.break_id);
      if (breakIndex !== -1) {
        await updateRow(COLLECTIONS.TIME_BREAKS, breakIndex + 2, {
          ...activeBreak,
          break_end: breakEnd.toISOString(),
          duration: duration,
        });
      }

      const attIndex = attendance.findIndex(a => a && a.attendance_id === activeShoot.attendance_id);
      if (attIndex !== -1) {
        const currentTotal = (activeShoot.total_break_duration || 0) + duration;
        await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, attIndex + 2, {
          ...activeShoot,
          break_end_time: breakEnd.toISOString(),
          total_break_duration: currentTotal,
        });
      }

      await forceRefresh([COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.TIME_BREAKS]);

      setActiveBreak(null);
      success('Break ended');
    } catch (err) {
      error('Error ending break: ' + err.message);
    }
  };

  const handleSaveWorkLinks = async (links) => {
    if (!activeShoot) return;

    try {
      const index = attendance.findIndex(a => a && a.attendance_id === activeShoot.attendance_id);
      if (index !== -1) {
        await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, index + 2, {
          ...activeShoot,
          upload_links: links,
        });

        await forceRefresh([COLLECTIONS.PHOTOGRAPHER_ATTENDANCE]);

        success('Work links saved!');
      }
    } catch (err) {
      error('Error saving links: ' + err.message);
    }
  };

  const handleEndShoot = async () => {
    if (!activeShoot) return;

    if (activeBreak) {
      setShowEndShootConfirm(true);
      return;
    }

    await completeShoot();
  };

  const completeShoot = async () => {
    if (!activeShoot) return;

    if (activeBreak) {
      await handleEndBreak();
    }

    try {
      const index = attendance.findIndex(a => a && a.attendance_id === activeShoot.attendance_id);
      if (index !== -1) {
        const endTime = new Date();
        const startTime = new Date(activeShoot.start_time || activeShoot.clock_in);
        const totalMinutes = (endTime - startTime) / (1000 * 60);
        const breakMinutes = activeShoot.total_break_duration || 0;
        const workMinutes = totalMinutes - breakMinutes;
        const workDuration = workMinutes / 60;

        await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, index + 2, {
          ...activeShoot,
          end_time: endTime.toISOString(),
          clock_out: endTime.toISOString(),
          status: 'Completed',
          duration: (totalMinutes / 60).toFixed(2),
          work_duration: workDuration.toFixed(2),
        });

        const shootIndex = shoots.findIndex(s => s && s.shoot_id === activeShoot.shoot_id);
        if (shootIndex !== -1) {
          await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, { status: SHOOT_STATUS.COMPLETED });
        }

        await forceRefresh([COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.SHOOTS, COLLECTIONS.CONTENT_CALENDAR]);

        setActiveShoot(null);
        setActiveBreak(null);
        setShowEndShootConfirm(false);
        success('Shoot completed!');
      }
    } catch (err) {
      error('Error ending shoot: ' + err.message);
    }
  };

  const handleEditShoot = (shoot) => {
    setEditingShoot({ ...shoot });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingShoot) return;

    try {
      const shootIndex = shoots.findIndex(s => s && s.shoot_id === editingShoot.shoot_id);
      if (shootIndex !== -1) {
        await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, {
          shoot_name: editingShoot.shoot_name || editingShoot.title || '',
          title: editingShoot.shoot_name || editingShoot.title || '',
          date: editingShoot.date,
          time: editingShoot.time || '',
          location_name: editingShoot.location_name || editingShoot.location || '',
          location: editingShoot.location_name || editingShoot.location || '',
          client_id: editingShoot.client_id || '',
          photographer_id: editingShoot.photographer_id || '',
          lead_photographer_email: editingShoot.photographer_id || editingShoot.lead_photographer_email || '',
          notes: editingShoot.notes || '',
        });

        await forceRefresh([COLLECTIONS.SHOOTS, COLLECTIONS.CONTENT_CALENDAR]);
        success('Shoot updated successfully!');
        setShowEditModal(false);
        setEditingShoot(null);
      }
    } catch (err) {
      error('Error updating shoot: ' + err.message);
    }
  };

  const handleAssignShoot = async (e) => {
    e.preventDefault();
    if (isCreatingShoot) return;

    if (!newShoot.shoot_name || !newShoot.photographer_id || !newShoot.date) {
      error('Please fill in all required fields (Shoot Name, Videographer, and Date)');
      return;
    }

    try {
      const existingShoot = shoots.find(s =>
        s &&
        (s.shoot_name === newShoot.shoot_name || s.title === newShoot.shoot_name) &&
        s.photographer_id === newShoot.photographer_id &&
        s.date === newShoot.date &&
        s.status !== SHOOT_STATUS.COMPLETED
      );

      if (existingShoot) {
        error('A shoot with the same name, videographer, and date already exists');
        return;
      }

      setIsCreatingShoot(true);
      await addRow(COLLECTIONS.SHOOTS, {
        shoot_id: `SH-${Date.now()}`,
        title: newShoot.shoot_name,
        shoot_name: newShoot.shoot_name,
        client_id: newShoot.client_id || '',
        photographer_id: newShoot.photographer_id,
        lead_photographer_email: newShoot.photographer_id,
        date: newShoot.date,
        time: newShoot.time || '',
        location: newShoot.location_name || '',
        location_name: newShoot.location_name || '',
        status: SHOOT_STATUS.SCHEDULED,
        notes: '',
        created_at: new Date().toISOString(),
      });

      success(`Shoot assigned to ${users.find(u => u && u.email === newShoot.photographer_id)?.name || newShoot.photographer_id}`);
      setShowShootAssignment(false);
      setNewShoot({
        shoot_name: '',
        client_id: '',
        photographer_id: '',
        date: '',
        time: '',
        location_name: '',
      });

      await forceRefresh([COLLECTIONS.SHOOTS]);
      setIsCreatingShoot(false);
    } catch (err) {
      setIsCreatingShoot(false);
      error('Error creating shoot: ' + err.message);
    }
  };

  const handleCancelShoot = (shoot) => {
    setShootToCancel(shoot);
    setShowCancelConfirm(true);
  };

  const confirmCancelShoot = async () => {
    if (!shootToCancel) return;

    try {
      const shootIndex = shoots.findIndex(s => s && s.shoot_id === shootToCancel.shoot_id);
      if (shootIndex !== -1) {
        await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, { 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        });
        
        // Auto-clock out photographers after 15 minutes if they're on this shoot
        // This will be handled by the photographer dashboard useEffect
        
        await forceRefresh([COLLECTIONS.SHOOTS, COLLECTIONS.CONTENT_CALENDAR, COLLECTIONS.PHOTOGRAPHER_ATTENDANCE]);
        success('Shoot cancelled successfully! Photographers will be auto-clocked out after 15 minutes.');
        setShowCancelConfirm(false);
        setShootToCancel(null);
      }
    } catch (err) {
      error('Error cancelling shoot: ' + err.message);
    }
  };

  const handleDeleteShoot = (shoot) => {
    setShootToDelete(shoot);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteShoot = async () => {
    if (!shootToDelete) return;

    try {
      const shootIndex = shoots.findIndex(s => s && s.shoot_id === shootToDelete.shoot_id);
      if (shootIndex !== -1) {
        await deleteRow(COLLECTIONS.SHOOTS, shootIndex + 2);
        await forceRefresh([COLLECTIONS.SHOOTS, COLLECTIONS.CONTENT_CALENDAR, COLLECTIONS.PHOTOGRAPHER_ATTENDANCE]);
        success('Shoot deleted successfully!');
        setShowDeleteConfirm(false);
        setShootToDelete(null);
      } else {
        error('Shoot not found');
      }
    } catch (err) {
      error('Error deleting shoot: ' + err.message);
      setShowDeleteConfirm(false);
      setShootToDelete(null);
    }
  };

  const handlePostponeShoot = async (shoot) => {
    try {
      const shootIndex = shoots.findIndex(s => s && s.shoot_id === shoot.shoot_id);
      if (shootIndex !== -1) {
        const newDate = prompt('Enter new date (YYYY-MM-DD):', shoot.date);
        if (newDate) {
          await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, { date: newDate });
          await forceRefresh([COLLECTIONS.SHOOTS, COLLECTIONS.CONTENT_CALENDAR]);
          success('Shoot postponed successfully!');
        }
      }
    } catch (err) {
      error('Error postponing shoot: ' + err.message);
    }
  };

  const canManageShoot = user?.role === ROLES.MANAGER || user?.role === ROLES.LEAD;

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getElapsedTime = () => {
    if (!activeShoot || !activeShoot.start_time) return { hours: 0, minutes: 0 };
    const start = new Date(activeShoot.start_time || activeShoot.clock_in);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  const elapsed = getElapsedTime();
  const breakDuration = activeShoot?.total_break_duration || 0;

  return (
    <div className="animate-fadeIn mobile-padding pt-6 md:pt-4 pb-8 space-y-8">
      <BreakTimer breakRecord={activeBreak} onEndBreak={handleEndBreak} />
      <StartShootForm
        isOpen={showStartForm}
        onClose={() => setShowStartForm(false)}
        onStart={handleStartShoot}
        shoots={shoots}
        user={user}
      />
      <BreakDialog
        isOpen={showBreakDialog}
        onClose={() => setShowBreakDialog(false)}
        onStartBreak={handleTakeBreak}
        currentBreak={activeBreak}
      />
      <WorkLinksModal
        isOpen={showWorkLinks}
        onClose={() => setShowWorkLinks(false)}
        onSave={handleSaveWorkLinks}
        existingLinks={activeShoot?.upload_links || ''}
        title="Add Work Links"
      />
      <ConfirmDialog
        isOpen={showEndShootConfirm}
        onClose={() => setShowEndShootConfirm(false)}
        onConfirm={completeShoot}
        title="End Shoot with Active Break?"
        message="You're still on break. This will end your break and complete the shoot. Continue?"
        confirmText="End Break & Complete"
        cancelText="Cancel"
        type="warning"
      />
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setShootToCancel(null);
        }}
        onConfirm={confirmCancelShoot}
        title="Cancel Shoot?"
        message={`Are you sure you want to cancel "${shootToCancel?.shoot_name || shootToCancel?.title || 'this shoot'}"? This action cannot be undone.`}
        confirmText="Cancel Shoot"
        cancelText="Keep Shoot"
        type="warning"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setShootToDelete(null);
        }}
        onConfirm={confirmDeleteShoot}
        title="Delete Shoot?"
        message={`Are you sure you want to permanently delete "${shootToDelete?.shoot_name || shootToDelete?.title || 'this shoot'}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Keep"
        type="danger"
      />

      {/* Edit Shoot Modal */}
      {showEditModal && editingShoot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                setEditingShoot(null);
              }
            }}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn overflow-y-auto max-h-[90vh]" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Shoot</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingShoot(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shoot Name *</label>
                <input
                  type="text"
                  value={editingShoot.shoot_name || editingShoot.title || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, shoot_name: e.target.value, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={editingShoot.date || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, date: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={editingShoot.time || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={editingShoot.location_name || editingShoot.location || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, location_name: e.target.value, location: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Studio A / Outdoor Location"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingShoot(null);
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Shoots</h1>
          <p className="text-gray-600">Manage and track photography shoots</p>
        </div>

        <div className="flex gap-3">
          {user?.role === ROLES.PHOTOGRAPHER && !activeShoot && (
            <button
              onClick={() => setShowStartForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-5 h-5" />
              <span>Start New Shoot</span>
            </button>
          )}
          {(user?.role === ROLES.LEAD || user?.role === ROLES.MANAGER || user?.role === ROLES.CONTENT_CREATOR) && (
            <button
              onClick={() => setShowShootAssignment(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-5 h-5" />
              <span>Assign Shoot</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shoot Card (for photographers) */}
      {user?.role === ROLES.PHOTOGRAPHER && activeShoot && (
        <div className={`glass-card p-6 relative overflow-hidden ${activeBreak ? 'border-orange-200' : 'border-primary/20'
          }`}>
          {/* Background Gradient */}
          <div className={`absolute inset-0 opacity-10 pointer-events-none ${activeBreak
              ? 'bg-gradient-to-br from-orange-500 to-yellow-500'
              : 'bg-gradient-to-br from-primary to-blue-600'
            }`} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeBreak ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-primary'}`}>
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {activeBreak ? 'On Break' : 'Active Shoot'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Started at {new Date(activeShoot.start_time || activeShoot.clock_in).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {activeBreak && (
                <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold animate-pulse flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  {activeBreak.break_type}
                </span>
              )}
            </div>

            <div className="mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {activeShoot.shoot?.shoot_name || 'Active Shoot'}
              </h3>
              {activeShoot.shoot && (
                <div className="flex flex-wrap gap-4 text-gray-600">
                  {(() => {
                    const client = clients.find(c => c && c.client_id === activeShoot.shoot.client_id);
                    return client && (
                      <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-lg border border-gray-100">
                        <User className="w-4 h-4" />
                        {client.company_name}
                      </span>
                    );
                  })()}
                  {activeShoot.shoot.location_name && (
                    <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-lg border border-gray-100">
                      <MapPin className="w-4 h-4" />
                      {activeShoot.shoot.location_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Time Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/80 p-4 rounded-xl border border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Time</div>
                <div className="text-2xl font-bold text-gray-900">{elapsed.hours}h {elapsed.minutes}m</div>
              </div>
              <div className="bg-white/80 p-4 rounded-xl border border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Break Time</div>
                <div className="text-2xl font-bold text-orange-600">{formatBreakDuration(breakDuration)}</div>
              </div>
              <div className="bg-white/80 p-4 rounded-xl border border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Work Time</div>
                <div className="text-2xl font-bold text-primary">
                  {Math.floor((elapsed.hours * 60 + elapsed.minutes - breakDuration) / 60)}h
                  {(elapsed.hours * 60 + elapsed.minutes - breakDuration) % 60}m
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {!activeBreak ? (
                <button
                  onClick={() => setShowBreakDialog(true)}
                  className="glass-button bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 flex items-center justify-center gap-2 py-3"
                >
                  <Coffee className="w-5 h-5" />
                  Take Break
                </button>
              ) : (
                <button
                  onClick={handleEndBreak}
                  className="glass-button bg-orange-500 text-white hover:bg-orange-600 border-none flex items-center justify-center gap-2 py-3"
                >
                  <Play className="w-5 h-5" />
                  End Break
                </button>
              )}
              <button
                onClick={() => setShowWorkLinks(true)}
                className="glass-button bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center gap-2 py-3"
              >
                <LinkIcon className="w-5 h-5" />
                {activeShoot.upload_links ? 'Edit Links' : 'Add Links'}
              </button>
              <button
                onClick={handleEndShoot}
                className="glass-button bg-gray-900 text-white hover:bg-black border-none flex items-center justify-center gap-2 py-3"
              >
                <Square className="w-5 h-5" />
                End Shoot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shoots List */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {user?.role === ROLES.PHOTOGRAPHER ? 'My Shoots' : 'All Shoots'}
        </h2>
        <div className="space-y-3">
          {visibleShoots.length > 0 ? (
            visibleShoots
              .sort((a, b) => {
                try {
                  return new Date(a.date || 0) - new Date(b.date || 0);
                } catch {
                  return 0;
                }
              })
              .map((shoot, index) => {
                const client = clients.find(c => c && c.client_id === shoot.client_id);
                const photographer = users.find(u => u && u.email === shoot.photographer_id);
                const shootAttendance = attendance.find(
                  a => a && a.shoot_id === shoot.shoot_id && a.status === 'In Progress'
                );
                const canStart = user?.role === ROLES.PHOTOGRAPHER &&
                  shoot.photographer_id === user?.email &&
                  !shootAttendance &&
                  shoot.status !== SHOOT_STATUS.COMPLETED;

                let dateStr = 'No date';
                try {
                  if (shoot.date) {
                    dateStr = new Date(shoot.date).toLocaleDateString();
                  }
                } catch (e) {
                  console.error('Date error:', e);
                }

                return (
                  <div
                    key={shoot.shoot_id || index}
                    className="p-4 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {shoot.shoot_name || 'Untitled Shoot'}
                          </h3>
                          {shootAttendance && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider animate-pulse">
                              In Progress
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${shoot.status === SHOOT_STATUS.COMPLETED ? 'bg-green-100 text-green-700' :
                              shoot.status === SHOOT_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                                shoot.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                            }`}>
                            {shoot.status || 'Scheduled'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          {client && (
                            <span className="flex items-center gap-1.5 font-medium text-primary">
                              <User className="w-4 h-4" />
                              {client.company_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {dateStr}
                          </span>
                          {shoot.location_name && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {shoot.location_name}
                            </span>
                          )}
                          {photographer && (
                            <span className="flex items-center gap-1.5">
                              <Camera className="w-4 h-4" />
                              {photographer.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {canManageShoot && (
                          <>
                            <button
                              onClick={() => handleEditShoot(shoot)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Shoot"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handlePostponeShoot(shoot)}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Postpone Shoot"
                            >
                              <CalendarIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleCancelShoot(shoot)}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Cancel Shoot"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteShoot(shoot)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Shoot (Permanent)"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {canStart && (
                          <button
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              if (shoot.date === today) {
                                handleStartShoot({ shoot_id: shoot.shoot_id });
                              } else {
                                setSelectedShoot(shoot);
                                setShowStartForm(true);
                              }
                            }}
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <Play className="w-4 h-4" />
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No shoots found</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Shoot Modal */}
      {showShootAssignment && (
        <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 pt-32 md:pt-10">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => setShowShootAssignment(false)}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn overflow-y-auto max-h-[90vh] mt-0 md:mt-0" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Assign Shoot</h3>
              <button
                onClick={() => setShowShootAssignment(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAssignShoot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shoot Name *</label>
                <input
                  type="text"
                  value={newShoot.shoot_name}
                  onChange={(e) => setNewShoot({ ...newShoot, shoot_name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Product Launch Shoot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select
                  value={newShoot.client_id}
                  onChange={(e) => setNewShoot({ ...newShoot, client_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">No client (General shoot)</option>
                  {(Array.isArray(clients) ? clients : []).map(client => (
                    <option key={client?.client_id} value={client?.client_id}>
                      {client?.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Videographer/Lead *</label>
                <select
                  value={newShoot.photographer_id}
                  onChange={(e) => setNewShoot({ ...newShoot, photographer_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select videographer...</option>
                  {availablePhotographers.map(person => (
                    <option key={person.email} value={person.email}>
                      {person.name || person.email} ({person.role === ROLES.LEAD ? 'Lead' : 'Media'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={newShoot.date}
                    onChange={(e) => setNewShoot({ ...newShoot, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={newShoot.time}
                    onChange={(e) => setNewShoot({ ...newShoot, time: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={newShoot.location_name}
                  onChange={(e) => setNewShoot({ ...newShoot, location_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Studio A"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowShootAssignment(false)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingShoot}
                  className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {isCreatingShoot ? 'Assigning...' : 'Assign Shoot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
