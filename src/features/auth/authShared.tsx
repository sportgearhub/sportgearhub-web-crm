import { type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Mail, Mountain } from 'lucide-react';
import { Input } from '../../components/ui/Input';

type AuthInputIcon = typeof Mail;

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <Mountain size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sportgearhub</h1>
          <p className="mt-1 text-sm text-gray-500">Кабинет партнера</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

export function IconInput({ icon: Icon, className = '', ...props }: React.ComponentProps<typeof Input> & { icon: AuthInputIcon }) {
  return (
    <div className="relative">
      <Input {...props} className={`pl-9 ${className}`} />
      <Icon size={14} className="pointer-events-none absolute left-3 bottom-[13px] text-gray-400" />
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const isError = kind === 'error';

  return (
    <div className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 ${isError ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
      {isError ? (
        <AlertCircle size={14} className="shrink-0 text-red-600" />
      ) : (
        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
      )}
      <p className={`text-xs ${isError ? 'text-red-700' : 'text-emerald-700'}`}>{children}</p>
    </div>
  );
}

export function LoadingNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
      <p className="text-xs font-medium text-blue-800">{children}</p>
    </div>
  );
}
