import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ApiError, availabilityApi, variantsApi } from '../../lib/api-client';
import type { Resource, ResourceInventorySummary, ResourceUnit, ResourceVariant } from '../../types';
import { InventoryParkCard } from '../availability/InventoryParkCard';
import { emptyUnitForm, unitToForm, type UnitForm } from '../availability/availabilityTypes';

interface ResourceParkTabProps {
  resource: Resource;
  onNavigate?: (path: string) => void;
}

export function ResourceParkTab({ resource, onNavigate }: ResourceParkTabProps) {
  const [variants, setVariants] = useState<ResourceVariant[]>([]);
  const [summary, setSummary] = useState<ResourceInventorySummary | null>(null);
  const [units, setUnits] = useState<ResourceUnit[]>([]);
  const [form, setForm] = useState<UnitForm>(emptyUnitForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [unitError, setUnitError] = useState('');

  const loadPark = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextVariants, nextSummary, nextUnits] = await Promise.all([
        variantsApi.list(resource.resourceId),
        availabilityApi.getInventorySummary(resource.resourceId),
        availabilityApi.listUnits(resource.resourceId),
      ]);
      setVariants(nextVariants);
      setSummary(nextSummary);
      setUnits(nextUnits);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось загрузить инвентарь: ${err.message}` : 'Не удалось загрузить инвентарь.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPark();
  }, [resource.resourceId]);

  const saveUnit = async () => {
    setSaving(true);
    setUnitError('');
    try {
      const payload = {
        resourceVariantId: form.resourceVariantId || null,
        inventoryCode: form.inventoryCode.trim() || null,
        displayName: null,
        status: form.status || 'active',
        conditionStatus: form.conditionStatus || 'ready',
        externalReferenceCode: form.externalReferenceCode.trim() || null,
      };
      if (form.unitId) {
        await availabilityApi.patchUnit(resource.resourceId, form.unitId, payload);
      } else {
        await availabilityApi.createUnit(resource.resourceId, payload);
      }
      setForm(emptyUnitForm());
      await loadPark();
      return true;
    } catch (err) {
      setUnitError(err instanceof ApiError ? `Не удалось сохранить велосипед: ${err.message}` : 'Не удалось сохранить велосипед.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const archiveUnit = async (unit: ResourceUnit) => {
    setSaving(true);
    setError('');
    setUnitError('');
    try {
      await availabilityApi.archiveUnit(resource.resourceId, unit.unitId);
      await loadPark();
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось убрать велосипед: ${err.message}` : 'Не удалось убрать велосипед.');
    } finally {
      setSaving(false);
    }
  };

  if (resource.capacityMode === 'scheduled_slot') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
        У этой позиции доступность работает по расписанию. Инвентарь нужен для прокатных позиций.
      </div>
    );
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Загружаем инвентарь...</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      <InventoryParkCard
        variants={variants}
        summary={summary}
        units={units}
        form={form}
        saving={saving}
        error={unitError}
        onFormChange={value => {
          setUnitError('');
          setForm(value);
        }}
        onSave={saveUnit}
        onEdit={unit => setForm(unitToForm(unit))}
        onArchive={unit => void archiveUnit(unit)}
        onNavigate={onNavigate}
      />
    </div>
  );
}
