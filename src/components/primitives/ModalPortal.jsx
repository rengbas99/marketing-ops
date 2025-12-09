import { useCallback, useId } from 'react';
import PropTypes from 'prop-types';
import OverlayMount from '../overlay/OverlayMount.jsx';
import Modal from './Modal.jsx';

export default function ModalPortal({
  id,
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  preventCloseOnEsc = false,
  preventCloseOnBackdrop = false,
  footer,
  children,
}) {
  const autoId = useId();
  const resolvedId = id || `modal-${autoId}`;

  const renderOverlay = useCallback(
    ({ close }) => {
      const handleClose = () => {
        close();
        onClose?.();
      };

      const content = typeof children === 'function' ? children({ close: handleClose }) : children;
      const footerContent = typeof footer === 'function' ? footer({ close: handleClose }) : footer;

      return (
        <Modal
          title={title}
          description={description}
          onClose={handleClose}
          size={size}
          preventCloseOnEsc={preventCloseOnEsc}
          preventCloseOnBackdrop={preventCloseOnBackdrop}
          footer={footerContent}
        >
          {content}
        </Modal>
      );
    },
    [children, description, footer, onClose, preventCloseOnBackdrop, preventCloseOnEsc, size, title],
  );

  return (
    <OverlayMount
      id={resolvedId}
      isOpen={isOpen}
      type="modal"
      blocking
      priority={15}
      preventCloseOnBackdrop={preventCloseOnBackdrop}
      render={renderOverlay}
    />
  );
}

ModalPortal.propTypes = {
  id: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  title: PropTypes.string,
  description: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'full']),
  preventCloseOnEsc: PropTypes.bool,
  preventCloseOnBackdrop: PropTypes.bool,
  footer: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
};

