import { Archive, CalendarDays, CreditCard as Edit2, Package, Tag, Trash2, TrendingUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Booking, Offer, Resource, ResourceStatus, ResourceVariant } from '../../types';

const statusBadge: Record<ResourceStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Активен', variant: 'green' },
  draft: { label: 'Черновик', variant: 'yellow' },
  inactive: { label: 'Отключен', variant: 'gray' },
  archived: { label: 'В архиве', variant: 'gray' },
};

interface ResourceDetailProps {
  resource: Resource;
  onEdit: () => void;
  onArchive: () => void;
  onRemove: () => void;
  removing?: boolean;
  removeError?: string;
}

export function ResourceDetail({ resource, onEdit, onArchive, onRemove, removing = false, removeError = '' }: ResourceDetailProps) {
  const status = statusBadge[resource.status];
  const variants: ResourceVariant[] = [];
  const offers: Offer[] = [];
  const bookings: Booking[] = [];

  const totalStock = variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
  const offerPrices = offers
    .map(offer => offer.basePrice)
    .filter((price): price is number => typeof price === 'number');
  const basePrice = offerPrices.length > 0 ? Math.min(...offerPrices) : null;
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{resource.title}</h2>
            <Badge variant={status.variant} size="md">{status.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Edit2 size={13} /> Редактировать
          </Button>
          {resource.status !== 'archived' && (
            <Button size="sm" variant="ghost" onClick={onArchive}>
              <Archive size={13} /> В архив
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <DetailMetric label="Варианты" value={String(variants.length)} />
        <DetailMetric label="Базовая цена" value={basePrice ? `${basePrice.toLocaleString()} RUB` : 'Не задана'} />
        <DetailMetric label="Доступный остаток" value={String(totalStock)} />
        <DetailMetric label="Брони / выручка" value={`${bookings.length} / ${totalRevenue.toLocaleString()} RUB`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Package size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Обзор ресурса</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Row label="Категория" value={resource.categoryName ?? resource.resourceType} />
            <Row label="Создан" value={resource.createdAt ? new Date(resource.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Неизвестно'} />
            <Row label="Обновлен" value={new Date(resource.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })} />
            <Row label="Предложения" value={String(offers.length)} />
          </div>
          {resource.description && (
            <p className="mt-4 text-sm text-gray-700">{resource.description}</p>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Превью доступности</h3>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="bg-gray-50 px-2 py-2 text-gray-500">{day}</div>
            ))}
            {Array.from({ length: 14 }, (_, index) => (
              <div
                key={index}
                className={`px-2 py-3 text-xs ${
                  index % 5 === 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {index % 5 === 0 ? 'Занято' : 'Свободно'}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Временный календарь для будущей живой доступности и нагрузки по броням.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Tag size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Варианты</h3>
          </div>
          {variants.length === 0 ? (
            <p className="text-sm text-gray-500">Варианты пока не настроены.</p>
          ) : (
            <div className="overflow-hidden border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Вариант</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Остаток</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Цена</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={variant.id} className={index === variants.length - 1 ? '' : 'border-b border-gray-100'}>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium text-gray-900">{variant.title}</p>
                        {variant.sku && <p className="text-[11px] font-mono text-gray-500">{variant.sku}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700">{variant.stock ?? 0}</td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700">
                        {basePrice ? `${basePrice.toLocaleString()} RUB` : 'Ожидает'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={variant.status === 'active' ? 'green' : 'gray'}>
                          {variant.status === 'active' ? 'Активен' : 'Отключен'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Цены и показатели</h3>
          </div>
          <div className="space-y-3">
            <Row label="Базовая цена" value={basePrice ? `${basePrice.toLocaleString()} RUB` : 'Цена не задана'} />
            <Row label="Активные предложения" value={String(offers.filter(offer => offer.status === 'active').length)} />
            <Row label="Всего броней" value={String(bookings.length)} />
            <Row label="Всего выручки" value={`${totalRevenue.toLocaleString()} RUB`} />
          </div>
        </Card>
      </div>

      <Card className="border-red-200 bg-red-50/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-red-950">Опасная зона</h3>
            <p className="mt-1 text-xs text-red-700">
              Удаление доступно только для ресурсов без офферов, броней и записей выдачи.
            </p>
            {removeError && <p className="mt-2 text-xs font-medium text-red-700">{removeError}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            {removeError && resource.status !== 'archived' && (
              <Button size="sm" variant="secondary" onClick={onArchive}>
                <Archive size={13} /> Архивировать
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={onRemove} loading={removing}>
              <Trash2 size={13} /> Удалить
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-900">{value}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
