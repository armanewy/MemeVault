import { X } from 'lucide-react';

export function TagPill({
  label,
  color,
  onRemove
}: {
  label: string;
  color?: string;
  onRemove?: () => void;
}): JSX.Element {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded border border-border bg-panelAlt px-2 py-1 text-xs text-textSecondary">
      <span className="h-2 w-2 rounded-full" style={{ background: color || '#8B5CF6' }} />
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button className="text-textSecondary hover:text-textPrimary" onClick={onRemove} aria-label={`Remove ${label}`}>
          <X size={12} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

