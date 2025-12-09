import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/primitives/Card.jsx';
import { ArrowLeft, Calendar, CheckCircle, XCircle, FileText, User, Filter } from 'lucide-react';
import { COLLECTIONS, ASSET_STATUS, ROLES } from '../constants';

export default function EditorTaskHistoryPage() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling } = useData();
  const { user } = useAuth();
  const [selectedEditor, setSelectedEditor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (startPolling && stopPolling) {
      startPolling('editor-task-history', [
        COLLECTIONS.ASSETS,
        COLLECTIONS.USERS,
        COLLECTIONS.SHOOTS,
        COLLECTIONS.CLIENTS
      ]);

      return () => stopPolling('editor-task-history');
    }
  }, [startPolling, stopPolling]);

  // Auto-filter by current user's email if they're an editor
  useEffect(() => {
    if (user?.role === ROLES.EDITOR && user?.email && !selectedEditor) {
      setSelectedEditor(user.email);
    }
  }, [user, selectedEditor]);

  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  // Filter completed/approved/cancelled tasks
  const completedTasks = useMemo(() => {
    return assets.filter(a => 
      a && (
        a.status === ASSET_STATUS.COMPLETED ||
        a.status === ASSET_STATUS.FINAL ||
        a.status === 'Published' ||
        a.status === ASSET_STATUS.CANCELLED
      )
    );
  }, [assets]);

  // Filter by editor and status
  const filteredTasks = useMemo(() => {
    let filtered = completedTasks;

    if (selectedEditor) {
      filtered = filtered.filter(a => 
        a.assigned_editor_email === selectedEditor || 
        a.assigned_creator_email === selectedEditor
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }

    // Sort by date
    filtered = [...filtered].sort((a, b) => {
      const dateA = a.updated_at || a.created_at || a.deadline || '';
      const dateB = b.updated_at || b.created_at || b.deadline || '';
      
      if (sortBy === 'newest') {
        return new Date(dateB) - new Date(dateA);
      } else {
        return new Date(dateA) - new Date(dateB);
      }
    });

    return filtered;
  }, [completedTasks, selectedEditor, selectedStatus, sortBy]);

  const editors = useMemo(() => {
    const editorEmails = new Set();
    completedTasks.forEach(a => {
      if (a.assigned_editor_email) editorEmails.add(a.assigned_editor_email);
      if (a.assigned_creator_email) editorEmails.add(a.assigned_creator_email);
    });
    return users.filter(u => u && editorEmails.has(u.email));
  }, [completedTasks, users]);

  const getStatusColor = (status) => {
    if (status === ASSET_STATUS.COMPLETED || status === ASSET_STATUS.FINAL) {
      return 'bg-green-100 text-green-700';
    }
    if (status === 'Published') {
      return 'bg-blue-100 text-blue-700';
    }
    if (status === ASSET_STATUS.CANCELLED) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    if (status === ASSET_STATUS.COMPLETED || status === ASSET_STATUS.FINAL || status === 'Published') {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (status === ASSET_STATUS.CANCELLED) {
      return <XCircle className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  if (loading.all) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Editor Task History</h1>
              <p className="text-gray-600">View completed, approved, and cancelled tasks</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card glass className="p-4 mb-6 flex flex-wrap gap-4">
          {user?.role !== ROLES.EDITOR && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Editor</label>
              <select
                value={selectedEditor}
                onChange={(e) => setSelectedEditor(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">All Editors</option>
                {editors.map(editor => (
                  <option key={editor.email} value={editor.email}>
                    {editor.name || editor.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">All Statuses</option>
              <option value={ASSET_STATUS.COMPLETED}>Completed</option>
              <option value={ASSET_STATUS.FINAL}>Final/Approved</option>
              <option value="Published">Published</option>
              <option value={ASSET_STATUS.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-bold text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card glass className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No tasks found</h3>
              <p className="text-gray-500">Try adjusting your filters</p>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const editor = users.find(u => 
                u && (u.email === task.assigned_editor_email || u.email === task.assigned_creator_email)
              );
              const shoot = task.shoot_id ? shoots.find(s => s && s.shoot_id === task.shoot_id) : null;
              const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;

              let dateStr = '';
              try {
                const date = new Date(task.updated_at || task.created_at || task.deadline || '');
                if (!isNaN(date.getTime())) {
                  dateStr = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }
              } catch (e) {
                console.error('Date error:', e);
              }

              return (
                <Card
                  glass
                  key={task.asset_id}
                  className="p-6 hover:shadow-lg transition-[transform,opacity,colors,shadow]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{task.title || 'Untitled Task'}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        {editor && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{editor.name || editor.email}</span>
                          </div>
                        )}
                        {dateStr && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{dateStr}</span>
                          </div>
                        )}
                        {client && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{client.company_name}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className="flex items-center gap-2">
                            <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {task.revision_notes && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <span className="font-bold">Revision Notes:</span> {task.revision_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

