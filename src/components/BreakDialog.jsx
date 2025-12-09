import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Coffee, Utensils, AlertCircle } from 'lucide-react';
import { BREAK_TYPES } from '../constants';
import OverlayMount from './overlay/OverlayMount.jsx';
import Modal from './primitives/Modal.jsx';
import Button from './primitives/Button.jsx';

const BREAK_OPTIONS = [
  {
    value: BREAK_TYPES.LUNCH,
    title: 'Lunch',
    subtitle: '30-60 minutes',
    icon: Utensils,
    toneClass: 'bg-orange-100 text-orange-600',
  },
  {
    value: BREAK_TYPES.SHORT_BREAK,
    title: 'Short Break',
    subtitle: '5-15 minutes',
    icon: Coffee,
    toneClass: 'bg-blue-100 text-blue-600',
  },
  {
    value: BREAK_TYPES.EMERGENCY,
    title: 'Emergency',
    subtitle: 'Unplanned break',
    icon: AlertCircle,
    toneClass: 'bg-red-100 text-red-600',
  },
];

export default function BreakDialog({ isOpen, onClose, onStartBreak, onConfirm, currentBreak = null }) {
  const [breakType, setBreakType] = useState(BREAK_TYPES.SHORT_BREAK);
  const overlayId = useId();
  const startHandler = onStartBreak || onConfirm;

  useEffect(() => {
    if (!isOpen) {
      setBreakType(BREAK_TYPES.SHORT_BREAK);
    }
  }, [isOpen]);

  const elapsedMinutes = useMemo(() => {
    if (!currentBreak) return 0;
    const breakStart = new Date(currentBreak.break_start);
    const now = new Date();
    return Math.max(0, Math.floor((now - breakStart) / 1000 / 60));
  }, [currentBreak]);

  const renderOverlay = useCallback(({ close }) => {
    const handleClose = () => {
      close();
      onClose?.();
    };

    const handleStart = () => {
      if (!startHandler) {
        console.warn('BreakDialog: no start handler provided');
        handleClose();
        return;
      }
      startHandler(breakType);
      handleClose();
    };

    const handleEnd = () => {
      if (!startHandler) {
        console.warn('BreakDialog: no start handler provided');
        handleClose();
        return;
      }
      startHandler(null);
      handleClose();
    };

    if (currentBreak) {
      return (
        <Modal
          title="On Break"
          description={`Currently on ${currentBreak.break_type.replace('-', ' ')}`}
          onClose={handleClose}
          size="sm"
          footer={(
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={handleClose}>
                Keep Timer Open
              </Button>
              <Button variant="primary" onClick={handleEnd}>
                End Break
              </Button>
            </div>
          )}
        >
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
            <div className="text-5xl font-bold text-orange-600 mb-2 font-mono tracking-tight">
              {elapsedMinutes}{' '}
              <span className="text-2xl text-orange-400">min</span>
            </div>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Break Duration</p>
          </div>
        </Modal>
      );
    }

    return (
      <Modal
        title="Take Break"
        description="Choose the break type that best represents what you're about to do."
        onClose={handleClose}
        size="md"
        footer={(
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleStart}>
              Start Break
            </Button>
          </div>
        )}
      >
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Select break type</p>
        <div className="space-y-3">
          {BREAK_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = breakType === option.value;
            return (
              <label
                key={option.value}
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-[transform,opacity,colors,shadow] ${
                  isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-primary' : 'border-gray-300'}`}>
                  {isActive && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <input
                  type="radio"
                  name="breakType"
                  value={option.value}
                  checked={isActive}
                  onChange={(e) => setBreakType(e.target.value)}
                  className="hidden"
                />
                <div className={`p-2 rounded-lg ${option.toneClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">{option.title}</div>
                  <div className="text-xs text-gray-500 font-medium">{option.subtitle}</div>
                </div>
              </label>
            );
          })}
        </div>
      </Modal>
    );
  }, [breakType, currentBreak, elapsedMinutes, onClose, startHandler]);

  return (
    <OverlayMount
      id={`break-dialog-${overlayId}`}
      isOpen={isOpen}
      type="modal"
      blocking
      priority={20}
      render={renderOverlay}
    />
  );
}
