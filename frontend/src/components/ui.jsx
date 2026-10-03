import { useEffect } from 'react';

/** Campo de formulario con etiqueta y mensaje de error. */
export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="field__error">{error.message ?? error}</span> : hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function StatusBadge({ map, value }) {
  const s = map[value] ?? { label: value, tone: 'gray' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Alert({ type = 'error', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      )}
    </div>
  );
}

export function Loading({ text = 'Cargando...' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`tabs__tab${active === t.id ? ' tabs__tab--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
