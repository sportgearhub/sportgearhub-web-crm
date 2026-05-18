import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Save } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ApiError, pricingApi } from '../../lib/api-client';
import type { PricingDiagnostics, PricingPolicy, Resource } from '../../types';

type PricingForm = {
  pricingMode: string;
  currency: string;
  baseAmount: string;
  status: string;
};

const statusOptions = [
  { value: 'active', label: 'Активна' },
  { value: 'draft', label: 'Черновик' },
  { value: 'archived', label: 'В архиве' },
];

interface ResourcePricingTabProps {
  resource: Resource;
}

export function ResourcePricingTab({ resource }: ResourcePricingTabProps) {
  const [policy, setPolicy] = useState<PricingPolicy | null>(null);
  const [diagnostics, setDiagnostics] = useState<PricingDiagnostics | null>(null);
  const [form, setForm] = useState<PricingForm>(emptyPricingForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyMissing, setPolicyMissing] = useState(false);
  const [error, setError] = useState('');

  const loadPricing = async () => {
    setLoading(true);
    setError('');
    setPolicyMissing(false);

    try {
      const nextPolicy = await pricingApi.getResourcePolicy(resource.resourceId);
      setPolicy(nextPolicy);
      setForm(policyToForm(nextPolicy));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPolicy(null);
        setPolicyMissing(true);
        setForm(emptyPricingForm());
      } else {
        setError(err instanceof ApiError ? `Не удалось загрузить цену: ${err.message}` : 'Не удалось загрузить цену.');
      }
    }

    try {
      setDiagnostics(await pricingApi.getResourceDiagnostics(resource.resourceId));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof ApiError ? `Не удалось проверить цену: ${err.message}` : 'Не удалось проверить цену.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPricing();
  }, [resource.resourceId]);

  const savePricing = async () => {
    const parsedAmount = form.baseAmount.trim() === '' ? null : Number(form.baseAmount);
    if (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      setError('Укажите корректную цену за час.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const nextPolicy = await pricingApi.putResourcePolicy(resource.resourceId, {
        pricingMode: form.pricingMode || 'per_unit_time',
        currency: form.currency || 'RUB',
        baseAmount: parsedAmount,
        adjustmentRules: policy?.adjustmentRules ?? [],
        status: form.status || 'active',
      });
      setPolicy(nextPolicy);
      setForm(policyToForm(nextPolicy));
      setPolicyMissing(false);
      setDiagnostics(await pricingApi.getResourceDiagnostics(resource.resourceId).catch(() => null));
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось сохранить цену: ${err.message}` : 'Не удалось сохранить цену.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Загружаем цену...</div>;
  }

  const ready = diagnostics?.pricingReady;
  const issues = [...(diagnostics?.errors ?? []), ...(diagnostics?.warnings ?? [])];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader
          title="Цена"
          subtitle={policyMissing ? 'Цена еще не настроена. Без нее предложение нельзя опубликовать.' : 'Базовая цена для предложений этой позиции.'}
          action={<Badge variant={policy?.status === 'active' ? 'green' : 'yellow'}>{policy?.status === 'active' ? 'Цена включена' : 'Нужно настроить'}</Badge>}
        />

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="mb-3 flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-blue-700 shadow-sm">
            <CreditCard size={14} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900">Расчет за время проката</p>
            <p className="mt-0.5 text-xs text-gray-500">Для велосипедов сохраняем цену за час в RUB.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_160px_180px]">
          <Input
            label={form.pricingMode === 'per_unit_time' ? 'Цена за час' : 'Цена'}
            type="number"
            min="0"
            value={form.baseAmount}
            onChange={event => setForm({ ...form, baseAmount: event.target.value })}
            placeholder="500"
            hint="Предложения используют эту цену, если у них нет своей."
          />
          <Input
            label="Валюта"
            value={form.currency}
            onChange={event => setForm({ ...form, currency: event.target.value.toUpperCase() })}
            placeholder="RUB"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Статус цены</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.status}
              onChange={event => setForm({ ...form, status: event.target.value })}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">
            Обновлено: {policy?.updatedAt ? new Date(policy.updatedAt).toLocaleString('ru-RU') : 'еще нет'}
          </p>
          <Button size="sm" variant="primary" onClick={() => void savePricing()} loading={saving}>
            <Save size={13} /> Сохранить цену
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Проверка цены"
          subtitle="Что мешает использовать цену в предложениях."
          action={<Badge variant={ready ? 'green' : 'yellow'}>{ready ? 'Готово' : 'Нужно исправить'}</Badge>}
        />
        {issues.length > 0 ? (
          <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3">
            {issues.map(issue => (
              <p key={issue} className="text-xs text-amber-800">{pricingIssueLabel(issue)}</p>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Цена настроена достаточно для публикации.
          </p>
        )}
        {diagnostics?.checkedAt && (
          <p className="mt-3 text-xs text-gray-500">Проверено: {new Date(diagnostics.checkedAt).toLocaleString('ru-RU')}</p>
        )}
        <PublishabilityImpact impact={diagnostics?.publishabilityImpact} />
      </Card>
    </div>
  );
}

function emptyPricingForm(): PricingForm {
  return {
    pricingMode: 'per_unit_time',
    currency: 'RUB',
    baseAmount: '',
    status: 'active',
  };
}

function policyToForm(policy: PricingPolicy): PricingForm {
  return {
    pricingMode: policy.pricingMode || 'per_unit_time',
    currency: policy.currency || 'RUB',
    baseAmount: String(policy.baseAmount ?? policy.unitRules?.baseAmount ?? ''),
    status: policy.status || 'active',
  };
}

function pricingIssueLabel(issue: string) {
  if (issue === 'pricing_policy_missing') return 'Настройте цену для этой позиции.';
  if (issue === 'pricing_policy_inactive') return 'Включите цену, чтобы предложения можно было публиковать.';
  if (issue === 'pricing_currency_missing') return 'Укажите валюту.';
  if (issue === 'pricing_base_amount_missing') return 'Укажите базовую цену.';
  if (issue === 'pricing_adjustments_not_configured') return 'Дополнительные правила цены не настроены.';
  return issue;
}

function PublishabilityImpact({ impact }: { impact: PricingDiagnostics['publishabilityImpact'] }) {
  if (!impact) return null;

  if (Array.isArray(impact)) {
    const visibleItems = impact.filter(item => item.value);
    if (visibleItems.length === 0) return null;
    return (
      <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
        {visibleItems.map(item => (
          <p key={item.key} className="text-xs text-gray-500">{item.value}</p>
        ))}
      </div>
    );
  }

  if ('reason' in impact && impact.reason) {
    return <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">{impact.reason}</p>;
  }

  return null;
}
