import { useEffect, useState } from 'react';
import {
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
import type { Resource, ResourceVariant } from '../../types';

const resources: Resource[] = [];

const resourceOptions = [
  { value: '', label: 'All resources' },
  ...resources.map(resource => ({ value: resource.id, label: resource.title })),
];

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function VariantsPage() {
  const [variants, setVariants] = useState<ResourceVariant[]>([]);
  const [resourceFilter, setResourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ResourceVariant | null>(null);

  const filtered = variants.filter(variant => {
    const matchesResource = !resourceFilter || variant.resourceId === resourceFilter;
    const matchesStatus = !statusFilter || variant.status === statusFilter;
    const haystack = [
      variant.title,
      variant.sku ?? '',
      resources.find(resource => resource.id === variant.resourceId)?.title ?? '',
      ...Object.entries(variant.attributes).flatMap(([key, value]) => [key, value]),
    ]
      .join(' ')
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    return matchesResource && matchesStatus && matchesQuery;
  });

  const resourceOf = (id: string) => resources.find(resource => resource.id === id)?.title || id;

  const toggle = (id: string) => {
    setVariants(prev =>
      prev.map(variant =>
        variant.id === id
          ? { ...variant, status: variant.status === 'active' ? 'inactive' : 'active' }
          : variant
      )
    );
  };

  const moveOrder = (id: string, direction: 1 | -1) => {
    setVariants(prev => {
      const target = prev.find(variant => variant.id === id);
      if (!target) return prev;

      const siblings = prev
        .filter(variant => variant.resourceId === target.resourceId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const index = siblings.findIndex(variant => variant.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return prev;

      const reordered = [...siblings];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      const mapping = new Map(
        reordered.map((variant, siblingIndex) => [
          variant.id,
          { ...variant, sortOrder: siblingIndex + 1 },
        ])
      );

      return prev.map(variant => mapping.get(variant.id) ?? variant);
    });
  };

  const handleSave = (data: Partial<ResourceVariant>) => {
    if (editTarget) {
      setVariants(prev =>
        prev.map(variant =>
          variant.id === editTarget.id
            ? { ...variant, ...data, resourceId: data.resourceId ?? variant.resourceId }
            : variant
        )
      );
    } else {
      const resourceId = data.resourceId || resourceFilter || '';
      const sortOrder =
        variants.filter(variant => variant.resourceId === resourceId).length + 1;

      setVariants(prev => [
        ...prev,
        {
          id: `var-${Date.now()}`,
          resourceId,
          title: data.title || 'New Variant',
          status: 'active',
          attributes: data.attributes || {},
          sortOrder,
          createdAt: new Date().toISOString(),
          ...data,
        },
      ]);
    }

    setShowForm(false);
    setEditTarget(null);
  };

  const lowStockCount = filtered.filter(variant => variant.stock !== undefined && variant.stock <= 2).length;

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Variants</h2>
            <p className="text-xs text-gray-500">
              {filtered.length} rows · {lowStockCount} low stock · {variants.length} total
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditTarget(null);
                setShowForm(true);
              }}
            >
              <PackagePlus size={13} /> Add
            </Button>
          </div>
        </div>

        <Card className="p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search title, SKU, resource, attribute..."
                className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <Select options={resourceOptions} value={resourceFilter} onChange={event => setResourceFilter(event.target.value)} />
            <Select options={statusOptions} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} />
          </div>
        </Card>

        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 border-b border-r border-gray-100 bg-gray-50 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Variant
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Resource
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    SKU
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Attributes
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Stock
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Status
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Order
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                      No variants found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((variant, index) => {
                    const lowStock = variant.stock !== undefined && variant.stock <= 2;
                    return (
                      <tr key={variant.id} className="hover:bg-gray-50/70">
                        <td className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{variant.title}</p>
                            <p className="text-[11px] text-gray-500">#{variant.id}</p>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                          {resourceOf(variant.resourceId)}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-xs font-mono text-gray-600">
                          {variant.sku || '—'}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(variant.attributes).map(([key, value]) => (
                              <span key={key} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-right text-sm text-gray-700">
                          <span className={lowStock ? 'font-semibold text-amber-700' : ''}>{variant.stock ?? '—'}</span>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <Badge variant={variant.status === 'active' ? 'green' : 'gray'}>
                            {variant.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => moveOrder(variant.id, -1)}
                              disabled={index === 0}
                              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <span className="min-w-8 text-center text-xs text-gray-500">{variant.sortOrder}</span>
                            <button
                              onClick={() => moveOrder(variant.id, 1)}
                              disabled={index === filtered.length - 1}
                              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditTarget(variant);
                                setShowForm(true);
                              }}
                              className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => toggle(variant.id)}
                              className="rounded-md border border-gray-200 bg-white p-1 text-gray-500 transition hover:text-emerald-600"
                              title={variant.status === 'active' ? 'Deactivate' : 'Activate'}
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
          initialResourceId={resourceFilter}
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
  initialResourceId,
  onSave,
  onClose,
}: {
  open: boolean;
  variant: ResourceVariant | null;
  initialResourceId: string;
  onSave: (data: Partial<ResourceVariant>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [resourceId, setResourceId] = useState(initialResourceId);
  const [stock, setStock] = useState('');
  const [attr1Key, setAttr1Key] = useState('size');
  const [attr1Val, setAttr1Val] = useState('');

  useEffect(() => {
    setTitle(variant?.title || '');
    setSku(variant?.sku || '');
    setResourceId(variant?.resourceId || initialResourceId);
    setStock(String(variant?.stock ?? ''));
    setAttr1Key(Object.keys(variant?.attributes || {})[0] || 'size');
    setAttr1Val(String(Object.values(variant?.attributes || {})[0] || ''));
  }, [variant, initialResourceId, open]);

  const handleSave = () => {
    onSave({
      title,
      sku: sku || undefined,
      resourceId,
      stock: stock ? parseInt(stock, 10) : undefined,
      attributes: attr1Key && attr1Val ? { [attr1Key]: attr1Val } : {},
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={variant ? 'Edit Variant' : 'Add Variant'}>
      <div className="space-y-3">
        <Select
          label="Resource"
          options={resourceOptions}
          value={resourceId}
          onChange={event => setResourceId(event.target.value)}
        />
        <Input label="Title" value={title} onChange={event => setTitle(event.target.value)} />
        <Input label="SKU" value={sku} onChange={event => setSku(event.target.value)} />
        <Input label="Stock" type="number" value={stock} onChange={event => setStock(event.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Attribute" value={attr1Key} onChange={event => setAttr1Key(event.target.value)} />
          <Input label="Value" value={attr1Val} onChange={event => setAttr1Val(event.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="primary" onClick={handleSave}>{variant ? 'Save' : 'Create'}</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
