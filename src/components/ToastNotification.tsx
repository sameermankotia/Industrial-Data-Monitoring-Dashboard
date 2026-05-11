// Tiny toast system; wrap the app in <ToastProvider> then call useToast().push(message)

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import styles from './css/ToastNotification.module.css';

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
  const idRef = useRef(0); // stable id counter. Array index breaks when a middle toast is dismissed

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
  useEffect(() => { // cleanup cancels the timer if dismissed manually before ttl expires
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

// throws if called outside <ToastProvider>  (did intentionally, as silent failure would be hard to debug).
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
