import { useState } from 'react';
import { X, Camera, MapPin, FileText } from 'lucide-react';
import { SHOOT_STATUS } from '../constants';

export default function StartShootForm({ isOpen, onClose, onStart, shoots, user }) {
  const [selectedShoot, setSelectedShoot] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');

  if (!isOpen) return null;

  // Filter shoots for today that are scheduled
  const today = new Date().toISOString().split('T')[0];
  const availableShoots = shoots.filter(s => {
    if (!s || !s.photographer_id || s.photographer_id !== user?.email) return false;
    if (s.status !== SHOOT_STATUS.SCHEDULED) return false;
    
    // Handle date comparison - normalize dates to YYYY-MM-DD format
    let shootDate = '';
    if (s.date) {
      try {
        const dateObj = new Date(s.date);
        if (!isNaN(dateObj.getTime())) {
          shootDate = dateObj.toISOString().split('T')[0];
        } else {
          shootDate = s.date.split('T')[0]; // Handle if already in ISO format
        }
      } catch (e) {
        shootDate = s.date.split('T')[0]; // Fallback
      }
    }
    
    return shootDate === today;
  });

  const handleStart = () => {
    if (!selectedShoot) {
      alert('Please select a shoot');
      return;
    }
    onStart({
      shoot_id: selectedShoot,
      notes,
      location_name: location,
    });
    setSelectedShoot('');
    setNotes('');
    setLocation('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 transition-opacity" onClick={onClose} style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} />
      <div className="glass-card w-full max-w-md p-6 relative z-10 animate-fadeIn bg-white rounded-2xl" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Start Shoot</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Select Shoot *
            </label>
            <select
              value={selectedShoot}
              onChange={(e) => setSelectedShoot(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            >
              <option value="">Choose a shoot...</option>
              {availableShoots.length > 0 ? (
                availableShoots.map(shoot => (
                  <option key={shoot.shoot_id} value={shoot.shoot_id}>
                    {shoot.shoot_name} - {shoot.location_name || 'Location TBD'}
                  </option>
                ))
              ) : (
                <option value="" disabled>No scheduled shoots for today</option>
              )}
            </select>
            {availableShoots.length === 0 && (
              <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                <X className="w-3 h-3" /> No shoots scheduled for today
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office Building, Studio A, etc."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-2 ml-1 font-medium">GPS will be captured automatically</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Meeting client at office... Any special instructions..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!selectedShoot}
            className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            Start Shoot
          </button>
        </div>
      </div>
    </div>
  );
}
