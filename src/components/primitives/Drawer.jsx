import { useEffect, useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const POSITION_CLASS = {
  right: 'ml-auto h-full w-full max-w-xl rounded-l-3xl border-l border-slate-100',
  left: 'mr-auto h-full w-full max-w-xl rounded-r-3xl border-r border-slate-100',
  bottom: 'mt-auto w-full rounded-t-3xl border-t border-slate-100',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function Drawer({
  title,
  description,
  children,
  onClose,
  side = 'right',
  preventCloseOnEsc = false,
  preventCloseOnBackdrop = false,
  ariaLabel,
  footer,
  width,
}) {
  const drawerRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = drawerRef.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement;
    const focusTarget = node.querySelector('[data-autofocus]') ?? node.querySelector(FOCUSABLE);
    (focusTarget ?? node).focus({ preventScroll: true });

    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    if (preventCloseOnEsc) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
      if (event.key === 'Tab') {
        const focusableEls = drawerRef.current?.querySelectorAll(FOCUSABLE);
        if (!focusableEls || focusableEls.length === 0) return;
        const focusables = Array.from(focusableEls);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, preventCloseOnEsc]);

  const labelledBy = title ? `${titleId}-title` : undefined;
  const describedBy = description ? `${descriptionId}-desc` : undefined;
  const positionClass = POSITION_CLASS[side] ?? POSITION_CLASS.right;

  const handleBackdropClick = (event) => {
    if (preventCloseOnBackdrop) return;
    // Close if clicking outside the drawer content (on backdrop/overlay)
    if (drawerRef.current && !drawerRef.current.contains(event.target)) {
      onClose?.();
    }
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={ariaLabel}
      ref={drawerRef}
      tabIndex={-1}
      className={`bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-drawer-enter motion-safe focus:outline-none ${positionClass}`}
      style={width ? { width } : undefined}
      onClick={handleBackdropClick}
    >
      <div className="h-full flex flex-col">
        <header className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-2">
            {title ? (
              <h3 id={labelledBy} className="text-xl font-semibold text-slate-900">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p id={describedBy} className="text-sm text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? <footer className="p-6 border-t border-slate-100">{footer}</footer> : null}
      </div>
    </section>
  );
}

Drawer.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node,
  onClose: PropTypes.func,
  side: PropTypes.oneOf(['left', 'right', 'bottom']),
  preventCloseOnEsc: PropTypes.bool,
  preventCloseOnBackdrop: PropTypes.bool,
  ariaLabel: PropTypes.string,
  footer: PropTypes.node,
  width: PropTypes.string,
};

