import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './ForecastModal.css';

const ForecastModal = ({ open, onClose, children }) => {
  const dialogRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    lastFocusedElementRef.current = document.activeElement;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    const focusTimer = window.requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      lastFocusedElementRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = () => {
    onClose?.();
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div className="forecast-modal" role="presentation" onClick={handleBackdropClick}>
      <div className="forecast-modal__backdrop" aria-hidden />
      <div
        className="forecast-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Machine learning forecasting tools"
        onClick={stopPropagation}
        ref={dialogRef}
        tabIndex={-1}
      >
        <button
          type="button"
          className="forecast-modal__close"
          onClick={onClose}
          aria-label="Close forecast modal"
        >
          <X size={18} />
        </button>
        <div className="forecast-modal__content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ForecastModal;
