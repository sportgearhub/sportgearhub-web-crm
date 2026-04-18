import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
      <select
        {...props}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1f2d3d] focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] focus:border-[#86b7fe] transition-colors ${
          error ? 'border-[#dc3545]' : 'border-[#cbd5e1]'
        } ${className}`}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
