import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CreditCard as Edit2, EyeOff, Filter, GripVertical, PackagePlus, RotateCcw, Settings2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ApiError, equipmentApi, variantsApi, type EquipmentAttribute } from '../../lib/api-client';
import type { Resource, ResourceVariant } from '../../types';
import { VariantFormModal, type VariantFormData } from '../variants/VariantFormModal';

type AttributeColumn = {
  key: string;
  label: string;
  visible: boolean;
  sticky: boolean;
};

type SortState = {
  key: string;
  direction: 'asc' | 'desc';
};

type HeaderFlyoutState = {
  key: string;
  label: string;
  position: {
    top: number;
    left: number;
  };
};

const MODEL_TITLE_COLUMN_KEY = '__model_title';
const VARIANT_COLUMNS_STORAGE_PREFIX = 'sportgearhub.variantColumns';
const MODEL_COLUMN_WIDTH = 224;
const ATTRIBUTE_COLUMN_WIDTH = 144;

type StoredVariantColumns = {
  order: string[];
  visible: Record<string, boolean>;
  sticky?: Record<string, boolean>;
};

function variantId(variant: ResourceVariant) {
  return variant.variantId || variant.id;
}

function variantTitle(variant: ResourceVariant) {
  return variant.label || variant.title || variant.variantKey;
}

function variantColumnsStorageKey(resourceType: string | undefined, categorySlug: string | undefined) {
  return `${VARIANT_COLUMNS_STORAGE_PREFIX}.${resourceType || 'equipment'}.${categorySlug || 'unknown'}`;
}

function readStoredVariantColumns(key: string): StoredVariantColumns | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredVariantColumns>;
    if (!Array.isArray(parsed.order) || !parsed.visible || typeof parsed.visible !== 'object') return null;
    return {
      order: parsed.order.filter(item => typeof item === 'string'),
      visible: Object.fromEntries(
        Object.entries(parsed.visible).filter(([, value]) => typeof value === 'boolean')
      ) as Record<string, boolean>,
      sticky: Object.fromEntries(
        Object.entries(parsed.sticky ?? {}).filter(([, value]) => typeof value === 'boolean')
      ) as Record<string, boolean>,
    };
  } catch {
    return null;
  }
}

