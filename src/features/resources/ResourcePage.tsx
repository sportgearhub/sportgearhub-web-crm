import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  ImageOff,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ResourceDetail } from './ResourceDetail';
import { ResourceForm, type ResourceFormData } from './ResourceForm';
import { mockBookings, mockOffers, mockVariants } from '../../lib/mock-data';
import { ApiError, equipmentApi, resourcesApi, type EquipmentCategory } from '../../lib/api-client';
import type { Resource, ResourceStatus } from '../../types';


type QuickTab = 'all' | 'active' | 'draft' | 'needs_attention' | 'out_of_stock';
type View = 'list' | 'detail' | 'create' | 'edit';
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


const statusBadge: Record<ResourceStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Active', variant: 'green' },
  draft: { label: 'Draft', variant: 'yellow' },
  inactive: { label: 'Inactive', variant: 'gray' },
  archived: { label: 'Archived', variant: 'gray' },
};

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categoriesError, setCategoriesError] = useState('');
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
        ? 'Provider access is not available for this account.'
        : 'Could not load resources from the API.');
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
        ? `Could not load equipment categories from the API: ${err.message}`
        : 'Could not load equipment categories from the API.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    void loadResources();
    void loadCategories();
  }, []);

  const rows = useMemo<ResourceTableRow[]>(() => {
    return resources.map(resource => {
      const variants = mockVariants.filter(variant => variant.resourceId === resource.id);
      const offers = mockOffers.filter(offer => offer.resourceId === resource.id);
      const bookings = mockBookings.filter(booking => booking.selection.resourceId === resource.id);
      const variantStock = variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
      const totalStock = variantStock || resource.baseCapacity || 0;
      const activeBookings = bookings.filter(
        booking => booking.status === 'confirmed' || booking.status === 'pending'
      ).length;
      const availableStock = Math.max(totalStock - activeBookings, 0);
      const bookingCount = bookings.length;
      const revenue = bookings
        .filter(booking => booking.status === 'confirmed' || booking.status === 'completed')
        .reduce((sum, booking) => sum + booking.totalAmount, 0);
      const basePrice = offers.length > 0 ? Math.min(...offers.map(offer => offer.basePrice)) : null;
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
          healthIssues.length === 0 ? 'Ready' : healthIssues.length === 1 ? healthIssues[0] : `${healthIssues[0]} +${healthIssues.length - 1}`,
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

  const allFilteredIds = filtered.map(row => row.resource.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));

  const handleCreate = async (data: ResourceFormData) => {
    setError('');
    setSaving(true);
    try {
      const newResource = await resourcesApi.create({
        resourceType: data.resourceType,
        capacityMode: data.capacityMode,
        title: data.title,
        baseCapacity: data.baseCapacity,
      });
      setResources(prev => [{ ...newResource, categoryName: data.categoryName }, ...prev]);
      setView('list');
    } catch (err) {
      setError(err instanceof ApiError
        ? `Could not create the resource in the API: ${err.message}`
        : 'Could not create the resource in the API.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: ResourceFormData) => {
    if (!selected) return;
    setError('');
    setSaving(true);
    try {
      const nextResource = await resourcesApi.patch(selected.resourceId, {
        title: data.title,
        baseCapacity: data.baseCapacity,
      });
      setResources(prev =>
        prev.map(resource => (resource.id === selected.id ? nextResource : resource))
      );
      setView('list');
      setSelected(null);
    } catch {
      setError('Could not update the resource in the API.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (resource: Resource) => {
    setError('');
    try {
      const nextResource = await resourcesApi.archive(resource.resourceId, 'provider_requested');
      setResources(prev =>
        prev.map(item => (item.id === resource.id ? nextResource : item))
      );
    } catch {
      setError('Could not archive the resource in the API.');
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
      setError('Could not update selected resources in the API.');
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
      setError('Could not archive selected resources in the API.');
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

  // Detail view
  if (view === 'detail' && selected) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <button
            onClick={() => {
              setView('list');
              setSelected(null);
            }}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            <ChevronLeft size={16} /> Back to Resources
          </button>
        </div>
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
            />
          </div>
        </div>
      </div>
    );
  }

  // Create view
  if (view === 'create') {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <button
            onClick={() => setView('list')}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            <ChevronLeft size={16} /> Back to Resources
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {error && <ResourceError message={error} />}
            {categoriesError && <ResourceError message={categoriesError} />}
            <ResourceForm
              categories={categories}
              loadingCategories={categoriesLoading}
              onSubmit={handleCreate}
              onCancel={() => setView('list')}
              submitting={saving}
            />
          </div>
        </div>
      </div>
    );
  }

  // Edit view
  if (view === 'edit' && selected) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <button
            onClick={() => {
              setView('list');
              setSelected(null);
            }}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            <ChevronLeft size={16} /> Back to Resources
          </button>
        </div>
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

  const handleColumnHover = (e: React.MouseEvent, column: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyoutState({
      column,
      position: { top: rect.bottom, left: rect.left },
    });
  };

  const handleColumnLeave = () => {
    setFlyoutState({ column: null, position: null });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
    setFlyoutState({ column: null, position: null });
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Compact Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Title & Stats */}
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Resources</h1>
            <p className="text-xs text-gray-500">
              {loading ? 'Loading live resources...' : `${filtered.length} of ${resources.length} · ${stats.needsAttention} issues`}
            </p>
          </div>

          {/* Center: Search */}
          <div className="relative flex-1 mx-6">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search resources..."
              className="w-full rounded border border-gray-300 bg-white px-8 py-2 text-sm text-gray-900 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                {selectedIds.length} selected
              </span>
            )}
            <Button variant="primary" size="sm" onClick={() => setView('create')}>
              <Plus size={13} /> New
            </Button>
          </div>
        </div>

        {/* Bulk Actions & Quick Filters */}
        {selectedIds.length > 0 || search || statusFilter || categoryFilter || availabilityFilter || healthFilter ? (
          <div className="border-t border-gray-100 px-6 py-2 flex items-center gap-2 flex-wrap text-sm">
            {selectedIds.length > 0 && (
              <>
                <Button size="sm" variant="secondary" loading={saving} onClick={() => void handleBulkStatus('active')}>Activate</Button>
                <Button size="sm" variant="secondary" loading={saving} onClick={() => void handleBulkStatus('inactive')}>Deactivate</Button>
                <Button size="sm" variant="secondary" loading={saving} onClick={() => void handleBulkArchive()}>Archive</Button>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
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
            <p className="mt-3 text-sm font-medium text-gray-900">Loading resources...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle size={40} className="text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No resources</p>
            <p className="text-xs text-gray-500">Try adjusting filters or create a new resource</p>
          </div>
        ) : (
          <div className="overflow-x-auto" onMouseLeave={() => setFlyoutState({ column: null, position: null })}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {/* Checkbox column */}
                  <th className="sticky left-0 z-20 bg-gray-50 w-12 px-4 py-3 text-left border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedIds(allSelected ? [] : allFilteredIds)}
                      className="rounded border-gray-300"
                    />
                  </th>

                  {/* Resource column (fixed) */}
                  <th className="sticky left-12 z-20 bg-gray-50 border-r border-gray-200 px-4 py-3 text-left font-semibold text-gray-700 min-w-64 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'resource')}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700 relative"
                    >
                      Resource
                      <ChevronDown size={13} className={sortColumn === 'title' ? 'text-blue-600' : 'text-gray-400'} />
                      <ColumnFlyout
                        isOpen={flyoutState.column === 'resource'}
                        position={flyoutState.position}
                        options={[
                          { label: 'Sort A→Z', value: 'asc' },
                          { label: 'Sort Z→A', value: 'desc' },
                        ]}
                        onSort={() => handleSort('title')}
                        hasActiveSort={sortColumn === 'title'}
                        onMouseEnter={() => {}}
                        onMouseLeave={handleColumnLeave}
                      />
                    </button>
                  </th>

                  {/* Category */}
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-40 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'category')}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Category
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
                      onMouseEnter={() => {}}
                      onMouseLeave={handleColumnLeave}
                    />
                  </th>

                  {/* Price */}
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 min-w-32 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'price')}
                      className="flex items-center justify-end gap-1 ml-auto px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Price
                      <ChevronDown size={13} className={sortColumn === 'price' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                  </th>

                  {/* Stock */}
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 min-w-24 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'stock')}
                      className="flex items-center justify-end gap-1 ml-auto px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Stock
                      <ChevronDown size={13} className={sortColumn === 'stock' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                  </th>

                  {/* Availability */}
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-40 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'availability')}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Availability
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
                      onMouseEnter={() => {}}
                      onMouseLeave={handleColumnLeave}
                    />
                  </th>

                  {/* Health */}
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-32 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'health')}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Health
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
                      onMouseEnter={() => {}}
                      onMouseLeave={handleColumnLeave}
                    />
                  </th>

                  {/* Status */}
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-32 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'status')}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Status
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
                      onMouseEnter={() => {}}
                      onMouseLeave={handleColumnLeave}
                    />
                  </th>

                  {/* Bookings */}
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 min-w-24 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'bookings')}
                      className="flex items-center justify-end gap-1 ml-auto px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Bookings
                      <ChevronDown size={13} className={sortColumn === 'bookings' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                  </th>

                  {/* Revenue */}
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 min-w-32 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'revenue')}
                      className="flex items-center justify-end gap-1 ml-auto px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Revenue
                      <ChevronDown size={13} className={sortColumn === 'revenue' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                  </th>

                  {/* Updated */}
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-28 relative" onMouseLeave={handleColumnLeave}>
                    <button
                      onMouseEnter={(e) => handleColumnHover(e, 'updated')}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 transition text-gray-700"
                    >
                      Updated
                      <ChevronDown size={13} className={sortColumn === 'updated' ? 'text-blue-600' : 'text-gray-400'} />
                    </button>
                  </th>


                </tr>
              </thead>
              <tbody>
                {sorted.map(row => {
                  const { resource } = row;
                  const status = statusBadge[resource.status];
                  const isSelected = selectedIds.includes(resource.id);

                  return (
                    <tr key={resource.id} className={`border-b border-gray-100 transition ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      {/* Checkbox */}
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(resource.id)}
                          className="rounded border-gray-300"
                        />
                      </td>

                      {/* Resource (fixed) */}
                      <td className="sticky left-12 z-10 bg-white border-r border-gray-100 px-4 py-3">
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
                            <p className="truncate text-xs text-gray-500">{resource.slug}</p>
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
                          <p className="text-xs text-gray-500 capitalize">{row.availabilityState.replace('_', ' ')}</p>
                        </div>
                      </td>

                      {/* Health */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className={`font-medium ${row.healthState === 'ready' ? 'text-green-700' : 'text-amber-700'}`}>
                            {row.healthState === 'ready' ? '✓ Ready' : `${row.completenessScore}%`}
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
                        {new Date(resource.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
  hasActiveSort,
  onMouseEnter,
  onMouseLeave,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  options: { label: string; value: string }[];
  onSort: () => void;
  hasActiveSort: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!isOpen || !position) return null;

  return (
    <div
      className="absolute top-full left-0 mt-2 w-40 bg-white rounded-lg border border-gray-200 shadow-xl z-50"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="p-2 space-y-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={onSort}
            className={`w-full text-left px-3 py-2 rounded text-sm transition ${
              hasActiveSort ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
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
  onMouseEnter,
  onMouseLeave,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const [search, setSearch] = useState('');
  if (!isOpen || !position) return null;

  const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="absolute top-full left-0 mt-2 w-52 bg-white rounded-lg border border-gray-200 shadow-xl z-50"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="p-3 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search..."
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
          All categories
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
  onMouseEnter,
  onMouseLeave,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!isOpen || !position) return null;

  const options = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <div
      className="absolute top-full left-0 mt-2 w-44 bg-white rounded-lg border border-gray-200 shadow-xl z-50"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
  onMouseEnter,
  onMouseLeave,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!isOpen || !position) return null;

  const options = [
    { value: '', label: 'All availability' },
    { value: 'available', label: 'Available' },
    { value: 'partially_booked', label: 'Partially booked' },
    { value: 'fully_booked', label: 'Fully booked' },
    { value: 'no_stock', label: 'No stock' },
  ];

  return (
    <div
      className="absolute top-full left-0 mt-2 w-44 bg-white rounded-lg border border-gray-200 shadow-xl z-50"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
  onMouseEnter,
  onMouseLeave,
}: {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  value: string;
  onChange: (val: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!isOpen || !position) return null;

  const options = [
    { value: '', label: 'All health' },
    { value: 'ready', label: 'Ready' },
    { value: 'needs_attention', label: 'Needs attention' },
  ];

  return (
    <div
      className="absolute top-full left-0 mt-2 w-40 bg-white rounded-lg border border-gray-200 shadow-xl z-50"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
