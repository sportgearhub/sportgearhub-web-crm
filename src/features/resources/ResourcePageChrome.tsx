import { AlertTriangle } from 'lucide-react';

export function ResourceError({ message }: { message: string }) {
  return (
    <div className="m-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <AlertTriangle size={14} className="shrink-0 text-red-600" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}
