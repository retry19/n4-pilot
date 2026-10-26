import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Bottom sheet on mobile, centered dialog on desktop. Native <dialog> gives us
 * focus trapping, Escape handling and inert background for free.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    } else if (!open && dialog.open) {
      // jsdom and older browsers may not implement close(); degrade gracefully.
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet__handle" aria-hidden />
      <div className="sheet__body">
        <div className="sheet__head">
          <div className="grow">
            <h2 id={titleId}>{title}</h2>
            {description ? <p className="caption" style={{ marginTop: 6 }}>{description}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
        {footer ? <div className="sheet__actions">{footer}</div> : null}
      </div>
    </dialog>
  );
}
