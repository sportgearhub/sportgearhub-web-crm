import { User, Calendar, Package, CreditCard, FileText } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import type { Booking, BookingStatus } from '../../types';

const statusBadge: Record<BookingStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }> = {
  confirmed: { label: 'Подтверждено', variant: 'green' },
  pending: { label: 'Ожидает', variant: 'yellow' },
  cancelled: { label: 'Отменено', variant: 'red' },
  completed: { label: 'Завершено', variant: 'blue' },
  no_show: { label: 'Неявка', variant: 'gray' },
};

interface BookingDetailProps {
  booking: Booking;
}

export function BookingDetail({ booking }: BookingDetailProps) {
  const s = statusBadge[booking.status];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 font-mono">{booking.ref}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Создано {new Date(booking.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Badge variant={s.variant} size="md">{s.label}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Клиент</h3>
          </div>
          <div className="space-y-2">
            <DetailRow label="Имя" value={booking.customer.name} />
            <DetailRow label="Email" value={booking.customer.email} />
            {booking.customer.phone && <DetailRow label="Телефон" value={booking.customer.phone} />}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Package size={14} className="text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Выбор</h3>
          </div>
          <div className="space-y-2">
            <DetailRow label="Предложение" value={booking.selection.offerTitle} />
            <DetailRow label="Инвентарь" value={booking.selection.resourceTitle} />
            {booking.selection.variantTitle && <DetailRow label="Модель" value={booking.selection.variantTitle} />}
            <DetailRow label="Количество" value={String(booking.selection.quantity)} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Расписание</h3>
          </div>
          <div className="space-y-2">
            <DetailRow
              label="Начало"
              value={new Date(booking.selection.startDate).toLocaleString('ru-RU', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            />
            {booking.selection.endDate && (
              <DetailRow
                label="Конец"
                value={new Date(booking.selection.endDate).toLocaleString('ru-RU', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              />
            )}
            <DetailRow label="Длительность" value={booking.selection.durationLabel} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Оплата</h3>
          </div>
          <div className="space-y-2">
            <DetailRow label="Итого" value={`${booking.totalAmount.toLocaleString()} ${booking.currency}`} />
            <DetailRow label="Статус" value="Оплачено" />
          </div>
        </Card>
      </div>

      {booking.notes && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Заметки</h3>
          </div>
          <p className="text-sm text-gray-700">{booking.notes}</p>
        </Card>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
