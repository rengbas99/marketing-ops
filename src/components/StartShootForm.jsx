import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Camera, MapPin, FileText, X } from 'lucide-react';
import { SHOOT_STATUS } from '../constants';
import OverlayMount from './overlay/OverlayMount.jsx';
import Modal from './primitives/Modal.jsx';
import Button from './primitives/Button.jsx';

export default function StartShootForm({ isOpen, onClose, onStart, shoots, user }) {
  const [selectedShoot, setSelectedShoot] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const overlayId = useId();

  useEffect(() => {
    if (!isOpen) {
      setSelectedShoot('');
      setNotes('');
      setLocation('');
    }
  }, [isOpen]);

  const availableShoots = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return shoots.filter(s => {
      if (!s || !s.photographer_id || s.photographer_id !== user?.email) return false;
      if (s.status !== SHOOT_STATUS.SCHEDULED) return false;
      let shootDate = '';
      if (s.date) {
        try {
          const dateObj = new Date(s.date);
          if (!Number.isNaN(dateObj.getTime())) {
            shootDate = dateObj.toISOString().split('T')[0];
          } else {
            shootDate = s.date.split('T')[0];
          }
        } catch (e) {
          shootDate = s.date.split('T')[0];
        }
      }
      return shootDate === today;
    });
  }, [shoots, user?.email]);

  const renderOverlay = useCallback(({ close }) => {
    const handleClose = () => {
      close();
      onClose?.();
    };

    const handleStart = () => {
      if (!selectedShoot) return;
      onStart({
        shoot_id: selectedShoot,
        notes,
        location_name: location,
      });
      handleClose();
    };

    return (
      <Modal
        title="Start Shoot"
        description="Log notes and confirm your location before beginning the shoot."
        onClose={handleClose}
        size="md"
        footer={(
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={!selectedShoot}>
              Start Shoot
            </Button>
          </div>
        )}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Select Shoot *
            </label>
            <select
              value={selectedShoot}
              onChange={(e) => setSelectedShoot(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow] resize-none"
            />
          </div>
        </div>
      </Modal>
    );
  }, [availableShoots, location, notes, onClose, onStart, selectedShoot]);

  return (
    <OverlayMount
      id={`start-shoot-${overlayId}`}
      isOpen={isOpen}
      type="modal"
      blocking
      priority={20}
      render={renderOverlay}
    />
  );
}
