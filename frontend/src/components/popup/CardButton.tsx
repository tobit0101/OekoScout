import type { ReactNode } from 'react';

interface CardButtonProps {
  label: string;
  onClick: () => void;
  title?: string;
  opensDialog?: boolean;
  children: ReactNode;
}

export function CardButton({ label, title, onClick, opensDialog = false, children }: CardButtonProps) {
  return (
    <button
      type="button"
      className="popup-icon-button"
      aria-label={label}
      title={title}
      aria-haspopup={opensDialog ? 'dialog' : undefined}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        {children}
      </svg>
    </button>
  );
}

export function InfoIcon() {
  return (
    <>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="7.8" r="1.4" fill="currentColor" />
      <path d="M12 11v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

export function CloseIcon() {
  return <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />;
}
