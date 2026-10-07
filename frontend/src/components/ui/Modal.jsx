import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Centered modal dialog with neo-brutalist styling.
 * Supports Escape key close, focus trapping, and focus restoration.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {() => void} props.onClose - Callback triggered when closing
 * @param {React.ReactNode} [props.title] - Modal title in display font
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.maxWidth='max-w-lg'] - Max width class
 * @param {string} [props.className=''] - Additional classes for the modal card
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus initial element or modal card
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 10);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Modal dialog'}
        tabIndex={-1}
        className={`bg-surface border-2 border-ink shadow-lg p-6 w-full ${maxWidth} relative outline-none ${className}`}
      >
        <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
          {title ? (
            <h2 className="font-display uppercase text-xl text-ink tracking-tight">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-ink border-2 border-transparent hover:border-ink hover:bg-paper cursor-pointer transition-colors focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[2px]"
          >
            <X size={20} />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