function writeStoredVariantColumns(key: string, columns: AttributeColumn[]) {
  try {
    const payload: StoredVariantColumns = {
      order: columns.map(column => column.key),
      visible: Object.fromEntries(columns.map(column => [column.key, column.visible])),
      sticky: Object.fromEntries(columns.map(column => [column.key, column.sticky])),
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Display settings are a convenience; blocked storage should not break the table.
  }
}

function buildAttributeColumns(attributes: EquipmentAttribute[], stored: StoredVariantColumns | null) {
  const attributeByKey = new Map(attributes.map(attribute => [attribute.key, attribute]));
  const orderedKeys = stored
    ? [
      ...stored.order.filter(key => attributeByKey.has(key)),
      ...attributes.map(attribute => attribute.key).filter(key => !stored.order.includes(key)),
    ]
    : attributes.map(attribute => attribute.key);

  return orderedKeys
    .map((key, index) => {
      const attribute = attributeByKey.get(key);
      if (!attribute) return null;
      return {
        key: attribute.key,
        label: attribute.label,
        visible: stored?.visible[attribute.key] ?? index < 5,
        sticky: stored?.sticky?.[attribute.key] ?? false,
      };
    })
    .filter((column): column is AttributeColumn => Boolean(column));
}

interface ResourceModelsTabProps {
  resource: Resource;
  onNavigate?: (path: string) => void;
}

export function ResourceModelsTab({ resource, onNavigate }: ResourceModelsTabProps) {
  const [variants, setVariants] = useState<ResourceVariant[]>([]);
  const [schemaAttributes, setSchemaAttributes] = useState<EquipmentAttribute[]>([]);
  const [attributeColumns, setAttributeColumns] = useState<AttributeColumn[]>([]);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>({ key: 'sortOrder', direction: 'asc' });
  const [headerFlyout, setHeaderFlyout] = useState<HeaderFlyoutState | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [editTarget, setEditTarget] = useState<ResourceVariant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const settingsStorageKey = variantColumnsStorageKey(resource.resourceType, resource.category?.slug);

  const loadVariants = async () => {
    setLoading(true);
    setError('');
    try {
      const nextVariants = await variantsApi.list(resource.resourceId);
      setVariants(nextVariants.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось загрузить модели: ${err.message}` : 'Не удалось загрузить модели.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVariants();
  }, [resource.resourceId]);

  useEffect(() => {
    let cancelled = false;
    const categorySlug = resource.category?.slug;
    if (!categorySlug) {
      setSchemaAttributes([]);
      setAttributeColumns([]);
      return;
    }

    equipmentApi.resourceCategoryAttributes(resource.resourceType || 'equipment', categorySlug)
      .then(schema => {
        if (cancelled) return;
        const nextAttributes = schema.attributes
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder);
        setSchemaAttributes(nextAttributes);
        setAttributeColumns(buildAttributeColumns(nextAttributes, readStoredVariantColumns(settingsStorageKey)));
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? `Не удалось загрузить поля моделей: ${err.message}` : 'Не удалось загрузить поля моделей.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resource.category?.slug, resource.resourceType, settingsStorageKey]);

  useEffect(() => {
    if (!resource.category?.slug || attributeColumns.length === 0) return;
    writeStoredVariantColumns(settingsStorageKey, attributeColumns);
  }, [attributeColumns, resource.category?.slug, settingsStorageKey]);

  const handleSave = async (data: VariantFormData) => {
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        const nextVariant = await variantsApi.patch(resource.resourceId, variantId(editTarget), {
          variantKey: data.variantKey,
          label: data.label,
          status: data.status,
          attributes: data.attributes,
        });
        setVariants(prev => prev.map(variant => (variantId(variant) === variantId(nextVariant) ? nextVariant : variant)));
      } else {
        const nextVariant = await variantsApi.create(resource.resourceId, {
          variantKey: data.variantKey,
          label: data.label,
          attributes: data.attributes,
          sortOrder: variants.length + 1,
          status: data.status,
        });
        setVariants(prev => [...prev, nextVariant].sort((a, b) => a.sortOrder - b.sortOrder));
      }

      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось сохранить модель: ${err.message}` : 'Не удалось сохранить модель.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (variant: ResourceVariant) => {
    const nextStatus = variant.status === 'active' ? 'inactive' : 'active';
    setSaving(true);
    setError('');
    try {
      const nextVariant = await variantsApi.patch(resource.resourceId, variantId(variant), { status: nextStatus });
      setVariants(prev => prev.map(item => (variantId(item) === variantId(nextVariant) ? nextVariant : item)));
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось изменить статус модели: ${err.message}` : 'Не удалось изменить статус модели.');
    } finally {
      setSaving(false);
    }
  };

  const visibleColumns = attributeColumns.filter(column => column.visible);
  const stickyLeftByColumnKey = new Map<string, number>();
  let nextStickyLeft = MODEL_COLUMN_WIDTH;
  visibleColumns.forEach(column => {
    if (!column.sticky) return;
    stickyLeftByColumnKey.set(column.key, nextStickyLeft);
    nextStickyLeft += ATTRIBUTE_COLUMN_WIDTH;
  });
  const schemaByKey = Object.fromEntries(schemaAttributes.map(attribute => [attribute.key, attribute]));
  const filteredAndSorted = variants
    .filter(variant => {
      const attributes = variant.attributes ?? {};
      return Object.entries(filters).every(([key, value]) => {
        if (!value.trim()) return true;
        const raw = key === MODEL_TITLE_COLUMN_KEY
          ? variantTitle(variant)
          : key === 'status'
            ? variant.status
            : String(attributes[key] ?? '');
        return raw.toLowerCase().includes(value.toLowerCase());
      });
    })
    .sort((left, right) => {
      const leftValue = sortableValue(left, sort.key);
      const rightValue = sortableValue(right, sort.key);
      const result = leftValue.localeCompare(rightValue, 'ru', { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? result : -result;
    });

  const openHeaderFlyout = (event: MouseEvent<HTMLButtonElement>, key: string, label: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHeaderFlyout({
      key,
      label,
      position: {
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.left), window.innerWidth - 288),
      },
    });
  };

  const selectedVariant = variants.find(variant => variantId(variant) === selectedVariantId) ?? null;

  const moveDraggedColumn = (targetKey: string) => {
    if (!draggedColumnKey || draggedColumnKey === targetKey) return;
    setAttributeColumns(current => {
      const draggedIndex = current.findIndex(column => column.key === draggedColumnKey);
      const targetIndex = current.findIndex(column => column.key === targetKey);
      if (draggedIndex < 0 || targetIndex < 0) return current;
      const next = current.slice();
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  };

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="px-3 py-2">
        <CardHeader
          title="Модели"
          className="mb-0 items-center"
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => onNavigate?.('/variants')}>
                Все модели
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setColumnSettingsOpen(true)}>
                <Settings2 size={13} /> Колонки
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setEditTarget(null);
                  setShowForm(true);
                }}
              >
                <PackagePlus size={13} /> Добавить
              </Button>
            </div>
          }
        />

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        {selectedVariant && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-blue-50 px-4 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-blue-950">{variantTitle(selectedVariant)}</p>
              <p className="text-xs text-blue-700">Выбрана модель</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditTarget(selectedVariant);
                  setShowForm(true);
                }}
              >
                <Edit2 size={13} /> Изменить
              </Button>
              <Button size="sm" variant="secondary" disabled={saving} onClick={() => void toggleStatus(selectedVariant)}>
                {selectedVariant.status === 'active' ? <EyeOff size={13} /> : <RotateCcw size={13} />}
                {selectedVariant.status === 'active' ? 'Скрыть' : 'Включить'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedVariantId('')}>
                Снять выбор
              </Button>
            </div>
          </div>
        )}
        <table className="w-full min-w-[980px] table-fixed text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <ColumnHeader
                className="sticky left-0 z-30 w-56 border-r border-gray-200 bg-gray-50"
                label="Модель"
                active={sort.key === MODEL_TITLE_COLUMN_KEY}
                filtered={Boolean(filters[MODEL_TITLE_COLUMN_KEY]?.trim())}
                direction={sort.direction}
                onClick={event => openHeaderFlyout(event, MODEL_TITLE_COLUMN_KEY, 'Модель')}
              />
              {visibleColumns.map(column => (
                <ColumnHeader
                  key={column.key}
                  className={`w-36 ${column.sticky ? 'sticky z-20 border-r border-gray-200 bg-gray-50' : ''}`}
                  style={column.sticky ? { left: stickyLeftByColumnKey.get(column.key) ?? MODEL_COLUMN_WIDTH } : undefined}
                  label={column.label}
                  active={sort.key === column.key}
                  filtered={Boolean(filters[column.key]?.trim())}
                  direction={sort.direction}
                  onClick={event => openHeaderFlyout(event, column.key, column.label)}
                />
              ))}
              <ColumnHeader
                className="w-28"
                label="Статус"
                active={sort.key === 'status'}
                filtered={Boolean(filters.status?.trim())}
                direction={sort.direction}
                onClick={event => openHeaderFlyout(event, 'status', 'Статус')}
              />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-4 py-10 text-center text-sm text-gray-500">Загружаем модели...</td>
              </tr>
            ) : filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-4 py-10 text-center text-sm text-gray-500">
                  Модели не найдены.
                </td>
              </tr>
            ) : filteredAndSorted.map(variant => {
              const selected = selectedVariantId === variantId(variant);
              return (
              <tr
                key={variantId(variant)}
                onClick={() => setSelectedVariantId(current => current === variantId(variant) ? '' : variantId(variant))}
                className={`cursor-pointer border-t border-gray-100 transition ${selected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <td className={`sticky left-0 z-20 border-r border-gray-100 px-4 py-2.5 ${selected ? 'bg-blue-50' : 'bg-white'}`}>
                  <p className="truncate font-medium text-gray-900">{variantTitle(variant)}</p>
                  <p className="truncate text-xs text-gray-500">Порядок: {variant.sortOrder}</p>
                </td>
                {visibleColumns.map(column => (
                  <td
                    key={column.key}
                    className={`px-4 py-2.5 text-sm text-gray-700 ${column.sticky ? `sticky z-10 border-r border-gray-100 ${selected ? 'bg-blue-50' : 'bg-white'}` : ''}`}
                    style={column.sticky ? { left: stickyLeftByColumnKey.get(column.key) ?? MODEL_COLUMN_WIDTH } : undefined}
                  >
                    <span className="block truncate">{formatAttributeValue(variant.attributes?.[column.key], schemaByKey[column.key])}</span>
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <Badge variant={variant.status === 'active' ? 'green' : 'gray'}>
                    {variant.status === 'active' ? 'Активно' : 'Скрыто'}
                  </Badge>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {headerFlyout && (
        <ColumnFilterFlyout
          label={headerFlyout.label}
          position={headerFlyout.position}
          value={filters[headerFlyout.key] ?? ''}
          activeDirection={sort.key === headerFlyout.key ? sort.direction : null}
          onChange={value => setFilters(current => ({ ...current, [headerFlyout.key]: value }))}
          onSort={direction => {
            setSort({ key: headerFlyout.key, direction });
            setHeaderFlyout(null);
          }}
          onClear={() => setFilters(current => ({ ...current, [headerFlyout.key]: '' }))}
          onClose={() => setHeaderFlyout(null)}
        />
      )}

      <VariantFormModal
        open={showForm}
        variant={editTarget}
        resources={[resource]}
        initialResourceId={resource.resourceId}
        schemaAttributes={schemaAttributes}
        saving={saving}
        onSave={data => void handleSave(data)}
        onClose={() => {
          setShowForm(false);
          setEditTarget(null);
        }}
      />

      <Modal open={columnSettingsOpen} onClose={() => setColumnSettingsOpen(false)} title="Настроить колонки" size="md">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Перетащите поля, чтобы изменить порядок колонок.</p>
          <div className="space-y-1">
            {attributeColumns.map(column => (
              <label
                key={column.key}
                draggable
                onDragStart={() => setDraggedColumnKey(column.key)}
                onDragOver={event => {
                  event.preventDefault();
                  moveDraggedColumn(column.key);
                }}
                onDragEnd={() => setDraggedColumnKey(null)}
                className="flex cursor-grab items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm active:cursor-grabbing"
              >
                <GripVertical size={14} className="text-gray-400" />
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={event => setAttributeColumns(current => current.map(item => item.key === column.key ? { ...item, visible: event.target.checked } : item))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="min-w-0 flex-1 truncate text-gray-900">{column.label}</span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={column.sticky}
                    disabled={!column.visible}
                    onChange={event => setAttributeColumns(current => current.map(item => item.key === column.key ? { ...item, sticky: event.target.checked } : item))}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                  Закрепить
                </span>
                <span className="font-mono text-xs text-gray-400">{column.key}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-3">
            <Button size="sm" variant="primary" onClick={() => setColumnSettingsOpen(false)}>
              Готово
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function sortableValue(variant: ResourceVariant, key: string) {
  if (key === MODEL_TITLE_COLUMN_KEY) return variantTitle(variant);
  if (key === 'status') return variant.status;
  if (key === 'sortOrder') return String(variant.sortOrder).padStart(5, '0');
  return String(variant.attributes?.[key] ?? '');
}

function formatAttributeValue(value: unknown, schema?: EquipmentAttribute) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const allowedValue = schema?.allowedValues.find(option => option.valueKey === raw);
  const label = allowedValue?.label ?? raw;
  return schema?.unitLabel ? `${label} ${schema.unitLabel}` : label;
}

function ColumnHeader({
  label,
  active,
  filtered,
  direction,
  onClick,
  className = '',
  style,
}: {
  label: string;
  active: boolean;
  filtered: boolean;
  direction: 'asc' | 'desc';
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <th className={`px-4 py-2 text-left ${className}`} style={style}>
      <button
        type="button"
        onClick={onClick}
        className={`group flex min-w-0 max-w-full items-center gap-1 rounded px-1.5 py-1 font-medium transition ${
          active || filtered ? 'text-blue-700 hover:bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
        }`}
      >
        <span className="truncate">{label}</span>
        {active && (direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${
          filtered
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-400 opacity-0 group-hover:opacity-100'
        }`}>
          <Filter size={12} />
        </span>
      </button>
    </th>
  );
}

function ColumnFilterFlyout({
  label,
  position,
  value,
  activeDirection,
  onChange,
  onSort,
  onClear,
  onClose,
}: {
  label: string;
  position: { top: number; left: number };
  value: string;
  activeDirection: 'asc' | 'desc' | null;
  onChange: (value: string) => void;
  onSort: (direction: 'asc' | 'desc') => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg"
        style={{ top: position.top, left: position.left }}
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-gray-900">{label}</p>
          {value.trim() && (
            <button type="button" onClick={onClear} className="text-xs font-medium text-blue-700 hover:text-blue-900">
              Сбросить
            </button>
          )}
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSort('asc')}
            className={`flex h-9 items-center justify-center gap-1 rounded-md border text-xs font-medium transition ${
              activeDirection === 'asc'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowUp size={13} /> По возрастанию
          </button>
          <button
            type="button"
            onClick={() => onSort('desc')}
            className={`flex h-9 items-center justify-center gap-1 rounded-md border text-xs font-medium transition ${
              activeDirection === 'desc'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowDown size={13} /> По убыванию
          </button>
        </div>
        <Input autoFocus value={value} onChange={event => onChange(event.target.value)} placeholder="Фильтр по колонке" />
      </div>
    </>
  );
}
