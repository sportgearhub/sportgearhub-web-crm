import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function StepChoice({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 text-blue-950'
          : 'border-gray-200 bg-white text-gray-900 hover:border-blue-200 hover:bg-blue-50/40'
      }`}
    >
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
        selected ? 'border-blue-700' : 'border-gray-300'
      }`}>
        {selected && <span className="h-2 w-2 rounded-full bg-blue-700" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-gray-600">{description}</span>}
      </span>
    </button>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs leading-5 text-gray-500">{subtitle}</p>}
    </div>
  );
}

export function ChecklistLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check size={10} strokeWidth={2.4} />
      </span>
      <span>{children}</span>
    </li>
  );
}
