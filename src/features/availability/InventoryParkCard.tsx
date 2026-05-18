import { useState } from 'react';
import { AlertTriangle, CreditCard as Edit2, Plus, Trash2 } from 'lucide-react';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { IconTooltip } from '../../components/ui/IconTooltip';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import type { ResourceInventorySummary, ResourceUnit, ResourceVariant } from '../../types';
import { emptyUnitForm, type UnitForm } from './availabilityTypes';

interface InventoryParkCardProps {
  variants: ResourceVariant[];
  summary: ResourceInventorySummary | null;
  units: ResourceUnit[];
  form: UnitForm;
  saving: boolean;
  error?: string;
  onFormChange: (value: UnitForm) => void;
  onSave: () => Promise<boolean>;
  onEdit: (unit: ResourceUnit) => void;
  onArchive: (unit: ResourceUnit) => void;
  onNavigate?: (path: string) => void;
}

export function InventoryParkCard({
  variants,
  summary,
  units,
  form,
  saving,
  error = '',
  onFormChange,
  onSave,
  onEdit,
  onArchive,
  onNavigate,
}: InventoryParkCardProps) {
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const variantOptions = [
    { value: '', label: 'Выберите модель' },
    ...variants.map(variant => ({ value: variant.variantId, label: variant.label || variant.title || variant.variantKey })),
  ];
  const warnings = buildInventoryWarnings(variants, summary);
  const readyUnits = summary?.readyUnits ?? 0;

  const openCreateModal = () => {
    onFormChange(emptyUnitForm());
    setUnitModalOpen(true);
  };

  const openEditModal = (unit: ResourceUnit) => {
    onEdit(unit);
    setUnitModalOpen(true);
  };

  const saveFromModal = async () => {
    const saved = await onSave();
    if (saved) setUnitModalOpen(false);
  };

  return (
    <Card>
      <CardHeader
        title="Инвентарь"
        subtitle="Добавьте конкретные велосипеды и привяжите каждый к модели."
        action={
          <div className="flex items-center gap-2">
            <Badge variant={readyUnits > 0 ? 'green' : 'yellow'}>{readyUnits > 0 ? `Готово к прокату: ${readyUnits}` : 'Нет готовых'}</Badge>
            <Button size="sm" variant="primary" onClick={openCreateModal} disabled={variants.length === 0}>
              <Plus size={13} /> Добавить велосипед
            </Button>
          </div>
        }
      />

      <div className="grid gap-2 md:grid-cols-4">
        <Metric label="Всего" value={summary?.totalUnits ?? 0} />
        <Metric label="Готовы" value={summary?.readyUnits ?? 0} />
        <Metric label="В ремонте" value={summary?.maintenanceUnits ?? 0} />
        <Metric label="Без модели" value={summary?.unclassifiedUnits ?? 0} />
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map(warning => (
            <div key={warning} className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>{warning}</span>
              {warning.includes('модел') && (
                <Button size="sm" variant="secondary" onClick={() => onNavigate?.('/variants')}>
                  Открыть модели
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-md border border-gray-100">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Велосипед</th>
              <th className="px-3 py-2 text-left">Модель</th>
              <th className="px-3 py-2 text-left">Готовность</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">Добавьте конкретные велосипеды.</td>
              </tr>
            ) : units.map(unit => {
              const variant = variants.find(item => item.variantId === unit.resourceVariantId);
              const ready = unit.status === 'active' && unit.conditionStatus === 'ready' && Boolean(unit.resourceVariantId);
              return (
                <tr key={unit.unitId} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{unit.displayName || unit.inventoryCode}</p>
                        <p className="truncate text-xs text-gray-500">{unit.inventoryCode || 'Без номера'}</p>
                      </div>
                      <ActionMenu
                        label={`Действия с велосипедом ${unit.inventoryCode || ''}`}
                        disabled={saving}
                        items={[
                          { label: 'Изменить', icon: <Edit2 size={14} />, onClick: () => openEditModal(unit) },
                          { label: 'Убрать', icon: <Trash2 size={14} />, onClick: () => onArchive(unit), danger: true, disabled: saving },
                        ]}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{variant?.label || 'Без модели'}</td>
                  <td className="px-3 py-2">
                    <Badge variant={ready ? 'green' : 'yellow'}>{ready ? 'Готова' : unitReadinessLabel(unit)}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={unitModalOpen}
        onClose={() => {
          if (!saving) setUnitModalOpen(false);
        }}
        title={form.unitId ? 'Изменить велосипед' : 'Добавить велосипед'}
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Select
            label="Модель"
            options={variantOptions}
            value={form.resourceVariantId}
            onChange={event => onFormChange({ ...form, resourceVariantId: event.target.value })}
          />

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">Номер на наклейке</span>
              <IconTooltip label="Что такое номер на наклейке">
                Код, который видит сотрудник на самом велосипеде: наклейка, бирка, гравировка или инвентарный номер.
              </IconTooltip>
            </div>
            <Input value={form.inventoryCode} onChange={event => onFormChange({ ...form, inventoryCode: event.target.value })} placeholder="BIKE-001" />
          </div>

          {form.unitId && (
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label="В инвентаре"
                options={[
                  { value: 'active', label: 'Да, используется' },
                  { value: 'inactive', label: 'Нет, скрыть' },
                  { value: 'retired', label: 'Списана' },
                  { value: 'lost', label: 'Потеряна' },
                ]}
                value={form.status}
                onChange={event => onFormChange({ ...form, status: event.target.value })}
              />
              <Select
                label="Техническое состояние"
                options={[
                  { value: 'ready', label: 'Готова' },
                  { value: 'maintenance', label: 'Ремонт' },
                  { value: 'damaged', label: 'Повреждена' },
                ]}
                value={form.conditionStatus}
                onChange={event => onFormChange({ ...form, conditionStatus: event.target.value })}
              />
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">Внутренний код</span>
              <IconTooltip label="Что такое внутренний код">
                Необязательно. Укажите номер из вашей учетной системы, таблицы или CRM, если ведете отдельный учет.
              </IconTooltip>
            </div>
            <Input value={form.externalReferenceCode} onChange={event => onFormChange({ ...form, externalReferenceCode: event.target.value })} placeholder="ASSET-0091" />
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setUnitModalOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button variant="primary" onClick={() => void saveFromModal()} loading={saving} disabled={variants.length === 0 || !form.resourceVariantId}>
              {form.unitId ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function unitReadinessLabel(unit: ResourceUnit) {
  if (!unit.resourceVariantId) return 'Выберите модель';
  if (unit.status !== 'active') return unit.status === 'inactive' ? 'Скрыта' : unit.status;
  if (unit.conditionStatus === 'maintenance') return 'В ремонте';
  if (unit.conditionStatus === 'damaged') return 'Повреждена';
  if (!unit.conditionStatus) return 'Укажите состояние';
  return 'Не готова';
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function buildInventoryWarnings(variants: ResourceVariant[], summary: ResourceInventorySummary | null) {
  const warnings: string[] = [];
  if (variants.length === 0) warnings.push('Добавьте варианты/модели велосипеда.');
  if ((summary?.totalUnits ?? 0) === 0) warnings.push('Добавьте конкретные велосипеды.');
  if ((summary?.readyUnits ?? 0) === 0) warnings.push('Нет готовых к прокату единиц.');
  if ((summary?.unclassifiedUnits ?? 0) > 0) warnings.push('Есть единицы без привязки к модели.');
  if ((summary?.maintenanceUnits ?? 0) > 0) warnings.push(`В ремонте: ${summary?.maintenanceUnits} ед.`);
  if ((summary?.damagedUnits ?? 0) > 0) warnings.push(`Повреждены: ${summary?.damagedUnits} ед.`);
  return warnings;
}
