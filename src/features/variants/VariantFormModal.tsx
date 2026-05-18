import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { ApiError, equipmentApi, type EquipmentAttribute } from '../../lib/api-client';
import type { Resource, ResourceVariant } from '../../types';
import {
  pruneHiddenVariantAttributes,
  VariantAttributeBuilder,
  visibleVariantAttributes,
} from './VariantAttributeBuilder';

export type VariantFormData = {
  resourceId: string;
  variantKey: string;
  label: string;
  status: 'active' | 'inactive';
  attributes: Record<string, string>;
};

function toVariantFormData(
  variant: ResourceVariant | null,
  initialResourceId: string,
  fallbackSortOrder: number
): VariantFormData & { sortOrder: number } {
  return {
    resourceId: variant?.resourceId || initialResourceId,
    variantKey: variant?.variantKey || '',
    label: variant?.label || variant?.title || '',
    status: variant?.status === 'inactive' ? 'inactive' : 'active',
    attributes: variant?.attributes ?? Object.fromEntries((variant?.normalizedAttributes ?? []).map(attribute => [attribute.key, attribute.value])),
    sortOrder: variant?.sortOrder ?? fallbackSortOrder,
  };
}

interface VariantFormModalProps {
  open: boolean;
  variant: ResourceVariant | null;
  resources: Resource[];
  initialResourceId: string;
  schemaAttributes?: EquipmentAttribute[];
  saving: boolean;
  onSave: (data: VariantFormData) => void;
  onClose: () => void;
}

export function VariantFormModal({
  open,
  variant,
  resources,
  initialResourceId,
  schemaAttributes,
  saving,
  onSave,
  onClose,
}: VariantFormModalProps) {
  const [resourceId, setResourceId] = useState('');
  const [variantKey, setVariantKey] = useState('');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [loadedSchemaAttributes, setLoadedSchemaAttributes] = useState<EquipmentAttribute[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState('');

  const resourceOptions = [
    { value: '', label: 'Выберите позицию' },
    ...resources.map(resource => ({ value: resource.resourceId, label: resource.title })),
  ];
  const selectedResource = resources.find(resource => resource.resourceId === resourceId);
  const effectiveSchemaAttributes = schemaAttributes ?? loadedSchemaAttributes;
  const visibleAttributes = visibleVariantAttributes(effectiveSchemaAttributes, attributes);

  useEffect(() => {
    const initial = toVariantFormData(variant, initialResourceId, 1);
    setResourceId(initial.resourceId);
    setVariantKey(initial.variantKey);
    setLabel(initial.label);
    setStatus(initial.status);
    setAttributes(initial.attributes);
  }, [variant, initialResourceId, open]);

  useEffect(() => {
    if (schemaAttributes || !selectedResource?.category?.slug) {
      setLoadedSchemaAttributes([]);
      setSchemaError('');
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError('');

    equipmentApi.resourceCategoryAttributes(selectedResource.resourceType || 'equipment', selectedResource.category.slug)
      .then(schema => {
        if (!cancelled) {
          setLoadedSchemaAttributes(schema.attributes.slice().sort((a, b) => a.sortOrder - b.sortOrder));
        }
      })
      .catch(err => {
        if (!cancelled) {
          setLoadedSchemaAttributes([]);
          setSchemaError(err instanceof ApiError ? `Не удалось загрузить поля модели: ${err.message}` : 'Не удалось загрузить поля модели.');
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schemaAttributes, selectedResource?.category?.slug, selectedResource?.resourceType]);

  const updateAttribute = (key: string, value: string) => {
    setAttributes(current => pruneHiddenVariantAttributes(effectiveSchemaAttributes, {
      ...current,
      [key]: value,
    }));
  };

  const handleSave = () => {
    const cleanAttributes = Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [key, String(value ?? '').trim()]).filter(([, value]) => value)
    );
    const generatedLabel = [
      cleanAttributes.brand_name || cleanAttributes.brand,
      cleanAttributes.model,
      cleanAttributes.frame_size,
      cleanAttributes.wheel_size_in,
    ].filter(Boolean).join(' / ');
    const nextLabel = label.trim() || generatedLabel || 'Новая модель';
    const nextKey = variantKey.trim() || nextLabel
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase();

    onSave({
      resourceId,
      variantKey: nextKey || `MODEL-${Date.now()}`,
      label: nextLabel,
      status,
      attributes: cleanAttributes,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={variant ? 'Редактировать модель' : 'Добавить модель'}>
      <div className="space-y-3">
        <Select
          label="Инвентарь"
          options={resourceOptions}
          value={resourceId}
          onChange={event => {
            setResourceId(event.target.value);
            setAttributes({});
          }}
        />
        <Input label="Название модели (если нужно переопределить)" value={label} onChange={event => setLabel(event.target.value)} placeholder="Например: Trek Marlin / M / 26" />
        <Select
          label="Статус"
          options={[
            { value: 'active', label: 'Активно' },
            { value: 'inactive', label: 'Неактивно' },
          ]}
          value={status}
          onChange={event => setStatus(event.target.value as 'active' | 'inactive')}
        />
        <details className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-600">Технический ключ</summary>
          <Input className="mt-2" value={variantKey} onChange={event => setVariantKey(event.target.value)} placeholder="Заполнится автоматически" />
        </details>
        {schemaLoading && <p className="text-xs text-gray-500">Загружаем поля модели...</p>}
        {schemaError && <p className="text-xs text-red-600">{schemaError}</p>}
        {!schemaLoading && !schemaError && (
          <VariantAttributeBuilder
            attributes={visibleAttributes}
            values={attributes}
            onChange={updateAttribute}
          />
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="primary" onClick={handleSave} loading={saving}>{variant ? 'Сохранить' : 'Создать'}</Button>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </Modal>
  );
}
