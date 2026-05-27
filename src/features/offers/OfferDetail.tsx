import { useEffect, useState } from 'react';
import { CreditCard as Edit2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ApiError, offersApi } from '../../lib/api-client';
import type { Offer, OfferReadiness, OfferRoutability, OfferStatus, OfferVisibility } from '../../types';
import { OfferReadinessChecklist } from './OfferReadinessChecklist';
import { offerBookingSetupReady, offerCustomerVisible } from './offerReadiness';
import {
  bookingFlowLabel,
  offerTypeLabel,
  publishabilityLabel,
  variantExposureLabel,
} from './offerDisplay';

const statusBadge: Record<OfferStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Активно', variant: 'green' },
  draft: { label: 'Черновик', variant: 'yellow' },
  inactive: { label: 'Неактивно', variant: 'gray' },
  archived: { label: 'В архиве', variant: 'gray' },
};

interface OfferDetailProps {
  offer: Offer;
  onEdit: () => void;
  onStatusChange: (s: OfferStatus) => void;
  onConfigurePolicy?: () => void;
}

export function OfferDetail({ offer, onEdit, onStatusChange, onConfigurePolicy }: OfferDetailProps) {
  const sb = statusBadge[offer.status];
  const [visibility, setVisibility] = useState<OfferVisibility | null>(offer.visibility ?? null);
  const [readiness, setReadiness] = useState<OfferReadiness | undefined>(offer.readiness);
  const [visibilityDraft, setVisibilityDraft] = useState<OfferVisibility>({
    visibilityMode: 'always_visible',
    visibleFrom: null,
    visibleUntil: null,
    status: 'active',
  });
  const [routability, setRoutability] = useState<OfferRoutability | null>(null);
  const [diagnosticsError, setDiagnosticsError] = useState('');
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDiagnosticsError('');

    Promise.all([
      offersApi.getVisibility(offer.offerId).catch(err => {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }),
      offersApi.getRoutability(offer.offerId).catch(err => {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }),
      offersApi.getReadiness(offer.offerId).catch(err => {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }),
    ])
      .then(([nextVisibility, nextRoutability, nextReadiness]) => {
        if (cancelled) return;
        if (nextVisibility) {
          setVisibility(nextVisibility);
          setVisibilityDraft(nextVisibility);
        }
        if (nextRoutability) setRoutability(nextRoutability);
        if (nextReadiness) setReadiness(nextReadiness);
      })
      .catch(err => {
        if (!cancelled) setDiagnosticsError(err instanceof ApiError ? err.message : 'Не удалось загрузить видимость и маршрутизацию.');
      });

    return () => {
      cancelled = true;
    };
  }, [offer.offerId]);

  const offerWithReadiness = { ...offer, readiness };

  const saveVisibility = async () => {
    setSavingVisibility(true);
    setDiagnosticsError('');
    try {
      const nextVisibility = await offersApi.putVisibility(offer.offerId, visibilityDraft);
      setVisibility(nextVisibility);
      setVisibilityDraft(nextVisibility);
    } catch (err) {
      setDiagnosticsError(err instanceof ApiError ? err.message : 'Не удалось сохранить видимость.');
    } finally {
      setSavingVisibility(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {offer.mediaPreviewUrl ? (
            <img src={offer.mediaPreviewUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover" />
          ) : (
            <span className="h-14 w-14 shrink-0 rounded-lg border border-dashed border-gray-200 bg-gray-50" />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900">{offer.title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {offerTypeLabel(offer.offerType)} · {bookingFlowLabel(offer.bookingFlowType)} · {variantExposureLabel(offer.variantExposureMode)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={sb.variant} size="md">{sb.label}</Badge>
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Edit2 size={13} /> Редактировать
          </Button>
          {offer.status === 'draft' && (
            <Button size="sm" variant="primary" onClick={() => onStatusChange('active')} disabled={!offerBookingSetupReady(offerWithReadiness)}>
              Включить
            </Button>
          )}
          {offer.status === 'active' && (
            <Button size="sm" variant="ghost" onClick={() => onStatusChange('inactive')}>
              Отключить
            </Button>
          )}
          {offer.status === 'inactive' && (
            <Button size="sm" variant="primary" onClick={() => onStatusChange('active')}>
              Включить
            </Button>
          )}
        </div>
      </div>

      {!offerBookingSetupReady(offerWithReadiness) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-xs font-semibold text-amber-800">Проблемы публикации</p>
          </div>
          <p className="text-xs text-amber-700">
            {offer.publishability?.reason || offer.publishabilityIssues?.[0] || 'Есть блокеры публикации.'}
          </p>
        </div>
      )}

      {offerBookingSetupReady(offerWithReadiness) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle size={14} className="text-emerald-600" />
          <p className="text-xs text-emerald-800 font-medium">
            {offerCustomerVisible(offerWithReadiness) ? 'Предложение видно клиентам и готово к аренде.' : 'Настройка бронирования готова.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Детали предложения</h3>
          <div className="space-y-2">
            <Row label="Инвентарь" value={offer.resourceTitle || offer.primaryResourceId} />
            <Row label="Цена" value={`${typeof offer.basePrice === 'number' ? offer.basePrice.toLocaleString() : '—'} ${offer.currency ?? 'RUB'}`} />
            <Row label="Публикация" value={publishabilityLabel(offer)} />
            <Row label="Видимость" value={visibilityLabel(visibility)} />
            <Row label="Маршрутизация" value={routability?.routable ? 'Готова' : routability ? 'Есть блокеры' : 'Не проверена'} />
            <Row label="Canonical offer" value={offer.canonicalOfferId || '—'} />
          </div>
        </Card>

        <Card>
          <OfferReadinessChecklist offer={offerWithReadiness} onConfigurePolicy={onConfigurePolicy} />
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Видимость и маршрутизация</h3>
            <p className="mt-0.5 text-xs text-gray-500">Активное предложение считается доступным клиентам только вместе с видимостью и routability.</p>
          </div>
          <Badge variant={offerCustomerVisible(offerWithReadiness) ? 'green' : 'yellow'}>
            {offerCustomerVisible(offerWithReadiness) ? 'Видимо клиентам' : 'Нужно проверить'}
          </Badge>
        </div>
        {diagnosticsError && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{diagnosticsError}</p>
        )}
        <div className="grid gap-3 md:grid-cols-[1fr_140px_140px]">
          <Select
            label="Режим"
            value={visibilityDraft.visibilityMode}
            onChange={event => setVisibilityDraft(current => ({ ...current, visibilityMode: event.target.value }))}
            options={[
              { value: 'always_visible', label: 'Всегда видно' },
              { value: 'seasonal', label: 'Сезонно' },
              { value: 'hidden', label: 'Скрыто' },
            ]}
          />
          <Input
            label="С"
            type="date"
            value={visibilityDraft.visibleFrom ?? ''}
            disabled={visibilityDraft.visibilityMode !== 'seasonal'}
            onChange={event => setVisibilityDraft(current => ({ ...current, visibleFrom: event.target.value || null }))}
          />
          <Input
            label="До"
            type="date"
            value={visibilityDraft.visibleUntil ?? ''}
            disabled={visibilityDraft.visibilityMode !== 'seasonal'}
            onChange={event => setVisibilityDraft(current => ({ ...current, visibleUntil: event.target.value || null }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" loading={savingVisibility} onClick={saveVisibility}>
            Сохранить видимость
          </Button>
          <span className="text-xs text-gray-500">
            Routability: {routability?.reasonCodes?.length ? routability.reasonCodes.join(', ') : routability?.routable ? 'без блокеров' : 'нет данных'}
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">История</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Row label="Создан" value={offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          <Row label="Обновлен" value={new Date(offer.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })} />
        </div>
      </Card>

      {offer.description && (
        <Card>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Описание</h3>
          <p className="text-sm text-gray-700">{offer.description}</p>
        </Card>
      )}
    </div>
  );
}

function visibilityLabel(visibility: OfferVisibility | null) {
  if (!visibility) return 'Не загружена';
  if (visibility.visibilityMode === 'hidden') return 'Скрыто';
  if (visibility.visibilityMode === 'seasonal') return `${visibility.visibleFrom ?? '—'} - ${visibility.visibleUntil ?? '—'}`;
  return 'Всегда видно';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900">{value}</span>
    </div>
  );
}
