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
          <h2 className="text-sm font-semibold text-gray-900">Reports</h2>
          <p className="text-xs text-gray-500 mt-0.5">Provider performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="yellow">prototype</Badge>
          <Button size="sm" variant="secondary" disabled>
            <Download size={13} /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Bookings" value={String(bookings.length)} />
        <MetricCard label="Completed" value={String(completedBookings.length)} />
        <MetricCard label="Revenue (confirmed)" value={`${totalRevenue.toLocaleString()} RUB`} />
        <MetricCard label="Catalog Readiness" value="0%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Bookings by Status</h3>
          </div>
          <div className="space-y-3">
            {(['confirmed', 'pending', 'completed', 'cancelled'] as const).map(status => {
              const count = bookings.filter(b => b.status === status).length;
              const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
              const colorMap = { confirmed: 'bg-emerald-500', pending: 'bg-amber-500', completed: 'bg-blue-500', cancelled: 'bg-red-400' };
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 capitalize">{status}</span>
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
            <h3 className="text-sm font-semibold text-gray-900">Top Offers</h3>
          </div>
          <div className="space-y-3">
            {[
              { offer: 'Mountain Bike Daily', bookings: 3, revenue: 9600 },
              { offer: 'Ski Set Weekend', bookings: 2, revenue: 14400 },
              { offer: 'Kayak Half Day', bookings: 2, revenue: 4800 },
            ].map(row => (
              <div key={row.offer} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-900">{row.offer}</p>
                  <p className="text-[11px] text-gray-500">{row.bookings} booking{row.bookings !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-xs font-semibold text-gray-900">{row.revenue.toLocaleString()} RUB</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Advanced Analytics</h3>
          <Badge variant="yellow">pending_api</Badge>
        </div>
        <p className="text-xs text-gray-500">
          Detailed time-series analytics, revenue breakdowns, fulfillment efficiency metrics, and customer retention reports will be available through the analytics API.
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
