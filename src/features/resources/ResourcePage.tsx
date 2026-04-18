import { useMemo, useState } from 'react';
import {
  Archive,
  ChevronLeft,
  Copy,
  Eye,
  ImageOff,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ResourceDetail } from './ResourceDetail';
import { ResourceForm } from './ResourceForm';
import { resourceCategoryOptions } from './resource-options';
import { mockBookings, mockOffers, mockResources, mockVariants } from '../../lib/mock-data';
import type { Resource, ResourceStatus } from '../../types';

const statusBadge: Record<ResourceStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Active', variant: 'green' },
  draft: { label: 'Draft', variant: 'yellow' },
  inactive: { label: 'Inactive', variant: 'gray' },
  archived: { label: 'Archived', variant: 'gray' },
};

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

const categoryOptions = [
  { value: '', label: 'All categories' },
  ...resourceCategoryOptions,
];

const availabilityOptions = [
  { value: '', label: 'All availability' },
  { value: 'available', label: 'Available' },
  { value: 'partially_booked', label: 'Partially booked' },
  { value: 'fully_booked', label: 'Fully booked' },
  { value: 'no_stock', label: 'No stock' },
];

const healthOptions = [
  { value: '', label: 'All health' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'ready', label: 'Ready' },
];

const quickTabs = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Draft' },
  { id: 'needs_attention', label: 'Needs attention' },
  { id: 'out_of_stock', label: 'Out of stock' },
] as const;

type QuickTab = typeof quickTabs[number]['id'];
type View = 'list' | 'detail' | 'create' | 'edit';

