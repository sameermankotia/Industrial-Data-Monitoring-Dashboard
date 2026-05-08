// Tiny toast system used for transient feedback (errors, "logged out", etc).
// Wrap the app in <ToastProvider>, then call useToast().push(message).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import styles from './ToastNotification.module.css';

// Each variant gets its own left border color in the CSS module.
type ToastVariant = 'info' | 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  ttl: number;
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant, ttl?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // id counter — using array index would break if a toast in the
  // middle gets dismissed early.
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = 'info', ttl = 4000) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, message, variant, ttl }]);
    },
    [],
  );

  // Memoize so consumers of the context don't re-render when this provider
  // re-renders for unrelated reasons.
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  // Cleanup runs if the component
  // unmounts (e.g. user dismisses manually before time runs out).
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.ttl);
    return () => clearTimeout(timer);
  }, [toast.id, toast.ttl, onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[toast.variant]}`} role="alert">
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

// Hook for components that want to show a toast. Throws if you forgot
// to wrap your tree in <ToastProvider> — better than silently doing nothing.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
