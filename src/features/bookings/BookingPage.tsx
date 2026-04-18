import { useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Search,
  Settings2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { BookingDetail } from './BookingDetail';
import { mockBookings } from '../../lib/mock-data';
import type { Booking, BookingStatus } from '../../types';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const statusBadge: Record<BookingStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }> = {
  confirmed: { label: 'Confirmed', variant: 'green' },
  pending: { label: 'Pending', variant: 'yellow' },
  cancelled: { label: 'Cancelled', variant: 'red' },
  completed: { label: 'Completed', variant: 'blue' },
  no_show: { label: 'No Show', variant: 'gray' },
};

type ViewMode = 'table' | 'calendar';
type ColumnKey = 'customer' | 'offer' | 'resource' | 'start' | 'duration' | 'amount' | 'status';

const defaultColumns: Record<ColumnKey, boolean> = {
  customer: true,
  offer: true,
  resource: true,
  start: true,
  duration: true,
  amount: true,
  status: true,
};

export function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(defaultColumns);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => {
    const first = mockBookings[0] ? new Date(mockBookings[0].selection.startDate) : new Date();
    return startOfWeek(first);
  });

  const filtered = mockBookings.filter(booking => {
    const matchesSearch =
      !search ||
      booking.ref.toLowerCase().includes(search.toLowerCase()) ||
      booking.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      booking.selection.offerTitle.toLowerCase().includes(search.toLowerCase()) ||
      booking.selection.resourceTitle.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const weekDays = useMemo(() => buildWeekDays(calendarWeekStart), [calendarWeekStart]);
  const weekEnd = useMemo(() => {
    const end = new Date(calendarWeekStart);
    end.setDate(calendarWeekStart.getDate() + 7);
    return end;
  }, [calendarWeekStart]);
  const calendarBookings = filtered.filter(booking => {
    const start = new Date(booking.selection.startDate);
    return start >= calendarWeekStart && start < weekEnd;
  });
  const weeklyPlannerRows = useMemo(
    () => buildWeeklyPlannerRows(calendarBookings, weekDays),
    [calendarBookings, weekDays]
  );

  const confirmedRevenue = filtered
    .filter(booking => booking.status === 'confirmed' || booking.status === 'completed')
    .reduce((sum, booking) => sum + booking.totalAmount, 0);

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Bookings</h2>
            <p className="text-xs text-gray-500">
              {filtered.length} rows · {confirmedRevenue.toLocaleString()} RUB confirmed revenue
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <CompactNumber label="Pending" value={String(filtered.filter(booking => booking.status === 'pending').length)} />
            <CompactNumber label="Confirmed" value={String(filtered.filter(booking => booking.status === 'confirmed').length)} />
            <CompactNumber label="Completed" value={String(filtered.filter(booking => booking.status === 'completed').length)} />
          </div>
        </div>

        <Card className="p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search ref, customer, offer, resource..."
                className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <Select options={statusOptions} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} />
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(prev => !prev)}
                className="inline-flex h-full w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 transition hover:text-gray-900"
              >
                <Settings2 size={14} /> Columns
              </button>
              {showColumnSettings && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[190px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                  <div className="space-y-2">
                    {Object.entries(visibleColumns).map(([key, enabled]) => (
                      <label key={key} className="flex items-center justify-between gap-3 text-xs text-gray-700">
                        <span className="capitalize">{key}</span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={event =>
                            setVisibleColumns(prev => ({ ...prev, [key]: event.target.checked }))
                          }
                          className="rounded border-gray-300"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  viewMode === 'table' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <LayoutList size={14} /> Table
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  viewMode === 'calendar' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <CalendarRange size={14} /> Calendar
              </button>
            </div>
          </div>
        </Card>

        {viewMode === 'table' ? (
          <Card padding={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1260px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 border-b border-r border-gray-100 bg-gray-50 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Resource
                    </th>
                    {visibleColumns.customer && (
                      <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Customer
                      </th>
                    )}
                    {visibleColumns.offer && (
                      <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Offer
                      </th>
                    )}
                    {visibleColumns.resource && (
                      <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Resource
                      </th>
                    )}
                    {visibleColumns.start && (
                      <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Start
                      </th>
                    )}
                    {visibleColumns.duration && (
                      <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Duration
                      </th>
                    )}
                    {visibleColumns.amount && (
                      <th className="border-b border-gray-100 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Amount
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="border-b border-gray-100 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Status
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount(visibleColumns) + 1} className="px-4 py-10 text-center text-sm text-gray-500">
                        No bookings found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(booking => {
                      const status = statusBadge[booking.status];
                      return (
                        <tr
                          key={booking.id}
                          className="cursor-pointer hover:bg-gray-50/70"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <td className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-4 py-2.5">
                            <p className="text-sm font-medium text-gray-900">{booking.selection.resourceTitle}</p>
                            {booking.selection.variantTitle && (
                              <p className="text-[11px] text-gray-500">{booking.selection.variantTitle}</p>
                            )}
                            <p className="text-[11px] text-gray-500">
                              {booking.ref} · {booking.customer.name}
                            </p>
                          </td>
                          {visibleColumns.customer && (
                            <td className="border-b border-gray-100 px-4 py-2.5">
                              <p className="text-sm text-gray-900">{booking.customer.name}</p>
                              <p className="text-[11px] text-gray-500">{booking.customer.email}</p>
                            </td>
                          )}
                          {visibleColumns.offer && (
                            <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                              {booking.selection.offerTitle}
                            </td>
                          )}
                          {visibleColumns.resource && (
                            <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                              {booking.selection.resourceTitle}
                              {booking.selection.variantTitle ? (
                                <span className="text-xs text-gray-500"> · {booking.selection.variantTitle}</span>
                              ) : null}
                            </td>
                          )}
                          {visibleColumns.start && (
                            <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                              {new Date(booking.selection.startDate).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          )}
                          {visibleColumns.duration && (
                            <td className="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-700">
                              {booking.selection.durationLabel}
                            </td>
                          )}
                          {visibleColumns.amount && (
                            <td className="border-b border-gray-100 px-4 py-2.5 text-right text-sm text-gray-700">
                              {booking.totalAmount.toLocaleString()} {booking.currency}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="border-b border-gray-100 px-4 py-2.5">
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {formatWeekRange(calendarWeekStart)}
                </h3>
                <p className="text-xs text-gray-500">{calendarBookings.length} bookings in selected week</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarWeekStart(prev => shiftWeek(prev, -1))}
                  className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCalendarWeekStart(prev => shiftWeek(prev, 1))}
                  className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:text-gray-800"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[1180px]">
                <div className="grid grid-cols-[260px_repeat(7,minmax(130px,1fr))] border-b border-gray-100 bg-gray-50">
                  <div className="border-r border-gray-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Resource
                  </div>
                  {weekDays.map(day => (
                    <div key={day.dateKey} className="border-r border-gray-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 last:border-r-0">
                      <div>{day.dayLabel}</div>
                      <div className="mt-1 text-xs font-medium normal-case tracking-normal text-gray-700">{day.fullLabel}</div>
                    </div>
                  ))}
                </div>

                {weeklyPlannerRows.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-gray-500">
                    No bookings in this week.
                  </div>
                ) : (
                  weeklyPlannerRows.map(row => (
                    <div
                      key={row.resourceTitle}
                      className="grid grid-cols-[260px_repeat(7,minmax(130px,1fr))] border-b border-gray-100"
                    >
                      <div className="border-r border-gray-100 bg-white px-3 py-3">
                        <p className="text-sm font-medium text-gray-900">{row.resourceTitle}</p>
                        <p className="text-[11px] text-gray-500">{row.bookingCount} booking{row.bookingCount !== 1 ? 's' : ''}</p>
                      </div>
                      {weekDays.map(day => {
                        const bookings = row.bookingsByDay[day.dateKey] || [];
                        return (
                          <div key={`${row.resourceTitle}-${day.dateKey}`} className="min-h-[110px] border-r border-gray-100 bg-white p-2 last:border-r-0">
                            <div className="space-y-1.5">
                              {bookings.map(booking => {
                                const status = statusBadge[booking.status];
                                return (
                                  <button
                                    key={booking.id}
                                    onClick={() => setSelectedBooking(booking)}
                                    className="w-full rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-left transition hover:border-emerald-200 hover:bg-white"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate text-[11px] font-medium text-gray-900">
                                        {formatTimeRange(booking)}
                                      </span>
                                      <span className={`h-2 w-2 shrink-0 rounded-full ${badgeDot(status.variant)}`} />
                                    </div>
                                    {booking.selection.variantTitle && (
                                      <p className="mt-0.5 truncate text-[10px] text-gray-500">{booking.selection.variantTitle}</p>
                                    )}
                                    <p className="truncate text-[10px] text-gray-600">{booking.customer.name}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? `Booking ${selectedBooking.ref}` : 'Booking Details'}
        size="lg"
      >
        {selectedBooking && <BookingDetail booking={selectedBooking} />}
      </Modal>
    </div>
  );
}

function CompactNumber({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function visibleColumnCount(columns: Record<ColumnKey, boolean>) {
  return Object.values(columns).filter(Boolean).length;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const offset = (next.getDay() + 6) % 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - offset);
  return next;
}

function shiftWeek(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  return next;
}

function buildWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      date,
      dateKey: date.toISOString().slice(0, 10),
      dayLabel: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      fullLabel: date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };
  });
}

function buildWeeklyPlannerRows(
  bookings: Booking[],
  weekDays: Array<{ dateKey: string }>
) {
  const rows = new Map<
    string,
    { resourceTitle: string; bookingCount: number; bookingsByDay: Record<string, Booking[]> }
  >();

  bookings.forEach(booking => {
    const resourceTitle = booking.selection.resourceTitle;
    const dateKey = new Date(booking.selection.startDate).toISOString().slice(0, 10);
    const current =
      rows.get(resourceTitle) ||
      {
        resourceTitle,
        bookingCount: 0,
        bookingsByDay: weekDays.reduce<Record<string, Booking[]>>((acc, day) => {
          acc[day.dateKey] = [];
          return acc;
        }, {}),
      };

    current.bookingCount += 1;
    current.bookingsByDay[dateKey] = [...(current.bookingsByDay[dateKey] || []), booking].sort(
      (a, b) => new Date(a.selection.startDate).getTime() - new Date(b.selection.startDate).getTime()
    );
    rows.set(resourceTitle, current);
  });

  return Array.from(rows.values()).sort((a, b) => a.resourceTitle.localeCompare(b.resourceTitle));
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return `${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}

function formatTimeRange(booking: Booking) {
  const start = new Date(booking.selection.startDate).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!booking.selection.endDate) {
    return start;
  }

  const end = new Date(booking.selection.endDate).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${start} - ${end}`;
}

function badgeDot(variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray') {
  return {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-400',
  }[variant];
}
