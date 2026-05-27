import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type FancySelectOption = {
  value: string;
  label: string;
  description?: string | null;
};

type FancySelectProps = {
  label?: string;
  value: string;
  options: FancySelectOption[];
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function FancySelect({
  label,
  value,
  options,
  error,
  disabled = false,
  placeholder = 'Выберите значение',
  onChange,
}: FancySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <div className="relative flex flex-col gap-1.5" onBlur={() => window.setTimeout(() => setOpen(false), 120)}>
      {label && <label className="text-xs font-medium text-foreground">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className={`flex h-9 w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm transition hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-destructive focus-visible:ring-destructive/40' : 'border-input'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected?.value ? '' : 'text-muted-foreground'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg"
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition ${
                  isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{option.label}</span>
                  {option.description && <span className="mt-0.5 block text-xs leading-4 text-gray-500">{option.description}</span>}
                </span>
                {isSelected && <Check size={14} className="mt-0.5 shrink-0 text-blue-700" />}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
