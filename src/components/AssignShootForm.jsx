import { useState, useEffect } from 'react';
import { Camera, MapPin, Calendar, User, X } from 'lucide-react';
import ModalPortal from './primitives/ModalPortal.jsx';
import Button from './primitives/Button.jsx';
import { COLLECTIONS, SHOOT_STATUS, ROLES } from '../constants';

export default function AssignShootForm({ isOpen, onClose, onAssign, shoots, photographers, clients }) {
  const [formData, setFormData] = useState({
    shoot_name: '',
    photographer_id: '',
    client_id: '',
    date: '',
    location_name: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        shoot_name: '',
        photographer_id: '',
        client_id: '',
        date: '',
        location_name: '',
        notes: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shoot_name || !formData.photographer_id || !formData.date) {
      return;
    }
    await onAssign(formData);
    onClose();
  };

  return (
    <ModalPortal
      id="assign-shoot-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Shoot"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Shoot Name *</label>
          <input
            type="text"
            value={formData.shoot_name}
            onChange={(e) => setFormData({...formData, shoot_name: e.target.value})}
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            placeholder="Enter shoot name"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            Assign to Photographer *
          </label>
          <select
            value={formData.photographer_id}
            onChange={(e) => setFormData({...formData, photographer_id: e.target.value})}
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="">Select photographer...</option>
            {photographers.map(p => (
              <option key={p.email} value={p.email}>
                {p.name || p.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Client (Optional)</label>
          <select
            value={formData.client_id}
            onChange={(e) => setFormData({...formData, client_id: e.target.value})}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="">Select client...</option>
            {clients.map(c => (
              <option key={c.client_id} value={c.client_id}>
                {c.company_name || c.client_id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            Location
          </label>
          <input
            type="text"
            value={formData.location_name}
            onChange={(e) => setFormData({...formData, location_name: e.target.value})}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            placeholder="Office Building, Studio A, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            placeholder="Any special instructions or notes..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Assign Shoot
          </Button>
        </div>
      </form>
    </ModalPortal>
  );
}

