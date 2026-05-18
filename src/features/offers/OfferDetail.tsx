import { CreditCard as Edit2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Offer, OfferStatus } from '../../types';
import { OfferReadinessChecklist } from './OfferReadinessChecklist';
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
            <Button size="sm" variant="primary" onClick={() => onStatusChange('active')} disabled={!offer.isPublishable}>
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

      {!offer.isPublishable && (
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

      {offer.isPublishable && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle size={14} className="text-emerald-600" />
          <p className="text-xs text-emerald-800 font-medium">Предложение готово к публикации.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Детали предложения</h3>
          <div className="space-y-2">
            <Row label="Инвентарь" value={offer.resourceTitle || offer.primaryResourceId} />
            <Row label="Цена" value={`${typeof offer.basePrice === 'number' ? offer.basePrice.toLocaleString() : '—'} ${offer.currency ?? 'RUB'}`} />
            <Row label="Публикация" value={publishabilityLabel(offer)} />
            <Row label="Canonical offer" value={offer.canonicalOfferId || '—'} />
          </div>
        </Card>

        <Card>
          <OfferReadinessChecklist offer={offer} onConfigurePolicy={onConfigurePolicy} />
        </Card>
      </div>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900">{value}</span>
    </div>
  );
}
