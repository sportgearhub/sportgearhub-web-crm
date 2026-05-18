import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  CreditCard as Edit2,
  ImageOff,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ResourceDeleteDialog } from './ResourceDeleteDialog';
import { ResourceDetail } from './ResourceDetail';
import { ResourceForm, type ResourceFormData } from './ResourceForm';
import { mockBookings, mockOffers, mockVariants } from '../../lib/mock-data';
import { ApiError, equipmentApi, resourcesApi, type EquipmentCategory } from '../../lib/api-client';
import type { Resource, ResourceStatus } from '../../types';


type QuickTab = 'all' | 'active' | 'draft' | 'needs_attention' | 'out_of_stock';
type View = 'list' | 'detail' | 'edit';
type AvailabilityState = 'available' | 'partially_booked' | 'fully_booked' | 'no_stock';
type HealthState = 'ready' | 'needs_attention';
type SortColumn = 'title' | 'price' | 'stock' | 'bookings' | 'revenue' | 'updated' | null;
type SortOrder = 'asc' | 'desc';

interface ResourceTableRow {
  resource: Resource;
  basePrice: number | null;
  totalStock: number;
  availableStock: number;
  variantCount: number;
  activeVariants: number;
  bookingCount: number;
  revenue: number;
  availabilityState: AvailabilityState;
  completenessScore: number;
  healthState: HealthState;
  healthLabel: string;
  healthIssues: string[];
}

interface ColumnFlyoutState {
  column: string | null;
  position: { top: number; left: number } | null;
}

interface ResourcesPageProps {
  onHeaderContentChange?: (content: { title: string; subtitle?: string } | null) => void;
  onNavigate: (path: string) => void;
}

const statusBadge: Record<ResourceStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Активен', variant: 'green' },
  draft: { label: 'Черновик', variant: 'yellow' },
  inactive: { label: 'Отключен', variant: 'gray' },
  archived: { label: 'В архиве', variant: 'gray' },
};

const healthIssueLabel: Record<string, string> = {
  'Missing pricing': 'Нет цены',
  'Missing variants': 'Нет вариантов',
  Draft: 'Черновик',
};

const availabilityLabel: Record<AvailabilityState, string> = {
  available: 'Доступно',
  partially_booked: 'Частично занято',
  fully_booked: 'Занято',
  no_stock: 'Нет остатков',
};

