import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          {...props}
          className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1f2d3d] placeholder-[#8a97a8] focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] focus:border-[#86b7fe] transition-colors ${
            error ? 'border-[#dc3545]' : 'border-[#cbd5e1]'
          } disabled:bg-[#f8fafc] disabled:text-[#94a3b8] ${className}`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
