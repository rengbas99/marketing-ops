import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { FileText, Plus, User } from 'lucide-react';
import { ASSET_STATUS } from '../constants';

const AssignTasksPage = () => {
  const { data, loadCollections, addRow } = useData();
  const { success, error } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    deadline: '',
    client_id: '',
  });

  useEffect(() => {
    loadCollections(['USERS', 'CLIENTS', 'ASSETS']);
  }, [loadCollections]);

  const editors = (data.USERS || []).filter(u => u.role === 'editor' || u.role === 'content_creator');
  const clients = data.CLIENTS || [];

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const assignee = editors.find(e => e.email === formData.assignee);
      const taskData = {
        asset_id: `AST-${Date.now()}`,
        title: formData.title,
        description: formData.description || '',
        assigned_editor_email: assignee?.role === 'editor' ? formData.assignee : '',
        assigned_creator_email: assignee?.role === 'content_creator' ? formData.assignee : '',
        status: ASSET_STATUS.TO_EDIT,
        progress: 0,
        deadline: formData.deadline || '',
        client_id: formData.client_id || '',
      };

      await addRow('ASSETS', taskData);
      success('Task assigned successfully!');
      setShowModal(false);
      setFormData({ title: '', description: '', assignee: '', deadline: '', client_id: '' });
    } catch (err) {
      error(err.message || 'Failed to assign task');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Assign Tasks</h1>
          <p className="text-slate-600">Create and assign tasks to team members</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Assignments</h2>
        <div className="space-y-3">
          {(data.ASSETS || [])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10)
            .map((asset) => (
              <div key={asset.asset_id} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{asset.title}</h3>
                    {asset.description && (
                      <p className="text-sm text-slate-600 mb-2">{asset.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      {asset.assigned_editor_email && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Editor
                        </div>
                      )}
                      {asset.assigned_creator_email && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Creator
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${
                    asset.status === ASSET_STATUS.REVIEW ? 'badge-warning' :
                    asset.status === ASSET_STATUS.IN_PROGRESS ? 'badge-info' :
                    'badge-gray'
                  }`}>
                    {asset.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modern-card p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Assign New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Assign To
                </label>
                <select
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                >
                  <option value="">Select assignee</option>
                  {editors.map(editor => (
                    <option key={editor.email} value={editor.email}>
                      {editor.name} ({editor.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Client (optional)
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Select client</option>
                  {clients.map(client => (
                    <option key={client.client_id} value={client.client_id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignTasksPage;

