'use client';

import { cn } from '@/lib/utils';

export function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className={cn(
          'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all placeholder:text-foreground-secondary/40',
          error
            ? 'border-danger focus:border-danger'
            : 'border-border focus:border-primary'
        )}
      />
      {error && (
        <p className="text-xs text-danger mt-1">{error}</p>
      )}
    </div>
  );
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all appearance-none',
          error
            ? 'border-danger focus:border-danger'
            : 'border-border focus:border-primary'
        )}
      >
        <option value="">请选择</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-danger mt-1">{error}</p>
      )}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-10 text-center">
      <p className="text-sm text-foreground-secondary">{text}</p>
    </div>
  );
}
