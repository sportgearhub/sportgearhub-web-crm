import { ReactNode } from 'react';

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'teal';

const variantClasses: Record<Variant, string> = {
  green: 'bg-[#e8f7ee] text-[#146c43] border-[#badbcc]',
  yellow: 'bg-[#fff3cd] text-[#997404] border-[#ffecb5]',
  red: 'bg-[#f8d7da] text-[#b02a37] border-[#f1aeb5]',
  blue: 'bg-[#e7f1ff] text-[#084298] border-[#b6d4fe]',
  gray: 'bg-[#f8f9fa] text-[#495057] border-[#dee2e6]',
  orange: 'bg-[#fff0e1] text-[#b45f06] border-[#ffd8a8]',
  teal: 'bg-[#e6fffb] text-[#0f766e] border-[#99f6e4]',
};

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${variantClasses[variant]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      {children}
    </span>
  );
}
