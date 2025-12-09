import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useOverlayManager } from './OverlayManager.jsx';

/**
 * Declaratively mounts an overlay entry when `isOpen` is true.
 */
export default function OverlayMount({
  id,
  isOpen,
  blocking = true,
  priority = 0,
  type = 'modal',
  pointerEvents = 'auto',
  preventCloseOnBackdrop = false,
  render,
}) {
  const { registerOverlay, unregisterOverlay } = useOverlayManager();

  useEffect(() => {
    if (!isOpen) {
      unregisterOverlay(id);
      return undefined;
    }

    registerOverlay({
      id,
      blocking,
      priority,
      type,
      pointerEvents,
      preventCloseOnBackdrop,
      render,
    });

    return () => {
      unregisterOverlay(id);
    };
  }, [blocking, id, isOpen, pointerEvents, priority, preventCloseOnBackdrop, registerOverlay, render, type, unregisterOverlay]);

  return null;
}

OverlayMount.propTypes = {
  id: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  blocking: PropTypes.bool,
  priority: PropTypes.number,
  type: PropTypes.oneOf(['modal', 'drawer', 'toast']),
  pointerEvents: PropTypes.oneOf(['auto', 'none']),
  preventCloseOnBackdrop: PropTypes.bool,
  render: PropTypes.func.isRequired,
};

