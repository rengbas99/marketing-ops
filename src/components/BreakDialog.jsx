import { useState } from 'react';
import { X, Coffee, Utensils, AlertCircle } from 'lucide-react';
import { BREAK_TYPES } from '../constants';

export default function BreakDialog({ isOpen, onClose, onStartBreak, onConfirm, currentBreak = null }) {
  const [breakType, setBreakType] = useState(BREAK_TYPES.SHORT_BREAK);
  const [isEnding, setIsEnding] = useState(false);

  if (!isOpen) return null;

  const startHandler = onStartBreak || onConfirm;
  const handleStart = () => {
    if (!startHandler) {
      console.warn('BreakDialog: no start handler provided');
      onClose?.();
      return;
    }
    startHandler(breakType);
    setBreakType(BREAK_TYPES.SHORT_BREAK);
    onClose();
  };

  const handleEnd = () => {
    if (!startHandler) {
      console.warn('BreakDialog: no start handler provided');
      onClose?.();
      return;
    }
    setIsEnding(true);
    startHandler(null); // End break
    setTimeout(() => {
      setIsEnding(false);
      onClose();
    }, 100);
  };

  if (currentBreak) {
    // Show break timer/end dialog
    const breakStart = new Date(currentBreak.break_start);
    const now = new Date();
    const elapsed = Math.floor((now - breakStart) / 1000 / 60); // minutes

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="fixed inset-0 transition-opacity z-[100]" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={onClose} />
        <div className="glass-card w-full max-w-md p-6 relative z-[101] animate-fadeIn bg-white rounded-2xl" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shadow-inner">
                <Coffee className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">On Break</h3>
                <p className="text-sm text-gray-600 font-medium capitalize">{currentBreak.break_type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
            <div className="text-5xl font-bold text-orange-600 mb-2 font-mono tracking-tight">
              {elapsed} <span className="text-2xl text-orange-400">min</span>
            </div>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Break Duration</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Keep Timer Open
            </button>
            <button
              onClick={handleEnd}
              className="flex-1 px-4 py-3 text-white bg-green-600 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
            >
              End Break
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 transition-opacity z-[100]" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={onClose} />
      <div className="glass-card w-full max-w-md p-6 relative z-[101] animate-fadeIn bg-white rounded-2xl" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div className="flex items-start justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Take Break</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Select break type</p>

        <div className="space-y-3 mb-8">
          <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${breakType === BREAK_TYPES.LUNCH
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
            }`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${breakType === BREAK_TYPES.LUNCH ? 'border-primary' : 'border-gray-300'
              }`}>
              {breakType === BREAK_TYPES.LUNCH && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <input
              type="radio"
              name="breakType"
              value={BREAK_TYPES.LUNCH}
              checked={breakType === BREAK_TYPES.LUNCH}
              onChange={(e) => setBreakType(e.target.value)}
              className="hidden"
            />
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900">Lunch</div>
              <div className="text-xs text-gray-500 font-medium">30-60 minutes</div>
            </div>
          </label>

          <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${breakType === BREAK_TYPES.SHORT_BREAK
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
            }`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${breakType === BREAK_TYPES.SHORT_BREAK ? 'border-primary' : 'border-gray-300'
              }`}>
              {breakType === BREAK_TYPES.SHORT_BREAK && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <input
              type="radio"
              name="breakType"
              value={BREAK_TYPES.SHORT_BREAK}
              checked={breakType === BREAK_TYPES.SHORT_BREAK}
              onChange={(e) => setBreakType(e.target.value)}
              className="hidden"
            />
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Coffee className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900">Short Break</div>
              <div className="text-xs text-gray-500 font-medium">5-15 minutes</div>
            </div>
          </label>

          <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${breakType === BREAK_TYPES.EMERGENCY
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
            }`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${breakType === BREAK_TYPES.EMERGENCY ? 'border-primary' : 'border-gray-300'
              }`}>
              {breakType === BREAK_TYPES.EMERGENCY && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <input
              type="radio"
              name="breakType"
              value={BREAK_TYPES.EMERGENCY}
              checked={breakType === BREAK_TYPES.EMERGENCY}
              onChange={(e) => setBreakType(e.target.value)}
              className="hidden"
            />
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900">Emergency</div>
              <div className="text-xs text-gray-500 font-medium">Unplanned break</div>
            </div>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30"
          >
            Start Break
          </button>
        </div>
      </div>
    </div>
  );
}
