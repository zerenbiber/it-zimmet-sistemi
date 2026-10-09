import { CircleAlert, Inbox, Search, X } from "lucide-react";
import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { errorMessage } from "../api/client";
import type { DeviceStatus } from "../api/types";
import { DEVICE_STATUS_LABELS } from "../lib/labels";
import type { Tone } from "./icons";

export const STATUS_TONE: Record<DeviceStatus, Tone> = {
  IN_STOCK: "good",
  ASSIGNED: "info",
  FAULTY: "critical",
  IN_REPAIR: "warning",
  RETIRED: "neutral",
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <span className={`pill tone-${STATUS_TONE[status]}`}>
      <span className="dot" aria-hidden="true" />
      {DEVICE_STATUS_LABELS[status]}
    </span>
  );
}

export function SearchField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="search-field">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input type="search" {...props} />
    </label>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }
  return (
    <div className="alert alert-error" role="alert">
      <CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
      <span>{errorMessage(error)}</span>
    </div>
  );
}

export function Loading({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Inbox size={22} strokeWidth={1.5} />
      </span>
      {children}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange(page: number): void;
}) {
  return (
    <div className="pagination">
      <span className="muted">Toplam {total} kayıt</span>
      {totalPages > 1 && (
        <div className="pagination-buttons">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            ‹ Önceki
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            Sonraki ›
          </button>
        </div>
      )}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose(): void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Runs once per opening, so re-renders while typing do not steal focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.querySelector<HTMLElement>(".modal-body :is(input, select, textarea)")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
