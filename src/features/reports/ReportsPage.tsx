import { BarChart2, TrendingUp, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Booking } from '../../types';

export function ReportsPage() {
  const bookings: Booking[] = [];
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Отчеты</h2>
          <p className="text-xs text-gray-500 mt-0.5">Обзор показателей партнера</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="yellow">прототип</Badge>
          <Button size="sm" variant="secondary" disabled>
            <Download size={13} /> Экспорт
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Всего бронирований" value={String(bookings.length)} />
        <MetricCard label="Завершено" value={String(completedBookings.length)} />
        <MetricCard label="Выручка подтвержденная" value={`${totalRevenue.toLocaleString()} RUB`} />
        <MetricCard label="Готовность каталога" value="0%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Бронирования по статусам</h3>
          </div>
          <div className="space-y-3">
            {(['confirmed', 'pending', 'completed', 'cancelled'] as const).map(status => {
              const count = bookings.filter(b => b.status === status).length;
              const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
              const colorMap = { confirmed: 'bg-emerald-500', pending: 'bg-amber-500', completed: 'bg-blue-500', cancelled: 'bg-red-400' };
              const labels = { confirmed: 'Подтверждено', pending: 'Ожидает', completed: 'Завершено', cancelled: 'Отменено' };
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{labels[status]}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`${colorMap[status]} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Лучшие офферы</h3>
          </div>
          <div className="space-y-3">
            {[
              { offer: 'Горный велосипед на день', bookings: 3, revenue: 9600 },
              { offer: 'Лыжный комплект на выходные', bookings: 2, revenue: 14400 },
              { offer: 'Каяк на полдня', bookings: 2, revenue: 4800 },
            ].map(row => (
              <div key={row.offer} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-900">{row.offer}</p>
                  <p className="text-[11px] text-gray-500">Бронирований: {row.bookings}</p>
                </div>
                <span className="text-xs font-semibold text-gray-900">{row.revenue.toLocaleString()} RUB</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Расширенная аналитика</h3>
          <Badge variant="yellow">ожидает API</Badge>
        </div>
        <p className="text-xs text-gray-500">
          Детальная аналитика по времени, разбивка выручки, эффективность выдачи и отчеты по удержанию клиентов появятся после подключения analytics API.
        </p>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </Card>
  );
}