type AvailabilityState = 'available' | 'partially_booked' | 'fully_booked' | 'no_stock';
type HealthState = 'ready' | 'needs_attention';

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

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>(mockResources);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [quickTab, setQuickTab] = useState<QuickTab>('all');
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Resource | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineCategory, setInlineCategory] = useState('');
  const [showPerformanceColumn, setShowPerformanceColumn] = useState(true);

  const rows = useMemo<ResourceTableRow[]>(() => {
    return resources.map(resource => {
      const variants = mockVariants.filter(variant => variant.resourceId === resource.id);
      const offers = mockOffers.filter(offer => offer.resourceId === resource.id);
      const bookings = mockBookings.filter(booking => booking.selection.resourceId === resource.id);
      const totalStock = variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
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

      if (!resource.imageUrl) healthIssues.push('Missing images');
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

  const filtered = rows.filter(row => {
    const { resource } = row;
    const matchesSearch =
      !search ||
      resource.title.toLowerCase().includes(search.toLowerCase()) ||
      resource.categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || resource.status === statusFilter;
    const matchesCategory = !categoryFilter || resource.categoryName === categoryFilter;
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

  const allFilteredIds = filtered.map(row => row.resource.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));

  const emptyStateMessage =
    resources.length === 0
      ? 'Add your first rental resource. Listings with pricing and availability perform significantly better.'
      : 'No resources match the current filters.';

  const handleCreate = (data: Partial<Resource>) => {
    const title = data.title || 'New Resource';
    const categoryName = data.categoryName || 'Uncategorized';
    const newResource: Resource = {
      id: `res-${Date.now()}`,
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      status: data.status || 'draft',
      categoryId: `cat-${Date.now()}`,
      categoryName,
      description: data.description,
      imageUrl: data.imageUrl,
      variantCount: data.variantCount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setResources(prev => [newResource, ...prev]);
    setView('list');
  };

  const handleUpdate = (data: Partial<Resource>) => {
    if (!selected) return;
    setResources(prev =>
      prev.map(resource =>
        resource.id === selected.id
          ? { ...resource, ...data, updatedAt: new Date().toISOString() }
          : resource
      )
    );
    setView('list');
    setSelected(null);
  };

  const handleArchive = (resource: Resource) => {
    setResources(prev =>
      prev.map(item => (item.id === resource.id ? { ...item, status: 'archived' } : item))
    );
  };

  const handleDuplicate = (resource: Resource) => {
    const duplicate: Resource = {
      ...resource,
      id: `res-${Date.now()}`,
      title: `${resource.title} Copy`,
      slug: `${resource.slug}-copy`,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setResources(prev => [duplicate, ...prev]);
  };

  const handleBulkStatus = (status: ResourceStatus) => {
    setResources(prev =>
      prev.map(resource =>
        selectedIds.includes(resource.id) ? { ...resource, status, updatedAt: new Date().toISOString() } : resource
      )
    );
    setSelectedIds([]);
  };

  const handleBulkArchive = () => {
    setResources(prev =>
      prev.map(resource =>
        selectedIds.includes(resource.id)
          ? { ...resource, status: 'archived', updatedAt: new Date().toISOString() }
          : resource
      )
    );
    setSelectedIds([]);
  };

  const handleBulkCategory = (categoryName: string) => {
    setResources(prev =>
      prev.map(resource =>
        selectedIds.includes(resource.id)
          ? { ...resource, categoryName, updatedAt: new Date().toISOString() }
          : resource
      )
    );
  };

  const handleBulkDuplicate = () => {
    const duplicates = resources
      .filter(resource => selectedIds.includes(resource.id))
      .map(resource => ({
        ...resource,
        id: `res-${Date.now()}-${resource.id}`,
        title: `${resource.title} Copy`,
        slug: `${resource.slug}-copy`,
        status: 'draft' as ResourceStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    setResources(prev => [...duplicates, ...prev]);
    setSelectedIds([]);
  };

  const beginInlineEdit = (resource: Resource) => {
    setInlineEditId(resource.id);
    setInlineTitle(resource.title);
    setInlineCategory(resource.categoryName);
  };

  const saveInlineEdit = (id: string) => {
    setResources(prev =>
      prev.map(resource =>
        resource.id === id
          ? {
              ...resource,
              title: inlineTitle.trim() || resource.title,
              categoryName: inlineCategory.trim() || resource.categoryName,
              slug: (inlineTitle.trim() || resource.title).toLowerCase().replace(/\s+/g, '-'),
              updatedAt: new Date().toISOString(),
            }
          : resource
      )
    );
    setInlineEditId(null);
  };

  const toggleInlineStatus = (id: string) => {
    setResources(prev =>
      prev.map(resource =>
        resource.id === id
          ? {
              ...resource,
              status: resource.status === 'active' ? 'inactive' : 'active',
              updatedAt: new Date().toISOString(),
            }
          : resource
      )
    );
  };

  if (view === 'detail' && selected) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => setView('list')}
            className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-800"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <ResourceDetail
            resource={selected}
            onEdit={() => setView('edit')}
            onArchive={() => {
              handleArchive(selected);
              setView('list');
            }}
          />
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => setView('list')}
            className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-800"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <ResourceForm onSubmit={handleCreate} onCancel={() => setView('list')} />
        </div>
      </div>
    );
  }

  if (view === 'edit' && selected) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => setView('list')}
            className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-800"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <ResourceForm resource={selected} onSubmit={handleUpdate} onCancel={() => setView('list')} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Resources</h2>
            <p className="text-xs text-gray-500">
              {filtered.length} rows · {filtered.filter(row => row.healthState === 'needs_attention').length} need attention · {resources.length} total
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPerformanceColumn(prev => !prev)}
              className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:text-gray-900"
            >
              <Settings2 size={13} /> {showPerformanceColumn ? 'Hide' : 'Show'} performance
            </button>
            <Button variant="primary" size="sm" onClick={() => setView('create')}>
              <Plus size={13} /> Add Resource
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setQuickTab(tab.id)}
              className={`border px-3 py-2 text-xs font-medium transition ${
                quickTab === tab.id
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.2fr)_160px_180px_180px_160px]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search title or category..."
                className="w-full border border-gray-200 bg-white px-9 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <Select options={statusOptions} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} />
            <Select options={categoryOptions} value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} />
            <Select options={availabilityOptions} value={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.value)} />
            <Select options={healthOptions} value={healthFilter} onChange={event => setHealthFilter(event.target.value)} />
          </div>
        </Card>

        {selectedIds.length > 0 && (
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{selectedIds.length} selected</span>
              <Button size="sm" variant="secondary" onClick={() => handleBulkStatus('active')}>Activate</Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkStatus('inactive')}>Deactivate</Button>
              <Button size="sm" variant="ghost" onClick={handleBulkArchive}>Archive</Button>
              <Select
                options={resourceCategoryOptions}
                value=""
                onChange={event => handleBulkCategory(event.target.value)}
                className="min-w-[180px]"
              />
              <Button size="sm" variant="secondary" onClick={handleBulkDuplicate}>Duplicate</Button>
            </div>
          </Card>
        )}

        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1550px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 border-b border-r border-gray-100 bg-gray-50 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={event => setSelectedIds(event.target.checked ? allFilteredIds : [])}
                        className="rounded border-gray-300"
                      />
                      <span>Resource</span>
                    </div>
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Category</th>
                  <th className="border-b border-gray-100 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Price</th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Availability</th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Variants</th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Status</th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Health</th>
                  {showPerformanceColumn && (
                    <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Performance</th>
                  )}
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Updated</th>
                  <th className="border-b border-gray-100 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={showPerformanceColumn ? 10 : 9} className="px-6 py-14 text-center">
                      <p className="text-sm font-medium text-gray-900">{resources.length === 0 ? 'No resources yet' : 'No matching resources'}</p>
                      <p className="mt-1 text-sm text-gray-500">{emptyStateMessage}</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(row => {
                    const { resource } = row;
                    const isInlineEditing = inlineEditId === resource.id;
                    const status = statusBadge[resource.status];
                    const isSelected = selectedIds.includes(resource.id);

                    return (
                      <tr key={resource.id} className="group hover:bg-gray-50/70">
                        <td className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-4 py-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={event =>
                                setSelectedIds(prev =>
                                  event.target.checked
                                    ? [...prev, resource.id]
                                    : prev.filter(id => id !== resource.id)
                                )
                              }
                              className="mt-1 rounded border-gray-300"
                            />
                            {resource.imageUrl ? (
                              <img src={resource.imageUrl} alt={resource.title} className="h-10 w-10 object-cover border border-gray-200" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center border border-gray-200 bg-gray-50 text-gray-400">
                                <ImageOff size={15} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {isInlineEditing ? (
                                <div className="space-y-2">
                                  <input
                                    value={inlineTitle}
                                    onChange={event => setInlineTitle(event.target.value)}
                                    className="w-full border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-blue-300"
                                  />
                                  <Select
                                    options={resourceCategoryOptions}
                                    value={inlineCategory}
                                    onChange={event => setInlineCategory(event.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveInlineEdit(resource.id)}
                                      className="border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setInlineEditId(null)}
                                      className="border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-gray-900">{resource.title}</p>
                                    <span className="bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{resource.categoryName}</span>
                                  </div>
                                  <p className="mt-0.5 truncate text-[11px] font-mono text-gray-500">{resource.slug}</p>
                                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                    <span>{row.variantCount} variants</span>
                                    <span>{row.basePrice ? `from ${row.basePrice.toLocaleString()} RUB/day` : 'no price'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3 text-sm text-gray-700">{resource.categoryName}</td>
                        <td className="border-b border-gray-100 px-4 py-3 text-right text-sm text-gray-700">
                          {row.basePrice ? `${row.basePrice.toLocaleString()} RUB` : 'Missing'}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-900">{availabilityLabel(row)}</p>
                            <p className="text-[11px] text-gray-500 capitalize">{row.availabilityState.replace('_', ' ')}</p>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-900">{row.variantCount} variants</p>
                            <p className="text-[11px] text-gray-500">{row.activeVariants} active</p>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {resource.status !== 'archived' && (
                              <button
                                onClick={() => toggleInlineStatus(resource.id)}
                                className="border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition hover:text-gray-900"
                              >
                                {resource.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-900">
                              {row.healthState === 'ready' ? 'Ready' : `${row.completenessScore}% complete`}
                            </p>
                            <p className="text-[11px] text-gray-500">{row.healthLabel}</p>
                          </div>
                        </td>
                        {showPerformanceColumn && (
                          <td className="border-b border-gray-100 px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-900">{row.bookingCount} bookings</p>
                              <p className="text-[11px] text-gray-500">{row.revenue.toLocaleString()} RUB</p>
                            </div>
                          </td>
                        )}
                        <td className="border-b border-gray-100 px-4 py-3 text-sm text-gray-700">
                          {new Date(resource.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-100 transition group-hover:opacity-100">
                            <button
                              onClick={() => {
                                setSelected(resource);
                                setView('detail');
                              }}
                              className="border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                              title="View"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => beginInlineEdit(resource)}
                              className="border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                              title="Quick edit"
                            >
                              <Settings2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                setSelected(resource);
                                setView('edit');
                              }}
                              className="border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                              title="Edit"
                            >
                              <Archive size={0} className="hidden" />
                              <span className="sr-only">Edit</span>
                              <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDuplicate(resource)}
                              className="border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                              title="Duplicate"
                            >
                              <Copy size={13} />
                            </button>
                            {resource.status !== 'archived' && (
                              <button
                                onClick={() => handleArchive(resource)}
                                className="border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-red-600"
                                title="Archive"
                              >
                                <Archive size={13} />
                              </button>
                            )}
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
      </div>
    </div>
  );
}

function availabilityLabel(row: ResourceTableRow) {
  if (row.availabilityState === 'no_stock') return 'No stock';
  if (row.availabilityState === 'fully_booked') return 'Fully booked';
  return `${row.availableStock} / ${row.totalStock} available`;
}
