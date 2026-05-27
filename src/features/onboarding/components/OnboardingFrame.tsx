import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';

export function OnboardingFrame({
  children,
  contentClassName = 'mx-auto max-w-3xl space-y-5',
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex min-h-screen items-center bg-[#f3f6fb] px-4 py-6">
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <OnboardingFrame contentClassName="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
        <p className="text-xs font-medium text-blue-800">Загружаем подключение...</p>
      </div>
    </OnboardingFrame>
  );
}

export function DecisionState({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <OnboardingFrame contentClassName="mx-auto max-w-xl">
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
            {icon}
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-950">{title}</h1>
            <p className="mt-1 text-xs leading-5 text-gray-600">{text}</p>
          </div>
        </div>
      </Card>
    </OnboardingFrame>
  );
}
