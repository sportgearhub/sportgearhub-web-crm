import { FlaskConical } from 'lucide-react';

interface PrototypeBannerProps {
  label?: string;
  message?: string;
}

export function PrototypeBanner({
  label = 'Prototype',
  message = 'This module uses mock data. Backend API support is pending.',
}: PrototypeBannerProps) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
      <FlaskConical size={15} className="mt-0.5 shrink-0" />
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        <p className="text-xs mt-0.5 text-amber-700">{message}</p>
      </div>
    </div>
  );
}
