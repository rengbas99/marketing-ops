import { useEffect, useState } from 'react';
import { Coffee, Clock } from 'lucide-react';

export default function BreakTimer({ breakRecord, onEndBreak }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!breakRecord || !breakRecord.break_start) return;

    const updateElapsed = () => {
      const start = new Date(breakRecord.break_start);
      const now = new Date();
      const minutes = Math.floor((now - start) / 1000 / 60);
      setElapsed(minutes);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [breakRecord]);

  if (!breakRecord) return null;

  return (
    <div className="fixed top-4 right-4 z-40 bg-orange-500 text-white rounded-2xl shadow-2xl p-5 max-w-xs animate-slideIn backdrop-blur-md bg-opacity-90 border border-white/20">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Coffee className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm tracking-wider">ON BREAK</div>
          <div className="text-xs opacity-90 font-medium capitalize">{breakRecord.break_type}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono">{elapsed}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">min</div>
        </div>
      </div>
      <button
        onClick={onEndBreak}
        className="w-full bg-white text-orange-600 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2"
      >
        <Clock className="w-4 h-4" />
        End Break
      </button>
    </div>
  );
}
