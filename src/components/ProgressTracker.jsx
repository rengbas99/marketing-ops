import { useState } from 'react';
import { TrendingUp, CheckCircle } from 'lucide-react';

export default function ProgressTracker({ currentProgress = 0, onUpdate, assetTitle, readOnly = false }) {
  const [progress, setProgress] = useState(currentProgress);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleProgressChange = (e) => {
    const newProgress = parseInt(e.target.value);
    setProgress(newProgress);
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(progress);
    } finally {
      setIsUpdating(false);
    }
  };

  const getProgressColor = () => {
    if (progress < 25) return '#ef4444'; // red-500
    if (progress < 50) return '#f97316'; // orange-500
    if (progress < 75) return '#eab308'; // yellow-500
    if (progress < 100) return '#3b82f6'; // blue-500
    return '#22c55e'; // green-500
  };

  const getProgressClass = () => {
    if (progress < 25) return 'text-red-500';
    if (progress < 50) return 'text-orange-500';
    if (progress < 75) return 'text-yellow-500';
    if (progress < 100) return 'text-blue-500';
    return 'text-green-500';
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Work Progress</h4>
        </div>
        <span className={`text-lg font-bold ${getProgressClass()}`}>{progress}%</span>
      </div>

      {assetTitle && (
        <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-1">{assetTitle}</p>
      )}

      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={progress}
          onChange={handleProgressChange}
          disabled={readOnly || isUpdating}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{
            background: `linear-gradient(to right, ${getProgressColor()} 0%, ${getProgressColor()} ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2">
          <span>Start</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>Done</span>
        </div>
      </div>

      {!readOnly && onUpdate && (
        <button
          onClick={handleSave}
          disabled={isUpdating || progress === currentProgress}
          className="w-full px-4 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {isUpdating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Updating...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Update Progress
            </>
          )}
        </button>
      )}

      {progress === 100 && (
        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-xs text-green-700 font-bold uppercase tracking-wider">Task completed!</span>
        </div>
      )}
    </div>
  );
}
