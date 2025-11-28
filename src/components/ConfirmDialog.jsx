import { X, AlertTriangle, Info } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const bgColor = isDanger ? 'bg-red-600' : 'bg-primary';
  const hoverColor = isDanger ? 'hover:bg-red-700' : 'hover:bg-primary-dark';
  const shadowColor = isDanger ? 'shadow-red-600/20' : 'shadow-primary/30';
  const iconBg = isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-primary';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 transition-opacity z-[100]" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={onClose} />
      <div className="glass-card w-full max-w-md p-6 relative z-[101] animate-fadeIn bg-white rounded-2xl" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {isDanger ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-2.5 text-white ${bgColor} rounded-xl font-bold ${hoverColor} transition-colors shadow-lg ${shadowColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