export function ResourcesPage({ onHeaderContentChange, onNavigate }: ResourcesPageProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [categoriesError, setCategoriesError] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<Resource | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [quickTab] = useState<QuickTab>('all');
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Resource | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [flyoutState, setFlyoutState] = useState<ColumnFlyoutState>({ column: null, position: null });

  const loadResources = async () => {
    setError('');
    setLoading(true);
    try {
      const nextResources = await resourcesApi.list();
      setResources(nextResources);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403
        ? 'Для этого аккаунта недоступен доступ партнера.'
        : 'Не удалось загрузить ресурсы из API.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setCategoriesError('');
    setCategoriesLoading(true);
    try {
      const nextCategories = await equipmentApi.categories();
      setCategories(
        nextCategories
          .filter(category => category.status === 'active')
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } catch (err) {
      setCategories([]);
      setCategoriesError(err instanceof ApiError
        ? `Не удалось загрузить категории оборудования из API: ${err.message}`
        : 'Не удалось загрузить категории оборудования из API.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    void loadResources();
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!onHeaderContentChange) return undefined;

    if (view === 'edit') {
      onHeaderContentChange({
        title: 'Редактировать ресурс',
        subtitle: selected?.title,
      });
    } else if (view === 'detail') {
      onHeaderContentChange({
        title: selected?.title ?? 'Ресурс',
        subtitle: selected?.categoryName ?? 'Просмотр ресурса',
      });
    } else {
      onHeaderContentChange(null);
    }

    return () => onHeaderContentChange(null);
  }, [onHeaderContentChange, selected, view]);

  const rows = useMemo<ResourceTableRow[]>(() => {
    return resources.map(resource => {
      const variants = mockVariants.filter(variant => variant.resourceId === resource.id);
      const offers = mockOffers.filter(offer => offer.resourceId === resource.id);
      const bookings = mockBookings.filter(booking => booking.selection.resourceId === resource.id);
      const variantStock = variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
      const totalStock = variantStock;
      const activeBookings = bookings.filter(
        booking => booking.status === 'confirmed' || booking.status === 'pending'
      ).length;
      const availableStock = Math.max(totalStock - activeBookings, 0);
      const bookingCount = bookings.length;
      const revenue = bookings
        .filter(booking => booking.status === 'confirmed' || booking.status === 'completed')
        .reduce((sum, booking) => sum + booking.totalAmount, 0);
      const offerPrices = offers
        .map(offer => offer.basePrice)
        .filter((price): price is number => typeof price === 'number');
      const basePrice = offerPrices.length > 0 ? Math.min(...offerPrices) : null;
      const healthIssues: string[] = [];

      if (!basePrice) healthIssues.push('Missing pricing');
      if (variants.length === 0) healthIssues.push('Missing variants');
      if (resource.status === 'draft') healthIssues.push('Draft');

      const completenessScore = Math.max(0, 100 - healthIssues.length * 20);

      let availabilityState: AvailabilityState = 'available';
      if (variants.length === 0 || totalStock === 0) {
        availabilityState = 'no_stock';
      } else if (availableStock === 0) {
        availabilityState = 'fully_booked';
      } else if (availableStock < totalStock) {
        availabilityState = 'partially_booked';
      }

      return {
        resource,
        basePrice,
        totalStock,
        availableStock,
        variantCount: variants.length,
        activeVariants: variants.filter(variant => variant.status === 'active').length,
        bookingCount,
        revenue,
        availabilityState,
        completenessScore,
        healthState: healthIssues.length === 0 ? 'ready' : 'needs_attention',
        healthLabel:
          healthIssues.length === 0
            ? 'Готово'
            : healthIssues.length === 1
              ? healthIssueLabel[healthIssues[0]] ?? healthIssues[0]
              : `${healthIssueLabel[healthIssues[0]] ?? healthIssues[0]} +${healthIssues.length - 1}`,
        healthIssues,
      };
    });
  }, [resources]);

  const stats = useMemo(() => {
    const activeCount = rows.filter(r => r.resource.status === 'active').length;
    const needsAttention = rows.filter(r => r.healthState === 'needs_attention').length;
    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    return { activeCount, needsAttention, totalRevenue };
  }, [rows]);

  const categoryFilterOptions = useMemo(
    () => categories.map(category => ({ value: category.label, label: category.label })),
    [categories]
  );

  const filtered = rows.filter(row => {
    const { resource } = row;
    const categoryName = resource.categoryName ?? resource.resourceType;
    const matchesSearch =
      !search ||
      resource.title.toLowerCase().includes(search.toLowerCase()) ||
      categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || resource.status === statusFilter;
    const matchesCategory = !categoryFilter || categoryName === categoryFilter;
    const matchesAvailability = !availabilityFilter || row.availabilityState === availabilityFilter;
    const matchesHealth = !healthFilter || row.healthState === healthFilter;

    const matchesQuickTab =
      quickTab === 'all' ||
      (quickTab === 'active' && resource.status === 'active') ||
      (quickTab === 'draft' && resource.status === 'draft') ||
      (quickTab === 'needs_attention' && row.healthState === 'needs_attention') ||
      (quickTab === 'out_of_stock' &&
        (row.availabilityState === 'fully_booked' || row.availabilityState === 'no_stock'));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCategory &&
      matchesAvailability &&
      matchesHealth &&
      matchesQuickTab
    );
  });

  const sorted = useMemo(() => {
    const result = [...filtered];
    if (sortColumn) {
      result.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;

        switch (sortColumn) {
          case 'title':
            aVal = a.resource.title;
            bVal = b.resource.title;
            break;
          case 'price':
            aVal = a.basePrice ?? 0;
            bVal = b.basePrice ?? 0;
            break;
          case 'stock':
            aVal = a.totalStock;
            bVal = b.totalStock;
            break;
          case 'bookings':
            aVal = a.bookingCount;
            bVal = b.bookingCount;
            break;
          case 'revenue':
            aVal = a.revenue;
            bVal = b.revenue;
            break;
          case 'updated':
            aVal = new Date(a.resource.updatedAt).getTime();
            bVal = new Date(b.resource.updatedAt).getTime();
            break;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
    }
    return result;
  }, [filtered, sortColumn, sortOrder]);

  const handleUpdate = async (data: ResourceFormData) => {
    if (!selected) return;
    setError('');
    setSaving(true);
    try {
      const nextResource = await resourcesApi.patch(selected.resourceId, {
        title: data.title,
      });
      setResources(prev =>
        prev.map(resource => (resource.id === selected.id ? nextResource : resource))
      );
      setView('list');
      setSelected(null);
    } catch {
      setError('Не удалось обновить ресурс в API.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (resource: Resource) => {
    setError('');
    setRemoveError('');
    try {
      const nextResource = await resourcesApi.archive(resource.resourceId, 'provider_requested');
      setResources(prev =>
        prev.map(item => (item.id === resource.id ? nextResource : item))
      );
    } catch {
      setError('Не удалось архивировать ресурс в API.');
    }
  };

  const requestRemove = (resource: Resource) => {
    setRemoveError('');
    setRemoveTarget(resource);
  };

  const handleRemove = async (resource: Resource) => {
    setError('');
    setRemoveError('');

    setRemoving(true);
    try {
      await resourcesApi.remove(resource.resourceId);
      setResources(prev => prev.filter(item => item.id !== resource.id));
      setSelectedIds(prev => prev.filter(id => id !== resource.id));
      setView('list');
      setSelected(null);
      setRemoveTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRemoveError('Ресурс уже связан с офферами, бронями или выдачей. Удаление недоступно, используйте архивирование.');
      } else if (err instanceof ApiError && err.status === 404) {
        setRemoveError('Ресурс не найден или недоступен для текущего партнера.');
      } else {
        setRemoveError('Не удалось удалить ресурс.');
      }
    } finally {
      setRemoving(false);
    }
  };

  const handleBulkStatus = async (status: ResourceStatus) => {
    setError('');
    setSaving(true);
    try {
      const selectedResources = resources.filter(resource => selectedIds.includes(resource.id));
      const updatedResources = await Promise.all(
        selectedResources.map(resource => resourcesApi.patch(resource.resourceId, { status }))
      );
      const updatedById = new Map(updatedResources.map(resource => [resource.id, resource]));
      setResources(prev => prev.map(resource => updatedById.get(resource.id) ?? resource));
      setSelectedIds([]);
    } catch {
      setError('Не удалось обновить выбранные ресурсы в API.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkArchive = async () => {
    setError('');
    setSaving(true);
    try {
      const selectedResources = resources.filter(resource => selectedIds.includes(resource.id));
      const updatedResources = await Promise.all(
        selectedResources.map(resource => resourcesApi.archive(resource.resourceId, 'provider_requested'))
      );
      const updatedById = new Map(updatedResources.map(resource => [resource.id, resource]));
      setResources(prev => prev.map(resource => updatedById.get(resource.id) ?? resource));
      setSelectedIds([]);
    } catch {
      setError('Не удалось архивировать выбранные ресурсы в API.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const openDetail = (resource: Resource) => {
    setSelected(resource);
    setView('detail');
  };

  const openEdit = (resource: Resource) => {
    setSelected(resource);
    setView('edit');
  };

  const returnToList = () => {
    setView('list');
    setSelected(null);
  };

  const closeRemoveDialog = () => {
    setRemoveTarget(null);
    setRemoveError('');
  };

  const removeDialog = (
    <ResourceDeleteDialog
      resource={removeTarget}
      removing={removing}
      error={removeError}
      onClose={closeRemoveDialog}
      onConfirm={resource => void handleRemove(resource)}
      onArchive={resource => {
        void handleArchive(resource);
        closeRemoveDialog();
      }}
    />
  );

  // Detail view
  if (view === 'detail' && selected) {
    return (
      <>
        <div className="flex h-screen flex-col bg-gray-50">
          <ResourceBreadcrumb current={selected.title} onBack={returnToList} />
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <ResourceDetail
                resource={selected}
                onEdit={() => setView('edit')}
                onArchive={() => {
                  void handleArchive(selected);
                  setView('list');
                  setSelected(null);
                }}
                onRemove={() => requestRemove(selected)}
                removing={removing}
                removeError={removeError}
              />
            </div>
          </div>
        </div>
        {removeDialog}
      </>
    );
  }

  // Edit view
  if (view === 'edit' && selected) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <ResourceBreadcrumb current="Редактирование" onBack={returnToList} />
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {categoriesError && <ResourceError message={categoriesError} />}
            <ResourceForm
              resource={selected}
              categories={categories}
              loadingCategories={categoriesLoading}
              onSubmit={handleUpdate}
              onCancel={() => {
                setView('list');
                setSelected(null);
              }}
              submitting={saving}
            />
          </div>
        </div>
      </div>
    );
  }

  const handleColumnOpen = (e: React.MouseEvent, column: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Compact Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Title & Stats */}
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Ресурсы</h1>
            <p className="text-xs text-gray-500">
              {loading ? 'Загружаем ресурсы...' : `${filtered.length} из ${resources.length} · проблем: ${stats.needsAttention}`}
            </p>
          </div>

          {/* Center: Search */}
          <div className="relative flex-1 mx-6">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Поиск ресурсов..."
              className="w-full rounded border border-gray-300 bg-white px-8 py-2 text-sm text-gray-900 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => onNavigate('/resources/create')}>
              <Plus size={13} /> Создать
            </Button>
          </div>
        </div>

        {/* Bulk Actions & Quick Filters */}
        {selectedIds.length > 0 || search || statusFilter || categoryFilter || availabilityFilter || healthFilter ? (
          <div className="border-t border-gray-100 px-6 py-2 flex items-center gap-2 flex-wrap text-sm">
            {selectedIds.length > 0 && (
              <>
                <Button size="sm" variant="secondary" loading={saving} onClick={() => void handleBulkStatus('active')}>Включить</Button>
                <Button size="sm" variant="secondary" loading={saving} onClick={() => void handleBulkStatus('inactive')}>Отключить</Button>
                <Button size="sm" variant="secondary" loading={saving} onClick={() => void handleBulkArchive()}>В архив</Button>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Сбросить</Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </nav>

      {/* Table Area */}
      <div className="flex-1 overflow-auto relative bg-white">
        {error && <ResourceError message={error} />}
        {categoriesError && <ResourceError message={categoriesError} />}
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-gray-900">Загружаем ресурсы...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {/* Resource column (fixed) */}
                  <th className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 min-w-56 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'resource')}
                      className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700 relative"
                    >
                      Ресурс
                      <ChevronDown size={13} className={sortColumn === 'title' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'resource'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сортировать А-Я', value: 'asc' },
                        { label: 'Сортировать Я-А', value: 'desc' },
                      ]}
                      onSort={(order) => handleSort('title', order)}
                      activeOrder={sortColumn === 'title' ? sortOrder : null}
                    />
                  </th>

                  {/* Category */}
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 min-w-32 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'category')}
                      className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Категория
                      <ChevronDown size={13} className={categoryFilter ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <CategoryFilterFlyout
                      isOpen={flyoutState.column === 'category'}
                      position={flyoutState.position}
                      value={categoryFilter}
                      onChange={(val) => {
                        setCategoryFilter(val);
                        setFlyoutState({ column: null, position: null });
                      }}
                      options={categoryFilterOptions}
                    />
                  </th>

                  {/* Price */}
                  <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700 min-w-24 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'price')}
                      className="flex items-center justify-end gap-1 ml-auto px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Цена
                      <ChevronDown size={13} className={sortColumn === 'price' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'price'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сначала дешевле', value: 'asc' },
                        { label: 'Сначала дороже', value: 'desc' },
                      ]}
                      onSort={(order) => handleSort('price', order)}
                      activeOrder={sortColumn === 'price' ? sortOrder : null}
                    />
                  </th>

                  {/* Stock */}
                  <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700 min-w-20 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'stock')}
                      className="flex items-center justify-end gap-1 ml-auto px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Остаток
                      <ChevronDown size={13} className={sortColumn === 'stock' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'stock'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сначала меньше', value: 'asc' },
                        { label: 'Сначала больше', value: 'desc' },
                      ]}
                      onSort={(order) => handleSort('stock', order)}
                      activeOrder={sortColumn === 'stock' ? sortOrder : null}
                    />
                  </th>

                  {/* Availability */}
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 min-w-32 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'availability')}
                      className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Доступность
                      <ChevronDown size={13} className={availabilityFilter ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <AvailabilityFilterFlyout
                      isOpen={flyoutState.column === 'availability'}
                      position={flyoutState.position}
                      value={availabilityFilter}
                      onChange={(val) => {
                        setAvailabilityFilter(val);
                        setFlyoutState({ column: null, position: null });
                      }}
                    />
                  </th>

                  {/* Health */}
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 min-w-28 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'health')}
                      className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Готовность
                      <ChevronDown size={13} className={healthFilter ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <HealthFilterFlyout
                      isOpen={flyoutState.column === 'health'}
                      position={flyoutState.position}
                      value={healthFilter}
                      onChange={(val) => {
                        setHealthFilter(val);
                        setFlyoutState({ column: null, position: null });
                      }}
                    />
                  </th>

                  {/* Status */}
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 min-w-24 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'status')}
                      className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Статус
                      <ChevronDown size={13} className={statusFilter ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <StatusFilterFlyout
                      isOpen={flyoutState.column === 'status'}
                      position={flyoutState.position}
                      value={statusFilter}
                      onChange={(val) => {
                        setStatusFilter(val);
                        setFlyoutState({ column: null, position: null });
                      }}
                    />
                  </th>

                  {/* Bookings */}
                  <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700 min-w-20 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'bookings')}
                      className="flex items-center justify-end gap-1 ml-auto px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Брони
                      <ChevronDown size={13} className={sortColumn === 'bookings' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'bookings'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сначала меньше', value: 'asc' },
                        { label: 'Сначала больше', value: 'desc' },
                      ]}
                      onSort={(order) => handleSort('bookings', order)}
                      activeOrder={sortColumn === 'bookings' ? sortOrder : null}
                    />
                  </th>

                  {/* Revenue */}
                  <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700 min-w-24 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'revenue')}
                      className="flex items-center justify-end gap-1 ml-auto px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Выручка
                      <ChevronDown size={13} className={sortColumn === 'revenue' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'revenue'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сначала меньше', value: 'asc' },
                        { label: 'Сначала больше', value: 'desc' },
                      ]}
                      onSort={(order) => handleSort('revenue', order)}
                      activeOrder={sortColumn === 'revenue' ? sortOrder : null}
                    />
                  </th>

                  {/* Updated */}
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 min-w-24 relative">
                    <button
                      onClick={(e) => handleColumnOpen(e, 'updated')}
                      className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Обновлено
                      <ChevronDown size={13} className={sortColumn === 'updated' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                    <ColumnFlyout
                      isOpen={flyoutState.column === 'updated'}
                      position={flyoutState.position}
                      options={[
                        { label: 'Сначала старые', value: 'asc' },
                        { label: 'Сначала новые', value: 'desc' },
                      ]}
                      onSort={(order) => handleSort('updated', order)}
                      activeOrder={sortColumn === 'updated' ? sortOrder : null}
                    />
                  </th>

                  {/* Actions */}
                  <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700 min-w-20">
                    Действия
                  </th>

                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <AlertTriangle size={40} className="text-gray-300" />
                        <p className="mt-3 text-sm font-medium text-gray-900">Ресурсов нет</p>
                        <p className="text-xs text-gray-500">Измените фильтры или создайте новый ресурс</p>
                      </div>
                    </td>
                  </tr>
                ) : sorted.map(row => {
                  const { resource } = row;
                  const status = statusBadge[resource.status];
                  const isSelected = selectedIds.includes(resource.id);

                  return (
                    <tr
                      key={resource.id}
                      onClick={event => {
                        if (event.metaKey || event.ctrlKey) {
                          toggleSelection(resource.id);
                          return;
                        }
                        openDetail(resource);
                      }}
                      className={`cursor-pointer border-b border-gray-100 transition ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      {/* Resource (fixed) */}
                      <td className={`sticky left-0 z-10 border-r border-gray-100 px-4 py-3 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                        <div className="flex items-center gap-2">
                          {resource.imageUrl ? (
                            <img src={resource.imageUrl} alt={resource.title} className="h-8 w-8 rounded object-cover border border-gray-200" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400">
                              <ImageOff size={12} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{resource.title}</p>
                          </div>
                          {row.healthState === 'needs_attention' && (
                            <AlertTriangle size={14} className="flex-shrink-0 text-amber-600" />
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-sm text-gray-700">{resource.categoryName}</td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {row.basePrice ? `${row.basePrice.toLocaleString()}` : '—'}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{row.totalStock}</td>

                      {/* Availability */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{row.availableStock}/{row.totalStock}</p>
                          <p className="text-xs text-gray-500">{availabilityLabel[row.availabilityState]}</p>
                        </div>
                      </td>

                      {/* Health */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className={`font-medium ${row.healthState === 'ready' ? 'text-green-700' : 'text-amber-700'}`}>
                            {row.healthState === 'ready' ? 'Готово' : `${row.completenessScore}%`}
                          </p>
                          {row.healthState !== 'ready' && (
                            <p className="text-xs text-gray-500">{row.healthLabel}</p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge variant={status.variant} size="sm">{status.label}</Badge>
                      </td>

                      {/* Bookings */}
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{row.bookingCount}</td>

                      {/* Revenue */}
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {row.revenue.toLocaleString()} RUB
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(resource.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              openEdit(resource);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                            title="Редактировать ресурс"
                            aria-label={`Редактировать ресурс ${resource.title}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              requestRemove(resource);
                            }}
                            disabled={removing}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Удалить ресурс"
                            aria-label={`Удалить ресурс ${resource.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backdrop to close flyout */}
      {flyoutState.column && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setFlyoutState({ column: null, position: null })}
        />
      )}
      {removeDialog}
    </div>
  );
}

function ResourceBreadcrumb({ current, onBack }: { current: string; onBack: () => void }) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-gray-600 transition-colors hover:text-gray-950"
        >
          Ресурсы
        </button>
        <ChevronRight size={14} className="shrink-0 text-gray-400" />
        <span className="truncate font-semibold text-gray-950">{current}</span>
      </div>
    </div>
  );
}

function ResourceError({ message }: { message: string }) {
  return (
    <div className="m-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <AlertTriangle size={14} className="shrink-0 text-red-600" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}

// Improved Flyout components
function ColumnFlyout({
  isOpen,
  position,
  options,
  onSort,
  activeOrder,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  options: { label: string; value: SortOrder }[];
  onSort: (order: SortOrder) => void;
  activeOrder: SortOrder | null;
}) {
  if (!isOpen || !position) return null;

  return (
    <div
      className="fixed z-[80] w-44 rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="p-2 space-y-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSort(opt.value)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition ${
              activeOrder === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryFilterFlyout({
  isOpen,
  position,
  value,
  onChange,
  options,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  const [search, setSearch] = useState('');
  if (!isOpen || !position) return null;

  const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="fixed z-[80] w-52 rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="p-3 border-b border-gray-100">
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
        <button
          onClick={() => onChange('')}
          className={`w-full text-left px-3 py-2 rounded text-sm transition ${
            value === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          Все категории
        </button>
        {filtered.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition ${
              value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {opt.label}
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
  onChange,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
}) {
  if (!isOpen || !position) return null;

  const options = [
    { value: '', label: 'Все статусы' },
    { value: 'active', label: 'Активен' },
    { value: 'draft', label: 'Черновик' },
    { value: 'inactive', label: 'Отключен' },
  ];

  return (
    <div
      className="fixed z-[80] w-44 rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="p-2 space-y-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition ${
              value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AvailabilityFilterFlyout({
  isOpen,
  position,
  value,
  onChange,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
}) {
  if (!isOpen || !position) return null;

  const options = [
    { value: '', label: 'Любая доступность' },
    { value: 'available', label: 'Доступно' },
    { value: 'partially_booked', label: 'Частично занято' },
    { value: 'fully_booked', label: 'Занято' },
    { value: 'no_stock', label: 'Нет остатков' },
  ];

  return (
    <div
      className="fixed z-[80] w-44 rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="p-2 space-y-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition ${
              value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HealthFilterFlyout({
  isOpen,
  position,
  value,
  onChange,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
}) {
  if (!isOpen || !position) return null;

  const options = [
    { value: '', label: 'Любая готовность' },
    { value: 'ready', label: 'Готово' },
    { value: 'needs_attention', label: 'Нужно внимание' },
  ];

  return (
    <div
      className="fixed z-[80] w-40 rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={event => event.stopPropagation()}
    >
      <div className="p-2 space-y-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition ${
              value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
