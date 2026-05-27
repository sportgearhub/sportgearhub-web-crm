import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CreditCard as Edit2, Save, X, Shield } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ApiError, policyApi } from '../../lib/api-client';
import type { PolicyDeposit, ProviderPolicy } from '../../types';

const percentageOptions = Array.from({ length: 101 }, (_, value) => ({
  value: String(value),
  label: `${value}%`,
}));

export function PolicyPage({ embedded = false }: { embedded?: boolean }) {
  const [policies, setPolicies] = useState<ProviderPolicy[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ProviderPolicy>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = (p: ProviderPolicy) => { setEditId(p.id); setEditData({ ...p }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const loadPolicy = async () => {
    setLoading(true);
    setError('');
    try {
      const policy = await policyApi.getProfile();
      setPolicies([normalizePolicy(policy)]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPolicies([defaultPolicy()]);
      } else {
        setError(err instanceof ApiError ? `Не удалось загрузить правила: ${err.message}` : 'Не удалось загрузить правила.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPolicy();
  }, []);

  const saveEdit = async () => {
    if (!editId) return;
    const current = normalizePolicy({ ...policies.find(policy => policy.id === editId), ...editData } as ProviderPolicy);
    setSaving(true);
    setError('');
    try {
      const saved = await policyApi.putProfile({
        policyScope: 'default',
        status: current.status || 'draft',
        leadTimeHours: current.leadTimeHours ?? 2,
        cancellationWindowHours: current.cancellationWindowHours,
        isCancellationAllowed: current.isCancellationAllowed ?? true,
        noShowChargePercent: current.noShowChargePercent ?? 100,
        deposit: current.deposit,
        checkInGraceMinutes: current.checkInGraceMinutes ?? 15,
        assuranceMode: current.assuranceMode ?? 'none',
        weatherException: current.weatherException ?? false,
        minimumAge: current.minimumAge ?? 18,
      });
      setPolicies([normalizePolicy(saved)]);
      cancelEdit();
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось сохранить правила: ${err.message}` : 'Не удалось сохранить правила.');
    } finally {
      setSaving(false);
    }
  };

  const policyBlockClass = embedded ? 'rounded-none border-x-0 p-6 shadow-none' : '';

  return (
    <div className={embedded ? 'space-y-5 py-6' : 'p-6 space-y-5 max-w-4xl'}>
      <div className={embedded ? 'px-6' : ''}>
        <h2 className="text-sm font-semibold text-gray-900">Правила работы</h2>
        <p className="text-xs text-gray-500 mt-0.5">Настройте отмены, депозиты и операционные правила.</p>
      </div>

      {error && <div className={embedded ? 'mx-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700' : 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'}>{error}</div>}

      {loading && (
        <Card className={policyBlockClass}>
          <p className="text-xs text-gray-500">Загружаем правила...</p>
        </Card>
      )}

      {!loading && policies.map(p => {
        const isEditing = editId === p.id;
        const d = isEditing ? editData : p;
        return (
          <Card key={p.id} className={policyBlockClass}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-500" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{p.label}</h3>
                  <p className="text-xs text-gray-500">Обновлено {new Date(p.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => void saveEdit()} loading={saving}><Save size={12} /> Сохранить</Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}><X size={12} /></Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>
                  <Edit2 size={12} /> Редактировать
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SectionTitle>Отмена</SectionTitle>
                <PolicyField
                  label="Бесплатная отмена"
                  value={String(d.cancellationWindowHours)}
                  suffix="ч до начала"
                  type="number"
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, cancellationWindowHours: parseInt(v) || 0 }))}
                />
                <PercentageSelectField
                  label="Возврат при отмене"
                  value={Number(d.cancellationRefundPercent ?? 0)}
                  editing={isEditing}
                  onChange={value => setEditData(prev => ({ ...prev, cancellationRefundPercent: value }))}
                />
              </div>

              <div className="space-y-4">
                <SectionTitle>Депозиты и штрафы</SectionTitle>
                <DepositField
                  deposit={d.deposit ?? { unit: 'none' }}
                  editing={isEditing}
                  onChange={deposit => setEditData(prev => ({ ...prev, deposit }))}
                />
                {(d.deposit?.unit === 'percentage' || d.deposit?.unit === 'fixed_amount') && !isEditing && (
                  <PolicyField
                    label="Размер"
                    value={String(d.deposit.value)}
                    suffix={d.deposit.unit === 'percentage' ? '% от суммы' : d.deposit.currency}
                    editing={false}
                    onChange={() => undefined}
                  />
                )}
                <ToggleField
                  label="Нужен залог за ущерб"
                  value={!!d.damageDepositRequired}
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, damageDepositRequired: v }))}
                />
                <ToggleField
                  label="Штраф за поздний возврат"
                  value={!!d.lateReturnFeeEnabled}
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, lateReturnFeeEnabled: v }))}
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1">Дополнительные заметки</p>
              {isEditing ? (
                <Textarea
                  value={editData.additionalNotes || ''}
                  onChange={e => setEditData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  rows={3}
                  placeholder="Особые требования, проверка документов и т.д."
                />
              ) : (
                <p className="text-sm text-gray-700">{p.additionalNotes || '—'}</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function normalizePolicy(policy: ProviderPolicy): ProviderPolicy {
  const ruleset = policy.ruleset ?? {};
  return {
    ...policy,
    id: policy.id ?? policy.ownerId ?? 'provider-policy',
    label: policy.label ?? 'Правила партнера',
    policyScope: policy.policyScope ?? 'default',
    status: policy.status ?? 'active',
    ruleset,
    leadTimeHours: Number(policy.leadTimeHours ?? ruleset.leadTimeHours ?? 2),
    cancellationWindowHours: Number(policy.cancellationWindowHours ?? ruleset.cancellationWindowHours ?? 24),
    cancellationRefundPercent: Number(policy.cancellationRefundPercent ?? ruleset.cancellationRefundPercent ?? 100),
    isCancellationAllowed: Boolean(policy.isCancellationAllowed ?? ruleset.isCancellationAllowed ?? true),
    noShowChargePercent: Number(policy.noShowChargePercent ?? ruleset.noShowChargePercent ?? 100),
    deposit: normalizeDeposit(policy.deposit ?? ruleset.deposit),
    checkInGraceMinutes: Number(policy.checkInGraceMinutes ?? ruleset.checkInGraceMinutes ?? 15),
    assuranceMode: String(policy.assuranceMode ?? ruleset.assuranceMode ?? 'none'),
    weatherException: Boolean(policy.weatherException ?? ruleset.weatherException ?? false),
    minimumAge: Number(policy.minimumAge ?? ruleset.minimumAge ?? 18),
    lateReturnFeeEnabled: Boolean(policy.lateReturnFeeEnabled ?? ruleset.lateReturnFeeEnabled ?? false),
    damageDepositRequired: Boolean(policy.damageDepositRequired ?? ruleset.damageDepositRequired ?? false),
    additionalNotes: policy.additionalNotes ?? String(ruleset.additionalNotes ?? ''),
    updatedAt: policy.updatedAt ?? new Date().toISOString(),
  };
}

function defaultPolicy(): ProviderPolicy {
  return normalizePolicy({
    id: 'provider-policy',
    label: 'Правила партнера',
    policyScope: 'default',
    status: 'draft',
    ruleset: {},
    leadTimeHours: 2,
    cancellationWindowHours: 24,
    isCancellationAllowed: true,
    noShowChargePercent: 100,
    cancellationRefundPercent: 100,
    deposit: { unit: 'none' },
    checkInGraceMinutes: 15,
    assuranceMode: 'none',
    weatherException: false,
    minimumAge: 18,
    lateReturnFeeEnabled: false,
    damageDepositRequired: false,
    additionalNotes: '',
    updatedAt: new Date().toISOString(),
  });
}

function normalizeDeposit(value: unknown): PolicyDeposit {
  if (!value || typeof value !== 'object') return { unit: 'none' };
  const deposit = value as { unit?: unknown; value?: unknown; currency?: unknown };

  if (deposit.unit === 'percentage') {
    return {
      unit: 'percentage',
      value: typeof deposit.value === 'number' ? deposit.value : 0,
    };
  }

  if (deposit.unit === 'fixed_amount') {
    return {
      unit: 'fixed_amount',
      value: typeof deposit.value === 'number' ? deposit.value : 0,
      currency: typeof deposit.currency === 'string' && deposit.currency ? deposit.currency : 'RUB',
    };
  }

  return { unit: 'none' };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{children}</p>;
}

function PolicyField({
  label,
  value,
  suffix,
  type,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  suffix: string;
  type?: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1"
          />
          <span className="text-xs text-gray-500 shrink-0">{suffix}</span>
        </div>
      ) : (
        <p className="text-sm font-semibold text-gray-900">{value} <span className="text-xs font-normal text-gray-500">{suffix}</span></p>
      )}
    </div>
  );
}

function PercentageSelectField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: number;
  editing: boolean;
  onChange: (value: number) => void;
}) {
  const boundedValue = String(Math.min(100, Math.max(0, value || 0)));

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <FancyPercentageSelect
          value={boundedValue}
          onChange={nextValue => onChange(Number(nextValue))}
        />
      ) : (
        <p className="text-sm font-semibold text-gray-900">{boundedValue} <span className="text-xs font-normal text-gray-500">% от суммы</span></p>
      )}
    </div>
  );
}

function FancyPercentageSelect({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = percentageOptions.find(option => option.value === value) ?? percentageOptions[0];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {label && <p className="mb-1.5 text-xs font-medium text-foreground">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="flex h-8 w-28 items-center justify-between rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <span className="font-medium text-gray-900">{selected.label}</span>
        <ChevronDown size={14} className={`text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-28 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {percentageOptions.map(option => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs transition ${
                  isSelected ? 'bg-blue-50 font-medium text-blue-950' : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={12} className="text-blue-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToggleField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: boolean;
  editing: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="min-w-0 text-xs text-gray-600">{label}</p>
      {editing ? (
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
            value ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-gray-200'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      ) : (
        <span className={`shrink-0 text-xs font-medium ${value ? 'text-emerald-600' : 'text-gray-500'}`}>
          {value ? 'Да' : 'Нет'}
        </span>
      )}
    </div>
  );
}

function DepositField({
  deposit,
  editing,
  onChange,
}: {
  deposit: PolicyDeposit;
  editing: boolean;
  onChange: (deposit: PolicyDeposit) => void;
}) {
  if (!editing) {
    const label =
      deposit.unit === 'none'
        ? 'Нет'
        : deposit.unit === 'percentage'
          ? `${deposit.value}% от суммы`
          : `${deposit.value.toLocaleString()} ${deposit.currency}`;

    return (
      <div>
        <p className="text-xs text-gray-500 mb-1">Депозит</p>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select
        label="Депозит"
        value={deposit.unit}
        options={[
          { value: 'none', label: 'Без депозита' },
          { value: 'percentage', label: 'Процент от суммы' },
          { value: 'fixed_amount', label: 'Фиксированная сумма' },
        ]}
        onChange={event => {
          if (event.target.value === 'percentage') {
            onChange({ unit: 'percentage', value: deposit.unit === 'percentage' ? deposit.value : 0 });
          } else if (event.target.value === 'fixed_amount') {
            onChange({
              unit: 'fixed_amount',
              value: deposit.unit === 'fixed_amount' ? deposit.value : 0,
              currency: deposit.unit === 'fixed_amount' ? deposit.currency : 'RUB',
            });
          } else {
            onChange({ unit: 'none' });
          }
        }}
      />
      {deposit.unit !== 'none' && (
        <div className={deposit.unit === 'fixed_amount' ? 'grid grid-cols-[1fr_96px] gap-2' : ''}>
          {deposit.unit === 'percentage' ? (
            <FancyPercentageSelect
              label="Процент"
              value={String(Math.min(100, Math.max(0, deposit.value || 0)))}
              onChange={value => onChange({ unit: 'percentage', value: Number(value) })}
            />
          ) : (
            <Input
              label="Сумма"
              type="number"
              value={String(deposit.value)}
              onChange={event => {
                const value = Number(event.target.value) || 0;
                onChange({ unit: 'fixed_amount', value, currency: deposit.currency });
              }}
            />
          )}
          {deposit.unit === 'fixed_amount' && (
            <Input
              label="Валюта"
              value={deposit.currency}
              onChange={event => onChange({
                unit: 'fixed_amount',
                value: deposit.value,
                currency: event.target.value.toUpperCase(),
              })}
            />
          )}
        </div>
      )}
    </div>
  );
}
