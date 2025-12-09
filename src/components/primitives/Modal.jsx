import { useEffect, useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-4xl',
  full: 'max-w-none w-full h-full rounded-none',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function Modal({
  title,
  description,
  children,
  onClose,
  preventCloseOnEsc = false,
  preventCloseOnBackdrop = false,
  size = 'md',
  ariaLabel,
  footer,
  hideCloseButton = false,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement;
    const focusable = node.querySelector('[data-autofocus]') ?? node.querySelector(FOCUSABLE);
    (focusable ?? node).focus({ preventScroll: true });

    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (preventCloseOnEsc) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
      if (event.key === 'Tab') {
        const focusableEls = dialogRef.current?.querySelectorAll(FOCUSABLE);
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

  const handleBackdropClick = (event) => {
    if (preventCloseOnBackdrop) return;
    // Close if clicking outside the modal content (on backdrop/overlay)
    if (dialogRef.current && !dialogRef.current.contains(event.target)) {
      onClose?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={ariaLabel}
      ref={dialogRef}
      tabIndex={-1}
      className={`w-full ${SIZE_CLASS[size] ?? SIZE_CLASS.md} bg-white rounded-3xl border border-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-overlay-slide motion-safe focus:outline-none`}
      onClick={handleBackdropClick}
    >
      <div className="p-6 flex flex-col h-full max-h-[calc(var(--vh)*100-80px)]">
        <header className="flex items-start justify-between gap-4">
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
          {!hideCloseButton && (
            <button
              type="button"
              onClick={() => onClose?.()}
              className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </header>
        <div className="mt-6 flex-1 overflow-y-auto">
          {children}
        </div>
        {footer ? <div className="mt-6 pt-4 border-t border-slate-100">{footer}</div> : null}
      </div>
    </div>
  );
}

Modal.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node,
  onClose: PropTypes.func,
  preventCloseOnEsc: PropTypes.bool,
  preventCloseOnBackdrop: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'full']),
  ariaLabel: PropTypes.string,
  footer: PropTypes.node,
  hideCloseButton: PropTypes.bool,
};

