import { X, Clock, CheckCircle } from 'lucide-react';

export default function AssetWorkDetailsModal({ asset, timeLogs, onClose }) {
    // Ensure timeLogs is an array
    const safeTimeLogs = Array.isArray(timeLogs) ? timeLogs : [];
    
    // Calculate total time
    const totalTime = safeTimeLogs.reduce((sum, log) =>
        sum + (parseFloat(log?.work_duration || log?.duration || 0)), 0
    );

    // Get current work
    const activeLog = safeTimeLogs.find(log => log && !log.end_time);
    const currentWork = activeLog?.current_subtask;

    // Format time
    const formatHours = (hours) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 z-[100]" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={onClose} />
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-[101] bg-white rounded-3xl border border-gray-100 p-6" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{asset.title}</h2>
                        <p className="text-gray-500 text-sm mt-1">Work Details</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                        <p className="text-gray-500 text-sm mb-1">Total Time</p>
                        <p className="text-gray-900 text-2xl font-bold">{formatHours(totalTime)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                        <p className="text-gray-500 text-sm mb-1">Progress</p>
                        <p className="text-gray-900 text-2xl font-bold">{asset.work_progress || 0}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                        <p className="text-gray-500 text-sm mb-1">Status</p>
                        <p className="text-gray-900 text-lg font-semibold">{asset.status}</p>
                    </div>
                </div>

                {/* Current Work */}
                {currentWork && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <p className="text-blue-700 font-semibold">Currently Working On</p>
                        </div>
                        <p className="text-gray-900 font-medium">{currentWork}</p>
                        <p className="text-gray-500 text-sm mt-1">
                            Started: {formatDateTime(activeLog.subtask_start_time)}
                        </p>
                    </div>
                )}

                {/* Work Sessions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        Work Sessions
                    </h3>

                    {safeTimeLogs.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No work sessions yet</p>
                    ) : (
                        <div className="space-y-3">
                            {safeTimeLogs.map((log, index) => (
                                <div key={log.log_id || index} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                    <div className="flex items-start justify-between mb-2 gap-4">
                                        <div>
                                            <p className="text-gray-900 font-medium">
                                                {formatDateTime(log.start_time)}
                                            </p>
                                            {log.last_subtask && (
                                                <p className="text-gray-600 text-sm mt-1">
                                                    Last task: {log.last_subtask}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-blue-600 font-semibold">
                                                {log.work_duration || log.duration ? formatHours(parseFloat(log.work_duration || log.duration)) : 'In progress'}
                                            </p>
                                            {log.last_subtask_duration && (
                                                <p className="text-gray-500 text-sm">
                                                    {log.last_subtask_duration} min
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {log.end_time && (
                                        <p className="text-gray-500 text-sm">
                                            Ended: {formatDateTime(log.end_time)}
                                        </p>
                                    )}

                                    {log.task_status && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-gray-600 text-sm">
                                                Status: <span className="text-gray-900 font-semibold">{log.task_status}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white px-4 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
