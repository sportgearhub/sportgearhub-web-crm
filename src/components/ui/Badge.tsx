import { ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'teal';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border font-medium transition-colors',
  {
    variants: {
      variant: {
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        yellow: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-red-200 bg-red-50 text-red-700',
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        gray: 'border-border bg-muted text-muted-foreground',
        orange: 'border-orange-200 bg-orange-50 text-orange-700',
        teal: 'border-teal-200 bg-teal-50 text-teal-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'gray',
      size: 'sm',
    },
  }
);

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }))}>
      {children}
    </span>
  );
}
