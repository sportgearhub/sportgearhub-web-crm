import { useEffect, useState } from 'react';
import { ChevronLeft, CreditCard as Edit2, Plus, Power, PowerOff } from 'lucide-react';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ApiError, offersApi, pricingApi } from '../../lib/api-client';
import type { Offer, OfferStatus, Resource } from '../../types';
import { OfferDetail } from '../offers/OfferDetail';
import { OfferForm, type OfferFormData } from '../offers/OfferForm';
import { OfferReadinessChecklist } from '../offers/OfferReadinessChecklist';
import {
  bookingFlowLabel,
  offerTypeLabel,
  variantExposureLabel,
} from '../offers/offerDisplay';

type OffersView = 'list' | 'detail' | 'create' | 'edit';

const statusBadge: Record<OfferStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Активно', variant: 'green' },
  draft: { label: 'Черновик', variant: 'yellow' },
  inactive: { label: 'Неактивно', variant: 'gray' },
  archived: { label: 'В архиве', variant: 'gray' },
};

function mergeOfferPricing(offer: Offer, data: OfferFormData): Offer {
  return {
    ...offer,
    basePrice: data.pricingBaseAmount,
    price: data.pricingBaseAmount ?? null,
    currency: data.pricingCurrency || 'RUB',
  };
}

function readOffersViewFromUrl(): { view: OffersView; offerId: string | null } {
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') !== 'offers') return { view: 'list', offerId: null };
  const view = params.get('view');
  return {
    view: view === 'create' || view === 'detail' || view === 'edit' ? view : 'list',
    offerId: params.get('offerId'),
  };
}

function writeOffersViewToUrl(view: OffersView, offerId?: string | null) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', 'offers');
  if (view === 'list') {
    params.delete('view');
    params.delete('offerId');
  } else {
    params.set('view', view);
    if (offerId) params.set('offerId', offerId);
    else params.delete('offerId');
  }
  window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
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

interface ResourceOffersTabProps {
  resource: Resource;
  onNavigate?: (path: string) => void;
}

