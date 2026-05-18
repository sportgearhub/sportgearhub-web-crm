import { useState } from 'react';
import { CreditCard as Edit2, Save, X, Shield } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { PrototypeBanner } from '../../components/ui/PrototypeBanner';
import type { ProviderPolicy } from '../../types';

export function PolicyPage() {
  const [policies, setPolicies] = useState<ProviderPolicy[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ProviderPolicy>>({});

  const startEdit = (p: ProviderPolicy) => { setEditId(p.id); setEditData({ ...p }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };
  const saveEdit = () => {
    setPolicies(prev => prev.map(p => p.id === editId ? { ...p, ...editData, updatedAt: new Date().toISOString() } : p));
    cancelEdit();
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Правила работы</h2>
        <p className="text-xs text-gray-500 mt-0.5">Настройте отмены, депозиты и операционные правила.</p>
      </div>

      <PrototypeBanner label="ожидает API" message="Запись правил пока работает только в прототипе. Поддержка API будет подключена позже." />

      {policies.map(p => {
        const isEditing = editId === p.id;
        const d = isEditing ? editData : p;
        return (
          <Card key={p.id}>
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
                  <Button size="sm" variant="primary" onClick={saveEdit}><Save size={12} /> Сохранить</Button>
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
                <PolicyField
                  label="Возврат при отмене"
                  value={String(d.cancellationRefundPercent)}
                  suffix="% от суммы"
                  type="number"
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, cancellationRefundPercent: parseInt(v) || 0 }))}
                />
              </div>

              <div className="space-y-4">
                <SectionTitle>Депозиты и штрафы</SectionTitle>
                <ToggleField
                  label="Нужен депозит"
                  value={!!d.depositRequired}
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, depositRequired: v }))}
                />
                {d.depositRequired && (
                  <PolicyField
                    label="Размер депозита"
                    value={String(d.depositPercent)}
                    suffix="% от суммы"
                    type="number"
                    editing={isEditing}
                    onChange={v => setEditData(prev => ({ ...prev, depositPercent: parseInt(v) || 0 }))}
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
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-600">{label}</p>
      {editing ? (
        <button
          onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      ) : (
        <span className={`text-xs font-medium ${value ? 'text-emerald-600' : 'text-gray-500'}`}>
          {value ? 'Да' : 'Нет'}
        </span>
      )}
    </div>
  );
}
