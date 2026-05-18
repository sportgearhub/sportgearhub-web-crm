import { useState } from 'react';
import { ChevronLeft, CreditCard as Edit2, Eye, Plus, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { OfferDetail } from './OfferDetail';
import { OfferForm } from './OfferForm';
import type { Offer, OfferStatus, Resource } from '../../types';

const statusBadge: Record<OfferStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Активно', variant: 'green' },
  draft: { label: 'Черновик', variant: 'yellow' },
  inactive: { label: 'Неактивно', variant: 'gray' },
  archived: { label: 'В архиве', variant: 'gray' },
};

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активно' },
  { value: 'draft', label: 'Черновик' },
  { value: 'inactive', label: 'Неактивно' },
];

const resourceOptions = [
  { value: '', label: 'Все ресурсы' },
];

type View = 'list' | 'detail' | 'create' | 'edit';

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const resources: Resource[] = [];
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Offer | null>(null);

  const filtered = offers.filter(offer => {
    const matchesStatus = !statusFilter || offer.status === statusFilter;
    const matchesResource = !resourceFilter || offer.resourceId === resourceFilter;
    const matchesQuery =
      !query ||
      [offer.title, offer.resourceTitle, offer.slug]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase());
    return matchesStatus && matchesResource && matchesQuery;
  });

  const readyCount = filtered.filter(offer => offer.isPublishable).length;

  const handleCreate = (data: Partial<Offer>) => {
    const newOffer: Offer = {
      id: `off-${Date.now()}`,
      title: data.title || 'Новый оффер',
      slug: (data.title || 'new-offer').toLowerCase().replace(/\s+/g, '-'),
      status: 'draft',
      resourceId: data.resourceId || resourceFilter || '',
      resourceTitle:
        data.resourceTitle ||
        resources.find(resource => resource.id === (data.resourceId || resourceFilter))?.title ||
        '',
      description: data.description,
      basePrice: data.basePrice || 0,
      currency: 'RUB',
      durationUnit: data.durationUnit || 'day',
      durationValue: data.durationValue || 1,
      isPublishable: Boolean(data.title && data.basePrice),
      publishabilityIssues: data.title && data.basePrice ? [] : ['Нужны название и цена'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setOffers(prev => [newOffer, ...prev]);
    setView('list');
  };

  const handleUpdate = (data: Partial<Offer>) => {
    if (!selected) return;
    setOffers(prev =>
      prev.map(offer =>
        offer.id === selected.id ? { ...offer, ...data, updatedAt: new Date().toISOString() } : offer
      )
    );
    setView('list');
    setSelected(null);
  };

  const handleStatusChange = (id: string, status: OfferStatus) => {
    setOffers(prev => prev.map(offer => (offer.id === id ? { ...offer, status } : offer)));
  };

  if (view === 'detail' && selected) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => setView('list')} className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
            <ChevronLeft size={14} /> Назад
          </button>
          <OfferDetail
            offer={selected}
            onEdit={() => setView('edit')}
            onStatusChange={status => {
              handleStatusChange(selected.id, status);
              setSelected({ ...selected, status });
            }}
          />
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => setView('list')} className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
            <ChevronLeft size={14} /> Назад
          </button>
          <OfferForm onSubmit={handleCreate} onCancel={() => setView('list')} initialResourceId={resourceFilter || undefined} />
        </div>
      </div>
    );
  }

  if (view === 'edit' && selected) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => setView('list')} className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
            <ChevronLeft size={14} /> Назад
          </button>
          <OfferForm offer={selected} onSubmit={handleUpdate} onCancel={() => setView('list')} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Офферы</h2>
            <p className="text-xs text-gray-500">
              Строк: {filtered.length} · готово: {readyCount} · всего: {offers.length}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setView('create')}>
            <Plus size={13} /> Добавить
          </Button>
        </div>

        <Card className="p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Поиск по офферу, ресурсу, slug..."
                className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <Select options={resourceOptions} value={resourceFilter} onChange={event => setResourceFilter(event.target.value)} />
            <Select options={statusOptions} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} />
          </div>
        </Card>

        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1140px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 border-b border-r border-gray-100 bg-gray-50 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Оффер
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Ресурс
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Цена
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Длительность
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Публикация
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Статус
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Обновлено
                  </th>
                  <th className="border-b border-gray-100 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                      Офферы не найдены.
                    </td>
                  </tr>
                ) : (
                  filtered.map(offer => {
                    const status = statusBadge[offer.status];
                    return (
                      <tr key={offer.id} className="hover:bg-gray-50/70">
                        <td className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{offer.title}</p>
                            <p className="text-[11px] text-gray-500">{offer.slug}</p>
                          </div>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">{offer.resourceTitle}</td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-right text-sm text-gray-700">
                          {offer.basePrice.toLocaleString()} {offer.currency}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                          {offer.durationValue} {offer.durationUnit === 'hour' ? 'ч' : offer.durationUnit === 'week' ? 'нед.' : 'дн.'}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          {offer.isPublishable ? (
                            <span className="text-xs font-medium text-emerald-700">Готово</span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700">
                              Блокеров: {offer.publishabilityIssues.length || 1}
                            </span>
                          )}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                          {new Date(offer.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelected(offer);
                                setView('detail');
                              }}
                              className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => {
                                setSelected(offer);
                                setView('edit');
                              }}
                              className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                            >
                              <Edit2 size={13} />
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
      </div>
    </div>
  );
}
