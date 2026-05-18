import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { OfferDetail } from './OfferDetail';
import { OfferForm, type OfferFormData } from './OfferForm';
import { OfferListTable } from './OfferListTable';
import { ApiError, offersApi, pricingApi, resourcesApi } from '../../lib/api-client';
import type { Offer, OfferStatus, Resource } from '../../types';

type View = 'list' | 'detail' | 'create' | 'edit';

function mergeOfferPricing(offer: Offer, data: OfferFormData): Offer {
  return {
    ...offer,
    basePrice: data.pricingBaseAmount,
    price: data.pricingBaseAmount ?? null,
    currency: data.pricingCurrency || 'RUB',
  };
}

async function enrichOfferPrices(offers: Offer[]) {
  return Promise.all(offers.map(async offer => {
    try {
      const policy = await pricingApi.getOfferPolicy(offer.offerId);
      return {
        ...offer,
        basePrice: policy.baseAmount ?? policy.unitRules?.baseAmount,
        price: policy.baseAmount ?? policy.unitRules?.baseAmount ?? null,
        currency: policy.currency || offer.currency || 'RUB',
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return offer;
      return offer;
    }
  }));
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const [nextResources, nextOffers] = await Promise.all([
        resourcesApi.list(),
        offersApi.list(),
      ]);
      setResources(nextResources);
      setOffers(await enrichOfferPrices(nextOffers));
    } catch (err) {
      setError(err instanceof ApiError
        ? `Не удалось загрузить предложения из API: ${err.message}`
        : 'Не удалось загрузить предложения из API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = offers.filter(offer => {
    const matchesStatus = !statusFilter || offer.status === statusFilter;
    const matchesResource = !resourceFilter || offer.primaryResourceId === resourceFilter || offer.resourceId === resourceFilter;
    const resourceTitle = resourceById.get(offer.primaryResourceId)?.title ?? offer.resourceTitle ?? '';
    const matchesQuery =
      !query ||
      [offer.title, resourceTitle, offer.slug, offer.offerId]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase());
    return matchesStatus && matchesResource && matchesQuery;
  });

  const readyCount = filtered.filter(offer => offer.isPublishable).length;

  const resourceTitleOf = (offer: Offer) =>
    resourceById.get(offer.primaryResourceId)?.title ||
    offer.resourceTitle ||
    offer.primaryResourceId ||
    'Не выбран';

  const updateOfferInState = (nextOffer: Offer) => {
    setOffers(prev => prev.map(offer => (offer.offerId === nextOffer.offerId ? nextOffer : offer)));
    setSelected(current => current?.offerId === nextOffer.offerId ? nextOffer : current);
  };

  const handleCreate = async (data: OfferFormData) => {
    setError('');
    setSaving(true);
    try {
      const nextOffer = await offersApi.create({
        primaryResourceId: data.primaryResourceId || data.resourceId || resourceFilter || '',
        offerType: data.offerType || 'rental',
        bookingFlowType: data.bookingFlowType || 'direct_checkout',
        variantExposureMode: data.variantExposureMode || 'all_active_variants',
        title: data.title || 'Новое предложение',
        description: data.description || undefined,
      });
      if (data.variantExposureMode === 'selected_variants_only' && data.selectedVariantIds?.length) {
        await Promise.all(data.selectedVariantIds.map((variantId, index) =>
          offersApi.putVariantExposure(nextOffer.offerId, variantId, {
            isRequiredForBooking: true,
            displayLabelOverride: null,
            visibilityStatus: 'visible',
            sortOrder: index,
          })
        ));
      }
      await pricingApi.putOfferPolicy(nextOffer.offerId, {
        pricingMode: data.pricingMode || 'per_unit_time',
        currency: data.pricingCurrency || 'RUB',
        baseAmount: data.pricingBaseAmount ?? null,
        adjustmentRules: data.adjustmentRules ?? [],
        status: data.pricingStatus || 'active',
      });
      setOffers(prev => [mergeOfferPricing(nextOffer, data), ...prev]);
      setView('list');
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось создать предложение: ${err.message}` : 'Не удалось создать предложение.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: OfferFormData) => {
    if (!selected) return;
    setError('');
    setSaving(true);
    try {
      const nextOffer = await offersApi.patch(selected.offerId, {
        title: data.title,
        description: data.description,
      });
      await pricingApi.putOfferPolicy(selected.offerId, {
        pricingMode: data.pricingMode || 'per_unit_time',
        currency: data.pricingCurrency || 'RUB',
        baseAmount: data.pricingBaseAmount ?? null,
        adjustmentRules: data.adjustmentRules ?? [],
        status: data.pricingStatus || 'active',
      });
      updateOfferInState(mergeOfferPricing(nextOffer, data));
      setView('list');
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось обновить предложение: ${err.message}` : 'Не удалось обновить предложение.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (offer: Offer, status: OfferStatus) => {
    setError('');
    setSaving(true);
    try {
      const nextOffer =
        status === 'active'
          ? await offersApi.activate(offer.offerId)
          : status === 'inactive'
            ? await offersApi.deactivate(offer.offerId)
            : status === 'archived'
              ? await offersApi.archive(offer.offerId, 'provider_requested')
              : await offersApi.patch(offer.offerId, {});
      updateOfferInState(nextOffer);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось изменить статус предложения: ${err.message}` : 'Не удалось изменить статус предложения.');
    } finally {
      setSaving(false);
    }
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
              void handleStatusChange(selected, status);
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
          <OfferForm
            resources={resources}
            onSubmit={handleCreate}
            onCancel={() => setView('list')}
            initialResourceId={resourceFilter || undefined}
            submitting={saving}
          />
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
          <OfferForm
            offer={selected}
            resources={resources}
            onSubmit={handleUpdate}
            onCancel={() => setView('list')}
            submitting={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Предложения</h2>
            <p className="text-xs text-gray-500">
              Строк: {filtered.length} · готово: {readyCount} · всего: {offers.length}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setView('create')}>
            <Plus size={13} /> Добавить
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <OfferListTable
          offers={filtered}
          loading={loading}
          saving={saving}
          query={query}
          resourceFilter={resourceFilter}
          statusFilter={statusFilter}
          resourceOptions={resourceOptions}
          onQueryChange={setQuery}
          onResourceFilterChange={setResourceFilter}
          onStatusFilterChange={setStatusFilter}
          onOpenDetail={offer => {
            setSelected(offer);
            setView('detail');
          }}
          onEdit={offer => {
            setSelected(offer);
            setView('edit');
          }}
          onStatusChange={(offer, status) => void handleStatusChange(offer, status)}
          resourceTitleOf={resourceTitleOf}
        />
      </div>
    </div>
  );
}
