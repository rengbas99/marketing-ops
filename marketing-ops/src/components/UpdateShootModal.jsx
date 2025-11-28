import { useState, useEffect } from 'react';
import { X, Save, Calendar, MapPin, User, AlertCircle } from 'lucide-react';
import { SHOOT_STATUS } from '../constants';

export default function UpdateShootModal({ shoot, users, clients, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    shoot_name: '',
    photographer_id: '',
    date: '',
    location_name: '',
    client_id: '',
    status: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (shoot) {
      setFormData({
        shoot_name: shoot.shoot_name || shoot.title || '',
        photographer_id: shoot.photographer_id || shoot.lead_photographer_email || '',
        date: shoot.date || '',
        location_name: shoot.location_name || '',
        client_id: shoot.client_id || '',
        status: shoot.status || SHOOT_STATUS.SCHEDULED,
        notes: shoot.notes || ''
      });
    }
  }, [shoot]);

  const photographers = (Array.isArray(users) ? users : []).filter(u => 
    u && (u.role === 'photographer' || u.role === 'lead')
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.shoot_name.trim()) {
      newErrors.shoot_name = 'Shoot name is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onUpdate({
        ...formData,
        updated_at: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error('Error updating shoot:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 z-[100]" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={onClose} />
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative z-[101] bg-white rounded-2xl" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Update Shoot</h2>
            <p className="text-sm text-gray-500 mt-1">Modify shoot details and assignments</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shoot Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Shoot Name *
            </label>
            <input
              type="text"
              value={formData.shoot_name}
              onChange={(e) => handleChange('shoot_name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.shoot_name ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Enter shoot name"
            />
            {errors.shoot_name && (
              <p className="text-red-500 text-xs mt-1">{errors.shoot_name}</p>
            )}
          </div>

          {/* Date and Photographer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.date ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.date && (
                <p className="text-red-500 text-xs mt-1">{errors.date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Photographer
              </label>
              <select
                value={formData.photographer_id}
                onChange={(e) => handleChange('photographer_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select photographer</option>
                  {photographers.map(photographer => (
                    <option key={photographer?.email} value={photographer?.email}>
                      {photographer?.name || photographer?.email}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Location and Client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={formData.location_name}
                onChange={(e) => handleChange('location_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter location"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => handleChange('client_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select client</option>
                  {(Array.isArray(clients) ? clients : []).map(client => (
                    <option key={client?.client_id} value={client?.client_id}>
                      {client?.company_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.values(SHOOT_STATUS).map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
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
              placeholder="Additional notes or instructions"
            />
          </div>

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
                  Update Shoot
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

