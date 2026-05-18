import { CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader } from '../../components/ui/Card';
import type { AvailabilityDiagnostics } from '../../types';

export function AvailabilityDiagnosticsCard({ diagnostics }: { diagnostics: AvailabilityDiagnostics | null }) {
  const ready = diagnostics?.availabilityReady;
  const issues = [...(diagnostics?.errors ?? []), ...(diagnostics?.warnings ?? [])];
  const impactItems = Array.isArray(diagnostics?.publishabilityImpact)
    ? diagnostics.publishabilityImpact
    : [];

  return (
    <Card>
      <CardHeader
        title="Проверка готовности"
        subtitle="Что сейчас мешает клиентам бронировать эту позицию."
        action={<Badge variant={ready ? 'green' : 'yellow'}>{ready ? 'Можно бронировать' : 'Нужно исправить'}</Badge>}
      />
      {!diagnostics ? (
        <div className="rounded-md border border-dashed border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
          Проверка пока недоступна.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <DiagnosticPill label="Тип позиции" ok={diagnostics.modeValid} />
            <DiagnosticPill label="Правила" ok={diagnostics.availabilityReady} />
            <DiagnosticPill label="Заказ" ok={diagnostics.bookingRoutable} />
          </div>
          {issues.length > 0 ? (
            <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3">
              {issues.map(issue => (
                <p key={issue} className="text-xs text-amber-800">{issue}</p>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              По правилам бронирования все в порядке.
            </p>
          )}
          {diagnostics.checkedAt && (
            <p className="text-xs text-gray-500">Проверено: {new Date(diagnostics.checkedAt).toLocaleString('ru-RU')}</p>
          )}
          {impactItems.length > 0 && (
            <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-700">Для публикации</p>
              <div className="space-y-1">
                {impactItems.map(item => (
                  <div key={`${item.key}-${item.value}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-gray-500">{item.key}</span>
                    <span className="text-right font-medium text-gray-800">{item.value ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DiagnosticPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-1.5">
        {ok ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-amber-600" />}
        <span className={`text-xs font-medium ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>{label}</span>
      </div>
    </div>
  );
}
