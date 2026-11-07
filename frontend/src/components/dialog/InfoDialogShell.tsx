import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CardButton } from '../popup/CardButton';
import { useCopyToClipboard } from '../popup/useCopyToClipboard';

interface InfoDialogShellProps {
  titleId: string;
  title: string;
  subtitle?: string;
  copyLabel: string;
  copyText: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function InfoDialogShell({ titleId, title, subtitle, copyLabel, copyText, wide = false, onClose, children }: InfoDialogShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { status, copy } = useCopyToClipboard();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className={wide ? 'cell-info-dialog cell-info-dialog--wide' : 'cell-info-dialog'}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <div className="cell-info-dialog__body">
        <header className="cell-info-dialog__header">
          <div className="cell-info-dialog__heading">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="cell-info-dialog__subtitle">{subtitle}</p>}
          </div>
          <span aria-live="polite" className="cell-info-dialog__feedback">
            {status === 'copied' && 'Kopiert'}
            {status === 'failed' && 'Kopieren nicht möglich'}
          </span>
          <CardButton label={copyLabel} title={copyLabel} onClick={() => void copy(copyText)}>
            {status === 'copied' ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <>
                <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" fill="none" stroke="currentColor" strokeWidth="2" />
              </>
            )}
          </CardButton>
          <button
            type="button"
            className="popup-icon-button"
            aria-label="Schließen"
            onClick={onClose}
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
