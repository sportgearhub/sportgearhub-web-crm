import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CreditCard as Edit2,
  PackagePlus,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { VariantFormModal, type VariantFormData } from './VariantFormModal';
import { ApiError, resourcesApi, variantsApi } from '../../lib/api-client';
import type { Resource, ResourceVariant } from '../../types';

type SortColumn = 'variant' | 'resource' | 'key' | 'status' | 'order' | null;
type SortOrder = 'asc' | 'desc';

interface ColumnFlyoutState {
  column: string | null;
  position: { top: number; left: number } | null;
}

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

export function VariantsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [variants, setVariants] = useState<ResourceVariant[]>([]);
  const [resourceFilter, setResourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('resource');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [flyoutState, setFlyoutState] = useState<ColumnFlyoutState>({ column: null, position: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ResourceVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const mutationInFlightRef = useRef(false);

  const resourceOptions = useMemo(
    () => [
      { value: '', label: 'Весь инвентарь' },
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
        ? `Не удалось загрузить модели из API: ${err.message}`
        : 'Не удалось загрузить модели из API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => variants.filter(variant => {
    const matchesResource = !resourceFilter || variant.resourceId === resourceFilter;
    const matchesStatus = !statusFilter || variant.status === statusFilter;
    const resourceTitle = resourceById.get(variant.resourceId)?.title ?? '';
    return matchesResource && matchesStatus;
  }), [resourceById, resourceFilter, statusFilter, variants]);

  const sorted = useMemo(() => {
    const result = [...filtered];

    if (sortColumn) {
      result.sort((a, b) => {
        let left: number | string = 0;
        let right: number | string = 0;

        switch (sortColumn) {
          case 'variant':
            left = variantTitle(a);
            right = variantTitle(b);
            break;
          case 'resource':
            left = resourceById.get(a.resourceId)?.title ?? '';
            right = resourceById.get(b.resourceId)?.title ?? '';
            break;
          case 'key':
            left = a.variantKey ?? '';
            right = b.variantKey ?? '';
            break;
          case 'status':
            left = a.status;
            right = b.status;
            break;
          case 'order':
            left = a.sortOrder;
            right = b.sortOrder;
            break;
        }

        if (typeof left === 'string' && typeof right === 'string') {
          return sortOrder === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
        }

        return sortOrder === 'asc' ? (left as number) - (right as number) : (right as number) - (left as number);
      });
    }

    return result;
  }, [filtered, resourceById, sortColumn, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, resourceFilter, sortColumn, sortOrder, statusFilter]);

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

  const handleColumnOpen = (event: MouseEvent, column: string) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 240);
    setFlyoutState({
      column,
      position: { top: rect.bottom + 6, left: Math.max(8, left) },
    });
  };

  const handleSort = (column: SortColumn, order?: SortOrder) => {
    setSortColumn(column);
    setSortOrder(order ?? (sortColumn === column && sortOrder === 'asc' ? 'desc' : 'asc'));
    setFlyoutState({ column: null, position: null });
  };

  const handleSave = async (data: VariantFormData) => {
    if (mutationInFlightRef.current) return;
    if (!data.resourceId) {
      setError('Выберите позицию для модели.');
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
          attributes: data.attributes,
        });
        updateVariantInState(nextVariant);
      } else {
        const sortOrder = variants.filter(variant => variant.resourceId === data.resourceId).length + 1;
        const nextVariant = await variantsApi.create(data.resourceId, {
          variantKey: data.variantKey,
          label: data.label,
          attributes: data.attributes,
          sortOrder,
          status: data.status,
        });
        setVariants(prev => [...prev, nextVariant]);
      }

      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setError(err instanceof ApiError
        ? `Не удалось сохранить модель: ${err.message}`
        : 'Не удалось сохранить модель.');
    } finally {
      setSaving(false);
      mutationInFlightRef.current = false;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Модели</h1>
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
      </nav>

      <div className="relative flex-1 overflow-auto bg-white">
        {error && <VariantsError message={error} />}

          <div className="overflow-x-auto">
            <table className="w-[1120px] table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-64" />
                <col className="w-56" />
                <col className="w-48" />
                <col className="w-72" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-24" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 border-b border-r border-gray-100 bg-gray-50 px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={event => handleColumnOpen(event, 'variant')}
                      className="flex items-center gap-1 rounded px-1.5 py-1 transition hover:bg-gray-200"
                    >
                      Модель
                      <ChevronDown size={13} className={sortColumn === 'variant' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'variant'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сортировать А-Я', value: 'asc' },
                        { label: 'Сортировать Я-А', value: 'desc' },
                      ]}
                      activeOrder={sortColumn === 'variant' ? sortOrder : null}
                      onSort={order => handleSort('variant', order)}
                    />
                  </th>
                  <th className="border-b border-gray-100 px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={event => handleColumnOpen(event, 'resource')}
                      className="flex items-center gap-1 rounded px-1.5 py-1 transition hover:bg-gray-200"
                    >
                      Инвентарь
                      <ChevronDown size={13} className={resourceFilter || sortColumn === 'resource' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ResourceFilterFlyout
                      isOpen={flyoutState.column === 'resource'}
                      position={flyoutState.position}
                      value={resourceFilter}
                      options={resourceOptions}
                      activeOrder={sortColumn === 'resource' ? sortOrder : null}
                      onChange={value => {
                        setResourceFilter(value);
                        setFlyoutState({ column: null, position: null });
                      }}
                      onSort={order => handleSort('resource', order)}
                    />
                  </th>
                  <th className="border-b border-gray-100 px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={event => handleColumnOpen(event, 'key')}
                      className="flex items-center gap-1 rounded px-1.5 py-1 transition hover:bg-gray-200"
                    >
                      Ключ
                      <ChevronDown size={13} className={sortColumn === 'key' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'key'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сортировать А-Я', value: 'asc' },
                        { label: 'Сортировать Я-А', value: 'desc' },
                      ]}
                      activeOrder={sortColumn === 'key' ? sortOrder : null}
                      onSort={order => handleSort('key', order)}
                    />
                  </th>
                  <th className="border-b border-gray-100 px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                    Атрибуты
                  </th>
                  <th className="border-b border-gray-100 px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={event => handleColumnOpen(event, 'status')}
                      className="flex items-center gap-1 rounded px-1.5 py-1 transition hover:bg-gray-200"
                    >
                      Статус
                      <ChevronDown size={13} className={statusFilter || sortColumn === 'status' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <StatusFilterFlyout
                      isOpen={flyoutState.column === 'status'}
                      position={flyoutState.position}
                      value={statusFilter}
                      activeOrder={sortColumn === 'status' ? sortOrder : null}
                      onChange={value => {
                        setStatusFilter(value);
                        setFlyoutState({ column: null, position: null });
                      }}
                      onSort={order => handleSort('status', order)}
                    />
                  </th>
                  <th className="border-b border-gray-100 px-2 py-1.5 text-center text-xs font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={event => handleColumnOpen(event, 'order')}
                      className="mx-auto flex items-center gap-1 rounded px-1.5 py-1 transition hover:bg-gray-200"
                    >
                      Порядок
                      <ChevronDown size={13} className={sortColumn === 'order' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'order'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сначала меньше', value: 'asc' },
                        { label: 'Сначала больше', value: 'desc' },
                      ]}
                      activeOrder={sortColumn === 'order' ? sortOrder : null}
                      onSort={order => handleSort('order', order)}
                    />
                  </th>
                  <th className="border-b border-gray-100 px-2 py-1.5 text-right text-xs font-semibold text-gray-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                      Загружаем модели...
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                      Модели не найдены.
                    </td>
                  </tr>
                ) : (
                  paginated.map(variant => {
                    const siblings = variants
                      .filter(item => item.resourceId === variant.resourceId)
                      .sort((a, b) => a.sortOrder - b.sortOrder);
                    const siblingIndex = siblings.findIndex(item => variantId(item) === variantId(variant));
                    const attrs = variant.attributes ?? Object.fromEntries((variant.normalizedAttributes ?? []).map(attribute => [attribute.key, attribute.value]));
                    return (
                      <tr key={variantId(variant)} className="hover:bg-gray-50/70">
                        <td className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{variantTitle(variant)}</p>
                            <p className="truncate text-[11px] text-gray-500">#{variantId(variant)}</p>
                          </div>
                        </td>
                        <td className="truncate border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                          {resourceOf(variant.resourceId)}
                        </td>
                        <td className="truncate border-b border-gray-100 px-4 py-2.5 text-xs font-mono text-gray-600">
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
          <div className="flex flex-col gap-3 border-t border-gray-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-500">
              {sorted.length === 0
                ? 'Нет строк'
                : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sorted.length)} из ${sorted.length}`}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Select
                value={String(pageSize)}
                onChange={event => setPageSize(Number(event.target.value))}
                options={[
                  { value: '10', label: '10 строк' },
                  { value: '25', label: '25 строк' },
                  { value: '50', label: '50 строк' },
                ]}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(value => Math.max(1, value - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <span className="min-w-16 text-center text-xs text-gray-500">
                {currentPage}/{pageCount}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(value => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
              >
                Далее
              </Button>
            </div>
          </div>
      </div>

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
      {flyoutState.column && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setFlyoutState({ column: null, position: null })}
        />
      )}
    </div>
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

function ColumnFlyout({
  isOpen,
  position,
  options,
  activeOrder,
  onSort,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  options: Array<{ label: string; value: SortOrder }>;
  activeOrder: SortOrder | null;
  onSort: (order: SortOrder) => void;
}) {
  if (!isOpen || !position) return null;

  return (
    <div
      className="fixed z-[80] w-44 rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="space-y-1">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSort(option.value)}
            className={`w-full rounded px-3 py-2 text-left text-sm transition ${
              activeOrder === option.value
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResourceFilterFlyout({
  isOpen,
  position,
  value,
  options,
  activeOrder,
  onChange,
  onSort,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  options: Array<{ value: string; label: string }>;
  activeOrder: SortOrder | null;
  onChange: (value: string) => void;
  onSort: (order: SortOrder) => void;
}) {
  if (!isOpen || !position) return null;

  return (
    <div
      className="fixed z-[80] w-64 rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="border-b border-gray-100 p-2">
        <button
          type="button"
          onClick={() => onSort('asc')}
          className={`w-full rounded px-3 py-2 text-left text-sm transition ${
            activeOrder === 'asc' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Сортировать А-Я
        </button>
        <button
          type="button"
          onClick={() => onSort('desc')}
          className={`w-full rounded px-3 py-2 text-left text-sm transition ${
            activeOrder === 'desc' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Сортировать Я-А
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto p-2">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full rounded px-3 py-2 text-left text-sm transition ${
              value === option.value ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="block truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusFilterFlyout({
  isOpen,
  position,
  value,
  activeOrder,
  onChange,
  onSort,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  activeOrder: SortOrder | null;
  onChange: (value: string) => void;
  onSort: (order: SortOrder) => void;
}) {
  if (!isOpen || !position) return null;

  return (
    <div
      className="fixed z-[80] w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="border-b border-gray-100 pb-2">
        <button
          type="button"
          onClick={() => onSort('asc')}
          className={`w-full rounded px-3 py-2 text-left text-sm transition ${
            activeOrder === 'asc' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Сначала активные
        </button>
        <button
          type="button"
          onClick={() => onSort('desc')}
          className={`w-full rounded px-3 py-2 text-left text-sm transition ${
            activeOrder === 'desc' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Сначала неактивные
        </button>
      </div>
      <div className="pt-2">
        {statusOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full rounded px-3 py-2 text-left text-sm transition ${
              value === option.value ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
