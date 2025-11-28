import { useState, useEffect } from 'react';
import { Play, Square, Clock, Pause, ArrowLeft } from 'lucide-react';

const QUICK_SUBTASKS = [
    'Background Design',
    'Text Overlay',
    'Color Correction',
    'Image Retouching',
    'Layout Design',
    'Typography',
    'Final Touches',
    'Export/Render',
    'Review & QC'
];

export default function EditorSubtaskWidget({ asset, timeLog, onUpdateTimeLog, onPause, onBack }) {
    const [currentSubtask, setCurrentSubtask] = useState(null);
    const [newSubtask, setNewSubtask] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Load current subtask from time log
    useEffect(() => {
        if (timeLog && timeLog.current_subtask) {
            setCurrentSubtask({
                name: timeLog.current_subtask,
                start_time: timeLog.subtask_start_time || new Date().toISOString()
            });
        } else {
            setCurrentSubtask(null);
        }
    }, [timeLog]);

    // Update elapsed time (only when not paused)
    useEffect(() => {
        if (!currentSubtask || isPaused) {
            if (!currentSubtask) {
                setElapsedTime(0);
            }
            return;
        }

        const interval = setInterval(() => {
            const start = new Date(currentSubtask.start_time);
            const now = new Date();
            const diff = Math.floor((now - start) / 1000); // seconds
            setElapsedTime(diff);
        }, 1000);

        return () => clearInterval(interval);
    }, [currentSubtask, isPaused]);

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartSubtask = async (subtaskName) => {
        const name = subtaskName || newSubtask;
        if (!name) return;

        setCurrentSubtask({
            name,
            start_time: new Date().toISOString()
        });

        await onUpdateTimeLog({
            current_subtask: name,
            subtask_start_time: new Date().toISOString()
        });

        setNewSubtask('');
        setShowInput(false);
        
        // Auto-close input and return to initial state after starting
        // The widget will now show the active subtask display
    };

    const handleEndSubtask = async () => {
        if (!currentSubtask) return;

        const duration = elapsedTime / 60; // minutes

        await onUpdateTimeLog({
            current_subtask: null,
            subtask_start_time: null,
            last_subtask: currentSubtask.name,
            last_subtask_duration: duration.toFixed(2)
        });

        setCurrentSubtask(null);
        setElapsedTime(0);
        setIsPaused(false);
    };

    const handlePause = async () => {
        if (!currentSubtask) return;
        
        setIsPaused(true);
        // Pause creates a break automatically
        if (onPause) {
            await onPause();
        }
    };

    const handleResume = async () => {
        if (!currentSubtask) return;
        
        setIsPaused(false);
        // Resume ends the break
        if (onPause) {
            await onPause(); // Toggle break
        }
    };

    return (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg shadow-gray-200/50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Current Work
                </h3>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        title="Back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Instructions */}
            {!currentSubtask && !showInput && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-bold mb-1">How to use Subtasks:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Click "Start New Subtask" to create a custom task</li>
                        <li>Or select from quick options below</li>
                        <li>Click "Start" to begin tracking time</li>
                        <li>Click "Complete" when finished to save duration</li>
                    </ul>
                </div>
            )}

            {currentSubtask ? (
                <div className="space-y-4">
                    <div className={`border rounded-lg p-4 ${isPaused ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                        <p className="text-sm text-gray-600 mb-1">Working on:</p>
                        <p className="text-gray-900 font-medium mb-2">{currentSubtask.name}</p>
                        <p className="text-sm text-gray-600 mb-1">Asset:</p>
                        <p className="text-gray-900 text-sm mb-3">{asset.title}</p>
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-2xl font-mono text-blue-600">
                                {formatTime(elapsedTime)}
                            </div>
                            {isPaused && (
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                    Paused
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {!isPaused ? (
                                <button
                                    onClick={handlePause}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-yellow-700 transition-colors"
                                >
                                    <Pause className="w-4 h-4" />
                                    Pause
                                </button>
                            ) : (
                                <button
                                    onClick={handleResume}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 transition-colors"
                                >
                                    <Play className="w-4 h-4" />
                                    Resume
                                </button>
                            )}
                            <button
                                onClick={handleEndSubtask}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 transition-colors"
                            >
                                <Square className="w-4 h-4" />
                                Complete
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {!showInput ? (
                        <>
                            <button
                                onClick={() => setShowInput(true)}
                                className="w-full bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                Start New Subtask
                            </button>

                            <div className="space-y-2">
                                <p className="text-sm text-gray-600 font-medium">Quick Select:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {QUICK_SUBTASKS.slice(0, 6).map(task => (
                                        <button
                                            key={task}
                                            onClick={() => handleStartSubtask(task)}
                                            className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm transition-colors text-left font-medium"
                                        >
                                            {task}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="What are you working on? (e.g., X Hotel Poster - Background)"
                                value={newSubtask}
                                onChange={(e) => setNewSubtask(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleStartSubtask()}
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleStartSubtask()}
                                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                                >
                                    Start
                                </button>
                                <button
                                    onClick={() => {
                                        setShowInput(false);
                                        setNewSubtask('');
                                    }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {timeLog && timeLog.last_subtask && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-2">Last completed:</p>
                            <p className="text-gray-900 text-sm font-medium">{timeLog.last_subtask}</p>
                            <p className="text-gray-500 text-xs mt-1">
                                {timeLog.last_subtask_duration} minutes
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
