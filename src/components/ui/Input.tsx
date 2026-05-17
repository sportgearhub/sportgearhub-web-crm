import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', type, disabled, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const hasPasswordToggle = type === 'password';
    const inputType = hasPasswordToggle && isPasswordVisible ? 'text' : type;
    const ToggleIcon = isPasswordVisible ? EyeOff : Eye;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-gray-700">{label}</label>
        )}
        <div className="relative">
          <input
            ref={ref}
            {...props}
            type={inputType}
            disabled={disabled}
            className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1f2d3d] placeholder-[#8a97a8] focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] focus:border-[#86b7fe] transition-colors ${
              error ? 'border-[#dc3545]' : 'border-[#cbd5e1]'
            } disabled:bg-[#f8fafc] disabled:text-[#94a3b8] ${hasPasswordToggle ? 'pr-10' : ''} ${className}`}
          />
          {hasPasswordToggle && (
            <button
              type="button"
              onClick={() => setIsPasswordVisible(current => !current)}
              disabled={disabled}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] disabled:cursor-not-allowed disabled:text-gray-300"
              aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
              aria-pressed={isPasswordVisible}
            >
              <ToggleIcon size={16} />
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
