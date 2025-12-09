import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import OverlayMount from './overlay/OverlayMount.jsx';
import Card from './primitives/Card.jsx';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };

    setToasts(prev => [...prev, toast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast]);
  const error = useCallback((message, duration) => showToast(message, 'error', duration), [showToast]);
  const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast]);
  const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, showToast }}>
      {children}
      <OverlayMount
        id="toast-stack"
        isOpen={toasts.length > 0}
        type="toast"
        blocking={false}
        priority={100}
        pointerEvents="none"
        render={() => <ToastContainer toasts={toasts} removeToast={removeToast} />}
      />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="space-y-3 max-w-md w-full pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
}

function Toast({ toast, removeToast }) {
  const { message, type } = toast;

  const icon = useMemo(() => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  }, [type]);

  const tone = useMemo(() => {
    switch (type) {
      case 'success':
        return 'border-green-100';
      case 'error':
        return 'border-red-100';
      case 'warning':
        return 'border-yellow-100';
      default:
        return 'border-blue-100';
    }
  }, [type]);

  return (
    <Card
      elevation="sm"
      className={`flex items-start gap-4 pointer-events-auto animate-overlay-slide ${tone}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-snug">{message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </Card>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
