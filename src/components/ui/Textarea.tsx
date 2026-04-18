import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
      <textarea
        {...props}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1f2d3d] placeholder-[#8a97a8] focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] focus:border-[#86b7fe] transition-colors resize-none ${
          error ? 'border-[#dc3545]' : 'border-[#cbd5e1]'
        } ${className}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
