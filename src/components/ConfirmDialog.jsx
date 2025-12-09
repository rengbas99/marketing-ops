import { useCallback, useId, useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import OverlayMount from './overlay/OverlayMount.jsx';
import Modal from './primitives/Modal.jsx';
import Button from './primitives/Button.jsx';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  preventCloseOnEsc = false,
}) {
  const reactId = useId();
  const overlayId = useMemo(() => `confirm-${reactId}`, [reactId]);
  const isDanger = type === 'danger';

  const renderOverlay = useCallback(
    ({ close }) => {
      const handleClose = () => {
        close();
        onClose?.();
      };

      const handleConfirm = () => {
        onConfirm?.();
        handleClose();
      };

      return (
        <Modal
          title={title}
          onClose={handleClose}
          preventCloseOnEsc={preventCloseOnEsc}
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={handleClose}>
                {cancelText}
              </Button>
              <Button variant={isDanger ? 'destructive' : 'primary'} onClick={handleConfirm}>
                {confirmText}
              </Button>
            </div>
          }
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-primary'
              }`}
            >
              {isDanger ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-base text-slate-600 leading-relaxed">{message}</p>
            </div>
          </div>
        </Modal>
      );
    },
    [cancelText, confirmText, isDanger, message, onClose, onConfirm, preventCloseOnEsc, title],
  );

  return (
    <OverlayMount
      id={overlayId}
      isOpen={isOpen}
      type="modal"
      blocking
      priority={10}
      render={renderOverlay}
    />
  );
}
