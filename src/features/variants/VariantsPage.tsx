import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CreditCard as Edit2,
  PackagePlus,
  Search,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ApiError, resourcesApi, variantsApi } from '../../lib/api-client';
import type { NormalizedAttribute, Resource, ResourceVariant } from '../../types';

type VariantFormData = {
  resourceId: string;
  variantKey: string;
  label: string;
  status: 'active' | 'inactive';
  normalizedAttributes: NormalizedAttribute[];
};

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активно' },
  { value: 'inactive', label: 'Неактивно' },
];

function variantId(variant: ResourceVariant) {
  return variant.variantId || variant.id;
}

function variantTitle(variant: ResourceVariant) {
  return variant.label || variant.title || variant.variantKey;
}

function attributesRecord(attributes: NormalizedAttribute[] | undefined) {
  return Object.fromEntries((attributes ?? []).map(attribute => [attribute.key, attribute.value]));
}

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
    normalizedAttributes: variant?.normalizedAttributes ?? [],
    sortOrder: variant?.sortOrder ?? fallbackSortOrder,
  };
}

export function VariantsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [variants, setVariants] = useState<ResourceVariant[]>([]);
  const [resourceFilter, setResourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ResourceVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const mutationInFlightRef = useRef(false);

  const resourceOptions = useMemo(
    () => [
      { value: '', label: 'Все ресурсы' },
      ...resources.map(resource => ({ value: resource.resourceId, label: resource.title })),
    ],
    [resources]
  );

  const resourceById = useMemo(
    () => new Map(resources.map(resource => [resource.resourceId, resource])),
    [resources]
  );

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const nextResources = await resourcesApi.list();
      const variantGroups = await Promise.all(
        nextResources.map(resource =>
          variantsApi.list(resource.resourceId)
            .then(items => items.map(variant => ({ ...variant, resourceId: variant.resourceId || resource.resourceId })))
        )
      );
      setResources(nextResources);
      setVariants(variantGroups.flat());
    } catch (err) {
      setError(err instanceof ApiError
        ? `Не удалось загрузить варианты из API: ${err.message}`
        : 'Не удалось загрузить варианты из API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = variants.filter(variant => {
    const matchesResource = !resourceFilter || variant.resourceId === resourceFilter;
    const matchesStatus = !statusFilter || variant.status === statusFilter;
    const resourceTitle = resourceById.get(variant.resourceId)?.title ?? '';
    const haystack = [
      variantTitle(variant),
      variant.variantKey,
      resourceTitle,
      ...variant.normalizedAttributes.flatMap(attribute => [attribute.key, attribute.value]),
    ].join(' ').toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    return matchesResource && matchesStatus && matchesQuery;
  });

  const resourceOf = (id: string) => resourceById.get(id)?.title || id || 'Не выбран';

  const updateVariantInState = (nextVariant: ResourceVariant) => {
    setVariants(prev =>
      prev.map(variant => (variantId(variant) === variantId(nextVariant) ? nextVariant : variant))
    );
  };

  const toggle = async (variant: ResourceVariant) => {
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    const nextStatus = variant.status === 'active' ? 'inactive' : 'active';
    setSaving(true);
    setError('');
    try {
      const nextVariant = await variantsApi.patch(variant.resourceId, variantId(variant), { status: nextStatus });
      updateVariantInState(nextVariant);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось обновить статус: ${err.message}` : 'Не удалось обновить статус.');
    } finally {
      setSaving(false);
      mutationInFlightRef.current = false;
    }
  };

  const moveOrder = async (variant: ResourceVariant, direction: 1 | -1) => {
    if (mutationInFlightRef.current) return;
    const siblings = variants
      .filter(item => item.resourceId === variant.resourceId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex(item => variantId(item) === variantId(variant));
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;

    const target = siblings[index];
    const neighbor = siblings[nextIndex];
    mutationInFlightRef.current = true;
    setSaving(true);
    setError('');
    try {
      const [nextTarget, nextNeighbor] = await Promise.all([
        variantsApi.patch(target.resourceId, variantId(target), { sortOrder: neighbor.sortOrder }),
        variantsApi.patch(neighbor.resourceId, variantId(neighbor), { sortOrder: target.sortOrder }),
      ]);
      setVariants(prev =>
        prev.map(item => {
          if (variantId(item) === variantId(nextTarget)) return nextTarget;
          if (variantId(item) === variantId(nextNeighbor)) return nextNeighbor;
          return item;
        })
      );
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось изменить порядок: ${err.message}` : 'Не удалось изменить порядок.');
    } finally {
      setSaving(false);
      mutationInFlightRef.current = false;
    }
  };

  const handleSave = async (data: VariantFormData) => {
    if (mutationInFlightRef.current) return;
    if (!data.resourceId) {
      setError('Выберите ресурс для варианта.');
      return;
    }

    mutationInFlightRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        const nextVariant = await variantsApi.patch(editTarget.resourceId, variantId(editTarget), {
          variantKey: data.variantKey,
          label: data.label,
          status: data.status,
          normalizedAttributes: data.normalizedAttributes,
        });
        updateVariantInState(nextVariant);
      } else {
        const sortOrder = variants.filter(variant => variant.resourceId === data.resourceId).length + 1;
        const nextVariant = await variantsApi.create(data.resourceId, {
          variantKey: data.variantKey,
          label: data.label,
          normalizedAttributes: data.normalizedAttributes,
          sortOrder,
          status: data.status,
        });
        setVariants(prev => [...prev, nextVariant]);
      }

      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setError(err instanceof ApiError
        ? `Не удалось сохранить вариант: ${err.message}`
        : 'Не удалось сохранить вариант.');
    } finally {
      setSaving(false);
      mutationInFlightRef.current = false;
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Варианты</h2>
            <p className="text-xs text-gray-500">
              Строк: {filtered.length} · всего: {variants.length}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditTarget(null);
              setShowForm(true);
            }}
            disabled={resources.length === 0}
          >
            <PackagePlus size={13} /> Добавить
          </Button>
        </div>

        {error && <VariantsError message={error} />}

        <Card className="p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Поиск по названию, ключу, ресурсу, атрибуту..."
                className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <Select options={resourceOptions} value={resourceFilter} onChange={event => setResourceFilter(event.target.value)} />
            <Select options={statusOptions} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} />
          </div>
        </Card>

        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 border-b border-r border-gray-100 bg-gray-50 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Вариант
                  </th>
                  <th className="border-b border-gray-100 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Ресурс
                  </th>
                  <th className="border-b border-gray-100 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Ключ
                  </th>
                  <th className="border-b border-gray-100 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Атрибуты
                  </th>
                  <th className="border-b border-gray-100 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Статус
                  </th>
                  <th className="border-b border-gray-100 px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Порядок
                  </th>
                  <th className="border-b border-gray-100 px-3 py-1.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                      Загружаем варианты...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                      Варианты не найдены.
                    </td>
                  </tr>
                ) : (
                  filtered.map(variant => {
                    const siblings = filtered.filter(item => item.resourceId === variant.resourceId);
                    const siblingIndex = siblings.findIndex(item => variantId(item) === variantId(variant));
                    const attrs = attributesRecord(variant.normalizedAttributes);
                    return (
                      <tr key={variantId(variant)} className="hover:bg-gray-50/70">
                        <td className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{variantTitle(variant)}</p>
                            <p className="text-[11px] text-gray-500">#{variantId(variant)}</p>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                          {resourceOf(variant.resourceId)}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-xs font-mono text-gray-600">
                          {variant.variantKey || '—'}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(attrs).length === 0 ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : Object.entries(attrs).map(([key, value]) => (
                              <span key={key} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <Badge variant={variant.status === 'active' ? 'green' : 'gray'}>
                            {variant.status === 'active' ? 'Активно' : 'Неактивно'}
                          </Badge>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => void moveOrder(variant, -1)}
                              disabled={saving || siblingIndex === 0}
                              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <span className="min-w-8 text-center text-xs text-gray-500">{variant.sortOrder}</span>
                            <button
                              type="button"
                              onClick={() => void moveOrder(variant, 1)}
                              disabled={saving || siblingIndex === siblings.length - 1}
                              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditTarget(variant);
                                setShowForm(true);
                              }}
                              className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggle(variant)}
                              disabled={saving}
                              className="rounded-md border border-gray-200 bg-white p-1 text-gray-500 transition hover:text-emerald-600 disabled:opacity-50"
                              title={variant.status === 'active' ? 'Деактивировать' : 'Активировать'}
                            >
                              {variant.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <VariantFormModal
          open={showForm}
          variant={editTarget}
          resources={resources}
          initialResourceId={resourceFilter}
          saving={saving}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
        />
      </div>
    </div>
  );
}

function VariantFormModal({
  open,
  variant,
  resources,
  initialResourceId,
  saving,
  onSave,
  onClose,
}: {
  open: boolean;
  variant: ResourceVariant | null;
  resources: Resource[];
  initialResourceId: string;
  saving: boolean;
  onSave: (data: VariantFormData) => void;
  onClose: () => void;
}) {
  const [resourceId, setResourceId] = useState('');
  const [variantKey, setVariantKey] = useState('');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [attrKey, setAttrKey] = useState('');
  const [attrValue, setAttrValue] = useState('');

  const resourceOptions = [
    { value: '', label: 'Выберите ресурс' },
    ...resources.map(resource => ({ value: resource.resourceId, label: resource.title })),
  ];

  useEffect(() => {
    const initial = toVariantFormData(variant, initialResourceId, 1);
    setResourceId(initial.resourceId);
    setVariantKey(initial.variantKey);
    setLabel(initial.label);
    setStatus(initial.status);
    setAttrKey(initial.normalizedAttributes[0]?.key ?? '');
    setAttrValue(initial.normalizedAttributes[0]?.value ?? '');
  }, [variant, initialResourceId, open]);

  const handleSave = () => {
    const normalizedAttributes = attrKey && attrValue
      ? [{ key: attrKey.trim(), value: attrValue.trim() }]
      : [];

    onSave({
      resourceId,
      variantKey: variantKey.trim(),
      label: label.trim(),
      status,
      normalizedAttributes,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={variant ? 'Редактировать вариант' : 'Добавить вариант'}>
      <div className="space-y-3">
        <Select
          label="Ресурс"
          options={resourceOptions}
          value={resourceId}
          onChange={event => setResourceId(event.target.value)}
        />
        <Input label="Ключ" value={variantKey} onChange={event => setVariantKey(event.target.value)} placeholder="TREK-MARLIN-M" />
        <Input label="Название" value={label} onChange={event => setLabel(event.target.value)} placeholder="Trek Marlin / M" />
        <Select
          label="Статус"
          options={[
            { value: 'active', label: 'Активно' },
            { value: 'inactive', label: 'Неактивно' },
          ]}
          value={status}
          onChange={event => setStatus(event.target.value as 'active' | 'inactive')}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Атрибут" value={attrKey} onChange={event => setAttrKey(event.target.value)} placeholder="frame_size" />
          <Input label="Значение" value={attrValue} onChange={event => setAttrValue(event.target.value)} placeholder="M" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="primary" onClick={handleSave} loading={saving}>{variant ? 'Сохранить' : 'Создать'}</Button>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </Modal>
  );
}

function VariantsError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <AlertTriangle size={14} className="shrink-0 text-red-600" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}
