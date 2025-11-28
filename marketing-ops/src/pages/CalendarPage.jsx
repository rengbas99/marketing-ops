import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { Calendar, Clock, Plus, Edit2, X, Check, FileText, Filter, Eye, AlertCircle, CheckCircle, Users, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { COLLECTIONS, ROLES, ASSET_STATUS } from '../constants';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [selectedClient, setSelectedClient] = useState('');
  const [calendarView, setCalendarView] = useState('list');
  const [newEntry, setNewEntry] = useState({
    asset_id: '',
    publish_date: '',
    publish_time: '',
    channel: '',
    status: 'scheduled',
    notes: '',
    client_id: '',
  });

  useEffect(() => {
    startPolling('calendar-page', [
      COLLECTIONS.CONTENT_CALENDAR,
      COLLECTIONS.ASSETS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.USERS
    ]);
    return () => stopPolling('calendar-page');
  }, [startPolling, stopPolling]);

  const handleAddEntry = async (e) => {
    e.preventDefault();

    if (!newEntry.asset_id || !newEntry.publish_date || !newEntry.channel) {
      warning('Please fill in all required fields (Deliverable, Publish Date, and Channel)');
      return;
    }

    try {
      const existingEntry = calendar.find(c =>
        c && c.asset_id === newEntry.asset_id &&
        c.publish_date === newEntry.publish_date &&
        c.channel === newEntry.channel &&
        c.status !== 'deleted'
      );

      if (existingEntry) {
        warning('A calendar entry for this asset, date, and channel already exists');
        return;
      }

      const result = await addRow(COLLECTIONS.CONTENT_CALENDAR, {
        ...newEntry,
        calendar_id: `CAL-${Date.now()}`,
        created_at: new Date().toISOString(),
      });

      if (result.success) {
        setShowAddForm(false);
        setNewEntry({
          asset_id: '',
          publish_date: '',
          publish_time: '',
          channel: '',
          status: 'scheduled',
          notes: '',
        });

        await forceRefresh([COLLECTIONS.CONTENT_CALENDAR]);
        success('Calendar entry added successfully!');
      } else {
        error('Error adding entry: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding calendar entry:', err);
      error('Error adding entry: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUpdateEntry = async (entry) => {
    try {
      const index = calendar.findIndex(c => c && c.calendar_id === entry.calendar_id);
      if (index !== -1) {
        await updateRow(COLLECTIONS.CONTENT_CALENDAR, index + 2, {
          ...calendar[index],
          ...entry,
          updated_at: new Date().toISOString(),
        });

        await forceRefresh([COLLECTIONS.CONTENT_CALENDAR]);
        setEditingEntry(null);
        success('Calendar entry updated!');
      }
    } catch (err) {
      error('Error updating entry: ' + err.message);
    }
  };

  const handleQuickStatusUpdate = async (entry, newStatus) => {
    try {
      const index = calendar.findIndex(c => c && c.calendar_id === entry.calendar_id);
      if (index !== -1) {
        await updateRow(COLLECTIONS.CONTENT_CALENDAR, index + 2, {
          ...calendar[index],
          status: newStatus,
          updated_at: new Date().toISOString(),
        });

        await forceRefresh([COLLECTIONS.CONTENT_CALENDAR]);
        setShowStatusUpdate(null);
        success(`Status updated to ${newStatus}!`);
      }
    } catch (err) {
      error('Error updating status: ' + err.message);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      const index = calendar.findIndex(c => c && c.calendar_id === entryId);
      if (index !== -1) {
        await updateRow(COLLECTIONS.CONTENT_CALENDAR, index + 2, {
          ...calendar[index],
          status: 'deleted',
        });

        await forceRefresh([COLLECTIONS.CONTENT_CALENDAR]);
        success('Calendar entry deleted!');
      }
    } catch (err) {
      error('Error deleting entry: ' + err.message);
    }
  };

  const calendar = Array.isArray(data.Content_Calendar) ? data.Content_Calendar : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  const activeCalendar = calendar.filter(entry => entry && entry.status !== 'deleted');

  const isManager = user?.role === ROLES.MANAGER;
  const isLead = user?.role === ROLES.LEAD;
  const isContentCreator = user?.role === ROLES.CONTENT_CREATOR;
  const isEditor = user?.role === ROLES.EDITOR;
  const canAddEntry = isManager || isLead || isContentCreator;

  let filteredCalendar = activeCalendar;
  if (viewMode === 'client' && selectedClient) {
    filteredCalendar = activeCalendar.filter(entry => {
      const asset = assets.find(a => a && a.asset_id === entry.asset_id);
      const shoot = asset ? shoots.find(s => s && s.shoot_id === asset.shoot_id) : null;
      return shoot && shoot.client_id === selectedClient;
    });
  } else if (viewMode === 'personal') {
    const personalCalendarEntries = activeCalendar.filter(entry => {
      const asset = assets.find(a => a && a.asset_id === entry.asset_id);
      return asset && (asset.assigned_editor_email === user?.email || asset.assigned_creator_email === user?.email);
    });

    const assignedAssets = assets.filter(
      a => a && (a.assigned_editor_email === user?.email || a.assigned_creator_email === user?.email) && a.deadline
    );

    const taskEntries = assignedAssets
      .filter(asset => {
        if (!asset.deadline) return false;
        const alreadyInCalendar = activeCalendar.some(entry => entry.asset_id === asset.asset_id);
        return !alreadyInCalendar;
      })
      .map(asset => {
        const shoot = shoots.find(s => s && s.shoot_id === asset.shoot_id);
        const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
        return {
          calendar_id: `TASK-${asset.asset_id}`,
          asset_id: asset.asset_id,
          publish_date: asset.deadline,
          publish_time: '',
          channel: 'Task',
          status: asset.status === ASSET_STATUS.COMPLETED || asset.status === 'Final' ? 'completed' : 'scheduled',
          notes: `Task deadline for ${asset.title}`,
          isTask: true,
          asset,
          shoot,
          client,
        };
      });

    filteredCalendar = [...personalCalendarEntries, ...taskEntries];
  }

  const calendarEvents = filteredCalendar
    .map(entry => {
      if (!entry || !entry.publish_date) return null;

      try {
        const asset = entry.asset || assets.find(a => a && a.asset_id === entry.asset_id);
        const shoot = entry.shoot || (asset ? shoots.find(s => s && s.shoot_id === asset.shoot_id) : null);
        const client = entry.client || (shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null);

        const publishDate = new Date(entry.publish_date);
        if (isNaN(publishDate.getTime())) return null;

        const isCompleted = asset?.status === ASSET_STATUS.COMPLETED || asset?.status === 'Final';
        const deadline = asset?.deadline ? new Date(asset.deadline) : null;
        const isOverdue = deadline && !isCompleted && deadline < new Date();

        return {
          ...entry,
          asset: asset || entry.asset,
          shoot: shoot || entry.shoot,
          client: client || entry.client,
          title: asset?.title || entry.title || 'Content',
          start: publishDate,
          end: publishDate,
          allDay: true,
          isCompleted,
          deadline,
          isOverdue,
        };
      } catch (e) {
        console.error('Error parsing calendar entry:', e);
        return null;
      }
    })
    .filter(e => e && e.start) || [];

  const eventsByDate = calendarEvents.reduce((acc, event) => {
    if (!event || !event.start) return acc;
    try {
      const dateKey = event.start.toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
    } catch (e) {
      console.error('Error grouping event:', e);
    }
    return acc;
  }, {});

  const next30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const availableAssets = assets.filter(a => a && a.title && a.asset_id);

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDeleteEntry(deleteConfirm)}
        title="Delete Calendar Entry"
        message="Are you sure you want to delete this calendar entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Quick Status Update Modal */}
      {showStatusUpdate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => setShowStatusUpdate(null)}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Update Status</h3>
              <button
                onClick={() => setShowStatusUpdate(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="font-bold text-gray-900 mb-1">{showStatusUpdate.title || 'Content'}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Current: <span className="font-bold text-primary">{showStatusUpdate.status || 'Scheduled'}</span>
              </p>
            </div>

            <div className="space-y-3 mb-8">
              <button
                onClick={() => handleQuickStatusUpdate(showStatusUpdate, 'published')}
                className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Mark as Published
              </button>
              <button
                onClick={() => handleQuickStatusUpdate(showStatusUpdate, 'scheduled')}
                className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                Mark as Scheduled
              </button>
              <button
                onClick={() => handleQuickStatusUpdate(showStatusUpdate, 'postponed')}
                className="w-full px-4 py-3 bg-orange-50 text-orange-700 rounded-xl font-bold hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Mark as Postponed
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusUpdate(null);
                  setEditingEntry(showStatusUpdate);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Edit Details
              </button>
              {!showStatusUpdate.isTask && (
                <button
                  onClick={() => {
                    setDeleteConfirm(showStatusUpdate.calendar_id);
                    setShowStatusUpdate(null);
                  }}
                  className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => setSelectedEntry(null)}
          />
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative z-10 animate-fadeIn overflow-y-auto max-h-[90vh]" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Asset Details</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${selectedEntry.isCompleted
                  ? 'bg-green-50 border-green-100 text-green-800'
                  : selectedEntry.isOverdue
                    ? 'bg-red-50 border-red-100 text-red-800'
                    : 'bg-yellow-50 border-yellow-100 text-yellow-800'
                }`}>
                {selectedEntry.isCompleted ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                <div>
                  <p className="font-bold text-lg">
                    {selectedEntry.isCompleted ? 'Asset Completed' : selectedEntry.isOverdue ? 'Overdue' : 'In Progress'}
                  </p>
                  <p className="text-sm opacity-80">
                    {selectedEntry.isCompleted
                      ? 'This asset has been finalized.'
                      : selectedEntry.isOverdue
                        ? 'This asset is past its deadline.'
                        : 'This asset is currently being worked on.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Title</label>
                  <p className="text-lg font-bold text-gray-900">{selectedEntry.asset?.title || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${selectedEntry.asset?.status === ASSET_STATUS.REVIEW ? 'bg-purple-100 text-purple-700' :
                      selectedEntry.asset?.status === ASSET_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                    {selectedEntry.asset?.status || 'In Progress'}
                  </span>
                </div>
                {selectedEntry.client && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client</label>
                    <p className="font-medium text-primary">{selectedEntry.client.company_name}</p>
                  </div>
                )}
                {selectedEntry.asset?.deadline && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Deadline</label>
                    <p className={`font-medium ${selectedEntry.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(selectedEntry.asset.deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedEntry.asset?.upload_folder_link && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Work Files</label>
                  <a
                    href={selectedEntry.asset.upload_folder_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium inline-flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Open File Folder
                  </a>
                </div>
              )}

              {selectedEntry.asset?.work_progress !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-bold text-gray-700">Progress</span>
                    <span className="font-bold text-primary">{selectedEntry.asset.work_progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedEntry.asset.work_progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Publish Date</label>
                    <p className="font-bold text-gray-900 mt-1">{selectedEntry.date.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Channel</label>
                    <p className="font-bold text-gray-900 mt-1">{selectedEntry.channel || 'N/A'}</p>
                  </div>
                </div>
                {selectedEntry.notes && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</label>
                    <p className="text-gray-600 mt-1 italic bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      {selectedEntry.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Content Calendar</h1>
          <p className="text-gray-600">Upcoming publishing schedule and deliverables</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Calendar/List View Toggle */}
          <div className="glass-panel p-1 flex gap-1">
            <button
              onClick={() => setCalendarView('list')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${calendarView === 'list' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setCalendarView('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${calendarView === 'calendar' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              <Grid className="w-4 h-4" />
              Calendar
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="glass-panel p-1 flex gap-1">
            <button
              onClick={() => {
                setViewMode('all');
                setSelectedClient('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'all' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              All
            </button>
            {(isEditor || isContentCreator) && (
              <button
                onClick={() => setViewMode('personal')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'personal' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                My Tasks
              </button>
            )}
            <button
              onClick={() => setViewMode('client')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'client' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              By Client
            </button>
          </div>

          {/* Client Filter */}
          {viewMode === 'client' && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.client_id} value={client.client_id}>
                  {client.company_name}
                </option>
              ))}
            </select>
          )}

          {canAddEntry && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-5 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Calendar Entry Form */}
      {canAddEntry && showAddForm && (
        <div className="glass-card p-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Add Calendar Entry</h2>
          <form onSubmit={handleAddEntry} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deliverable (Asset) *</label>
                <select
                  required
                  value={newEntry.asset_id}
                  onChange={(e) => setNewEntry({ ...newEntry, asset_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Asset/Deliverable</option>
                  {availableAssets.length > 0 ? (
                    availableAssets.map(asset => {
                      const shoot = shoots.find(s => s && s.shoot_id === asset.shoot_id);
                      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                      return (
                        <option key={asset.asset_id} value={asset.asset_id}>
                          {asset.title || 'Untitled Asset'} {client ? `(${client.company_name})` : ''} - {asset.status || 'N/A'}
                        </option>
                      );
                    })
                  ) : (
                    <option value="" disabled>No assets available. Create assets first.</option>
                  )}
                </select>
                {availableAssets.length === 0 && (
                  <p className="text-xs text-red-500 mt-2 font-medium">No assets found. Assets need to be created first.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date *</label>
                <input
                  type="date"
                  required
                  value={newEntry.publish_date}
                  onChange={(e) => setNewEntry({ ...newEntry, publish_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Publish Time</label>
                <input
                  type="time"
                  value={newEntry.publish_time}
                  onChange={(e) => setNewEntry({ ...newEntry, publish_time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channel *</label>
                <select
                  required
                  value={newEntry.channel}
                  onChange={(e) => setNewEntry({ ...newEntry, channel: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Channel</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter">Twitter</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Website">Website</option>
                  <option value="Email">Email</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={newEntry.status}
                onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="postponed">Postponed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Additional notes or instructions..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Add Entry
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar View */}
      {calendarView === 'calendar' && (
        <div className="glass-card p-6">
          <div className="h-[700px]">
            <BigCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month', 'week', 'day']}
              onSelectEvent={(event) => {
                if (canEditDelete) {
                  setShowStatusUpdate(event);
                } else {
                  setSelectedEntry(event);
                }
              }}
              eventPropGetter={(event) => {
                let backgroundColor = '#3B82F6';
                if (event.status === 'published' || event.isCompleted) backgroundColor = '#10B981';
                if (event.status === 'postponed') backgroundColor = '#F59E0B';
                if (event.isOverdue) backgroundColor = '#EF4444';

                return {
                  style: {
                    backgroundColor,
                    borderRadius: '8px',
                    opacity: 0.9,
                    color: 'white',
                    border: 'none',
                    display: 'block',
                    padding: '4px 8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }
                };
              }}
            />
          </div>
        </div>
      )}

      {/* List View */}
      {calendarView === 'list' && (
        <div className="space-y-8">
          {next30Days.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const events = eventsByDate[dateKey];

            if (!events) return null;

            return (
              <div key={dateKey} className="glass-card p-0 overflow-hidden">
                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <span className="text-xs font-bold bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-500">
                    {events.length} item{events.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {events.map((event, idx) => (
                    <div
                      key={event.calendar_id || idx}
                      className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-gray-900 text-lg">{event.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${event.status === 'published' ? 'bg-green-100 text-green-700' :
                              event.status === 'postponed' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                            {event.status || 'Scheduled'}
                          </span>
                          {event.isOverdue && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          {event.client && (
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <Users className="w-4 h-4" />
                              {event.client.company_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.publish_time || 'No time set'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Filter className="w-4 h-4" />
                            {event.channel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedEntry(event)}
                          className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {canEditDelete && (
                          <>
                            <button
                              onClick={() => setShowStatusUpdate(event)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Update Status"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            {!event.isTask && (
                              <button
                                onClick={() => setDeleteConfirm(event.calendar_id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {Object.keys(eventsByDate).length === 0 && (
            <div className="text-center py-12 text-gray-500 glass-card">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No upcoming content scheduled for the next 30 days</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