export function ResourceOffersTab({ resource, onNavigate }: ResourceOffersTabProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<Offer | null>(null);
  const [view, setView] = useState<OffersView>(() => readOffersViewFromUrl().view);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadOffers = async () => {
    setLoading(true);
    setError('');
    try {
      const nextOffers = await offersApi.list();
      const resourceOffers = nextOffers.filter(offer => offer.primaryResourceId === resource.resourceId || offer.resourceId === resource.resourceId);
      setOffers(await enrichOfferPrices(resourceOffers));
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось загрузить предложения: ${err.message}` : 'Не удалось загрузить предложения.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOffers();
  }, [resource.resourceId]);

  useEffect(() => {
    const syncFromHistory = () => {
      const next = readOffersViewFromUrl();
      setView(next.view);
      setSelected(current => {
        if (next.offerId) return offers.find(offer => offer.offerId === next.offerId) ?? current;
        return next.view === 'list' || next.view === 'create' ? null : current;
      });
    };
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, [offers]);

  useEffect(() => {
    const next = readOffersViewFromUrl();
    if (!next.offerId) return;
    const offer = offers.find(item => item.offerId === next.offerId);
    if (offer) setSelected(offer);
  }, [offers]);

  const openList = () => {
    writeOffersViewToUrl('list');
    setSelected(null);
    setView('list');
  };

  const openCreate = () => {
    writeOffersViewToUrl('create');
    setSelected(null);
    setView('create');
  };

  const openDetail = (offer: Offer) => {
    writeOffersViewToUrl('detail', offer.offerId);
    setSelected(offer);
    setView('detail');
  };

  const openEdit = (offer: Offer) => {
    writeOffersViewToUrl('edit', offer.offerId);
    setSelected(offer);
    setView('edit');
  };

  const updateOfferInState = (nextOffer: Offer) => {
    setOffers(prev => prev.map(offer => (offer.offerId === nextOffer.offerId ? nextOffer : offer)));
    setSelected(current => current?.offerId === nextOffer.offerId ? nextOffer : current);
  };

  const handleCreate = async (data: OfferFormData) => {
    setSaving(true);
    setError('');
    try {
      const nextOffer = await offersApi.create({
        primaryResourceId: resource.resourceId,
        offerType: data.offerType || 'rental',
        bookingFlowType: data.bookingFlowType || 'direct_checkout',
        variantExposureMode: data.variantExposureMode || 'all_active_variants',
        title: data.title || `Прокат: ${resource.title}`,
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
      openList();
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось создать предложение: ${err.message}` : 'Не удалось создать предложение.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: OfferFormData) => {
    if (!selected) return;
    setSaving(true);
    setError('');
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
      openList();
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось обновить предложение: ${err.message}` : 'Не удалось обновить предложение.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (offer: Offer, status: OfferStatus) => {
    setSaving(true);
    setError('');
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
      <div className="space-y-3">
        <BackButton onClick={openList} />
        <OfferDetail
          offer={selected}
          onConfigurePolicy={() => onNavigate?.('/policy')}
          onEdit={() => openEdit(selected)}
          onStatusChange={status => void handleStatusChange(selected, status)}
        />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="space-y-3">
        <BackButton onClick={openList} />
        <OfferForm
          resources={[resource]}
          initialResourceId={resource.resourceId}
          onSubmit={handleCreate}
          onCancel={openList}
          submitting={saving}
        />
      </div>
    );
  }

  if (view === 'edit' && selected) {
    return (
      <div className="space-y-3">
        <BackButton onClick={openList} />
        <OfferForm
          offer={selected}
          resources={[resource]}
          initialResourceId={resource.resourceId}
          onSubmit={handleUpdate}
          onCancel={openList}
          submitting={saving}
        />
      </div>
    );
  }

  const readyCount = offers.filter(offer => offer.isPublishable).length;

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="p-4">
        <CardHeader
          title="Предложения"
          subtitle={`Клиентские предложения для позиции “${resource.title}”. Готово к публикации: ${readyCount} из ${offers.length}.`}
          action={
            <Button size="sm" variant="primary" onClick={openCreate}>
              <Plus size={13} /> Добавить
            </Button>
          }
        />

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] table-fixed text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="w-[34%] px-4 py-2 text-left">Предложение</th>
              <th className="w-[12%] px-4 py-2 text-right">Цена</th>
              <th className="w-[24%] px-4 py-2 text-left">Публикация</th>
              <th className="w-[14%] px-4 py-2 text-left">Статус</th>
              <th className="w-[10%] px-4 py-2 text-left">Обновлено</th>
              <th className="w-[6%] px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">Загружаем предложения...</td>
              </tr>
            ) : offers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  Для этой позиции пока нет предложений.
                </td>
              </tr>
            ) : offers.map(offer => {
              const status = statusBadge[offer.status];
              return (
                <tr key={offer.offerId || offer.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button type="button" className="flex max-w-full items-center gap-3 text-left" onClick={() => openDetail(offer)}>
                      {offer.mediaPreviewUrl ? (
                        <img src={offer.mediaPreviewUrl} alt="" className="h-10 w-10 shrink-0 rounded-md border border-gray-200 object-cover" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-md border border-dashed border-gray-200 bg-gray-50" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900">{offer.title}</span>
                        <span className="mt-0.5 flex flex-wrap gap-1 text-[11px] text-gray-500">
                          <span>{offerTypeLabel(offer.offerType)}</span>
                          <span>· {bookingFlowLabel(offer.bookingFlowType)}</span>
                          <span>· {variantExposureLabel(offer.variantExposureMode)}</span>
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {typeof offer.basePrice === 'number' ? `${offer.basePrice.toLocaleString()} ${offer.currency ?? 'RUB'}` : 'Не задана'}
                  </td>
                  <td className="px-4 py-2.5">
                    <OfferReadinessChecklist offer={offer} compact />
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {new Date(offer.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <ActionMenu
                      label={`Действия с предложением ${offer.title}`}
                      disabled={saving}
                      className="justify-end"
                      items={[
                        { label: 'Изменить', icon: <Edit2 size={14} />, onClick: () => openEdit(offer) },
                        offer.status === 'active'
                          ? { label: 'Отключить', icon: <PowerOff size={14} />, onClick: () => void handleStatusChange(offer, 'inactive'), disabled: saving }
                          : { label: 'Включить', icon: <Power size={14} />, onClick: () => void handleStatusChange(offer, 'active'), disabled: saving || !offer.isPublishable },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
      <ChevronLeft size={14} /> Назад к предложениям
    </button>
  );
}
