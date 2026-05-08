// Reusable yes/no dialog. Currently used for the logout confirmation, but
// it's generic so any destructive action can grab it later.

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './ConfirmDialog.module.css';

interface Props {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // When the dialog opens: focus the confirm button (so Enter works right
  // away) and listen for Esc to cancel.
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    // Click on the backdrop = cancel. stopPropagation on the dialog itself
    // so clicking inside the box doesn't bubble up and dismiss it.
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className={styles.title}>
          {title}
        </h2>
        {body && <p className={styles.body}>{body}</p>}
        <div className={styles.actions}>
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel ?? t('actions.cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel ?? t('actions.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
