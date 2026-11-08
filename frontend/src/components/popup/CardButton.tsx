import type { ReactNode } from 'react';

interface CardButtonProps {
  label: string;
  onClick: () => void;
  title?: string;
  opensDialog?: boolean;
  pressed?: boolean;
  children: ReactNode;
}

export function CardButton({ label, title, onClick, opensDialog = false, pressed, children }: CardButtonProps) {
  return (
    <button
      type="button"
      className="popup-icon-button"
      aria-label={label}
      title={title}
      aria-haspopup={opensDialog ? 'dialog' : undefined}
      aria-pressed={pressed}
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

export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <path
      d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
}

export function CloseIcon() {
  return <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />;
}
