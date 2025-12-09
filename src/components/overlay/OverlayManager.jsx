import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

const OverlayContext = createContext(null);

function sortByPriority(overlays) {
  // Sort in descending order so higher priority overlays render on top
  return [...overlays].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

function OverlayStack({ overlays, unregisterOverlay }) {
  if (overlays.length === 0) {
    return null;
  }

  const hasBlocking = overlays.some(({ blocking }) => blocking);

  const handleBackdropClick = (event) => {
    // Find the topmost overlay that allows backdrop close
    const topOverlay = sortByPriority(overlays)
      .filter(overlay => overlay.blocking && !overlay.preventCloseOnBackdrop)
      .pop();
    
    if (topOverlay && event.target.classList.contains('overlay-backdrop')) {
      unregisterOverlay(topOverlay.id);
    }
  };

  const handleOverlayLayerClick = (overlay, event) => {
    // Close if clicking on the overlay-layer itself (not on rendered content)
    if (!overlay.blocking || overlay.preventCloseOnBackdrop) return;
    if (event.target === event.currentTarget) {
      unregisterOverlay(overlay.id);
    }
  };

  return (
    <div className="overlay-root">
      {hasBlocking && (
        <div 
          className="overlay-backdrop" 
          data-testid="overlay-backdrop"
          onClick={handleBackdropClick}
        />
      )}
      {sortByPriority(overlays).map((overlay, index) => (
        <div
          key={overlay.id}
          className="overlay-layer"
          data-type={overlay.type}
          data-pointer={overlay.pointerEvents ?? 'auto'}
          style={{
            zIndex: `calc(var(--z-overlay) + ${index + 1})`,
          }}
          onClick={(e) => handleOverlayLayerClick(overlay, e)}
        >
          {overlay.render({
            close: () => unregisterOverlay(overlay.id),
          })}
        </div>
      ))}
    </div>
  );
}

OverlayStack.propTypes = {
  overlays: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        render: PropTypes.func.isRequired,
        blocking: PropTypes.bool,
        type: PropTypes.oneOf(['modal', 'drawer', 'toast']),
        priority: PropTypes.number,
        pointerEvents: PropTypes.oneOf(['auto', 'none']),
        preventCloseOnBackdrop: PropTypes.bool,
      }),
  ).isRequired,
  unregisterOverlay: PropTypes.func.isRequired,
};

export function OverlayProvider({ children }) {
  const [overlays, setOverlays] = useState([]);
  const portalRef = useRef(typeof document !== 'undefined' ? document.getElementById('app-portal') : null);

  useEffect(() => {
    if (!portalRef.current && typeof document !== 'undefined') {
      const portal = document.createElement('div');
      portal.id = 'app-portal';
      document.body.appendChild(portal);
      portalRef.current = portal;
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const blockingCount = overlays.filter(({ blocking }) => blocking).length;
    document.body.classList.toggle('overlay-scroll-lock', blockingCount > 0);
    return () => {
      document.body.classList.remove('overlay-scroll-lock');
    };
  }, [overlays]);

  const registerOverlay = useCallback((overlayConfig) => {
    if (!overlayConfig?.id || typeof overlayConfig.render !== 'function') {
      throw new Error('Overlays require a stable id and a render function.');
    }

    setOverlays((prev) => {
      const next = prev.filter((entry) => entry.id !== overlayConfig.id);
      next.push({
        blocking: true,
        priority: 0,
        type: 'modal',
        pointerEvents: 'auto',
        preventCloseOnBackdrop: false,
        ...overlayConfig,
      });
      return next;
    });
  }, []);

  const unregisterOverlay = useCallback((id) => {
    setOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
  }, []);

  const contextValue = useMemo(
    () => ({
      registerOverlay,
      unregisterOverlay,
      overlays,
    }),
    [registerOverlay, unregisterOverlay, overlays],
  );

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}
      {portalRef.current && createPortal(
        <OverlayStack overlays={overlays} unregisterOverlay={unregisterOverlay} />,
        portalRef.current,
      )}
    </OverlayContext.Provider>
  );
}

OverlayProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useOverlayManager() {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlayManager must be used within an OverlayProvider');
  }
  return context;
}

