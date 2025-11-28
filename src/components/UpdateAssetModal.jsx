import { useState, useEffect } from 'react';
import { X, Save, FileEdit, User, Calendar, AlertCircle } from 'lucide-react';
import { ASSET_STATUS } from '../constants';

export default function UpdateAssetModal({ asset, users, shoots, clients, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: '',
    assigned_editor_email: '',
    assigned_creator_email: '',
    status: '',
    deadline: '',
    work_progress: '',
    notes: '',
    revision_notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({
        title: asset.title || '',
        assigned_editor_email: asset.assigned_editor_email || '',
        assigned_creator_email: asset.assigned_creator_email || '',
        status: asset.status || ASSET_STATUS.TO_EDIT,
        deadline: asset.deadline ? asset.deadline.split('T')[0] : '',
        work_progress: asset.work_progress || 0,
        notes: asset.notes || '',
        revision_notes: asset.revision_notes || ''
      });
    }
  }, [asset]);

  const editors = (Array.isArray(users) ? users : []).filter(u => u && u.role === 'editor');
  const creators = (Array.isArray(users) ? users : []).filter(u => u && u.role === 'content_creator');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.work_progress < 0 || formData.work_progress > 100) {
      newErrors.work_progress = 'Progress must be between 0 and 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const updateData = {
        ...formData,
        work_progress: parseFloat(formData.work_progress) || 0,
        updated_at: new Date().toISOString()
      };

      // If status changes to Revision, ensure revision_notes exists
      if (updateData.status === ASSET_STATUS.REVISION && !updateData.revision_notes) {
        updateData.revision_notes = 'Revision requested by lead';
      }

      await onUpdate(updateData);
      onClose();
    } catch (err) {
      console.error('Error updating asset:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative z-[10000] bg-white rounded-2xl" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Update Task/Asset</h2>
            <p className="text-sm text-gray-500 mt-1">Modify task details and assignments</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.title ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Assignments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assign Editor
              </label>
              <select
                value={formData.assigned_editor_email}
                onChange={(e) => handleChange('assigned_editor_email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No editor assigned</option>
                {editors.map(editor => (
                  <option key={editor?.email} value={editor?.email}>
                    {editor?.name || editor?.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assign Content Creator
              </label>
              <select
                value={formData.assigned_creator_email}
                onChange={(e) => handleChange('assigned_creator_email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No creator assigned</option>
                {creators.map(creator => (
                  <option key={creator?.email} value={creator?.email}>
                    {creator?.name || creator?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.values(ASSET_STATUS).map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Progress (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.work_progress}
                onChange={(e) => handleChange('work_progress', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.work_progress ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.work_progress && (
                <p className="text-red-500 text-xs mt-1">{errors.work_progress}</p>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Deadline
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => handleChange('deadline', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Task notes or requirements"
            />
          </div>

          {/* Revision Notes (if status is Revision) */}
          {formData.status === ASSET_STATUS.REVISION && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1 text-orange-600" />
                Revision Notes *
              </label>
              <textarea
                value={formData.revision_notes}
                onChange={(e) => handleChange('revision_notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Explain what needs to be revised"
                required
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

