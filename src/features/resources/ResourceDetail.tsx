import { Archive, CalendarDays, CreditCard as Edit2, Package, Tag, TrendingUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { mockBookings, mockOffers, mockVariants } from '../../lib/mock-data';
import type { Resource, ResourceStatus } from '../../types';

const statusBadge: Record<ResourceStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Active', variant: 'green' },
  draft: { label: 'Draft', variant: 'yellow' },
  inactive: { label: 'Inactive', variant: 'gray' },
  archived: { label: 'Archived', variant: 'gray' },
};

interface ResourceDetailProps {
  resource: Resource;
  onEdit: () => void;
  onArchive: () => void;
}

export function ResourceDetail({ resource, onEdit, onArchive }: ResourceDetailProps) {
  const status = statusBadge[resource.status];
  const variants = mockVariants.filter(variant => variant.resourceId === resource.id);
  const offers = mockOffers.filter(offer => offer.resourceId === resource.id);
  const bookings = mockBookings.filter(booking => booking.selection.resourceId === resource.id);

  const totalStock = variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
  const basePrice = offers.length > 0 ? Math.min(...offers.map(offer => offer.basePrice)) : null;
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{resource.title}</h2>
            <Badge variant={status.variant} size="md">{status.label}</Badge>
          </div>
          <p className="mt-1 text-xs font-mono text-gray-500">{resource.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Edit2 size={13} /> Edit
          </Button>
          {resource.status !== 'archived' && (
            <Button size="sm" variant="ghost" onClick={onArchive}>
              <Archive size={13} /> Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <DetailMetric label="Variants" value={String(variants.length)} />
        <DetailMetric label="Base price" value={basePrice ? `${basePrice.toLocaleString()} RUB` : 'Missing'} />
        <DetailMetric label="Available stock" value={String(totalStock)} />
        <DetailMetric label="Bookings / revenue" value={`${bookings.length} / ${totalRevenue.toLocaleString()} RUB`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Package size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Resource overview</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Row label="Category" value={resource.categoryName} />
            <Row label="Created" value={new Date(resource.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
            <Row label="Updated" value={new Date(resource.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
            <Row label="Offers" value={String(offers.length)} />
          </div>
          {resource.description && (
            <p className="mt-4 text-sm text-gray-700">{resource.description}</p>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Availability preview</h3>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="bg-gray-50 px-2 py-2 text-gray-500">{day}</div>
            ))}
            {Array.from({ length: 14 }, (_, index) => (
              <div
                key={index}
                className={`px-2 py-3 text-xs ${
                  index % 5 === 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {index % 5 === 0 ? 'Busy' : 'Open'}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Placeholder calendar block for future live availability and booking load overlays.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Tag size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Variants</h3>
          </div>
          {variants.length === 0 ? (
            <p className="text-sm text-gray-500">No variants configured yet.</p>
          ) : (
            <div className="overflow-hidden border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Variant</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Stock</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Price</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Status</th>
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
                        {basePrice ? `${basePrice.toLocaleString()} RUB` : 'Pending'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={variant.status === 'active' ? 'green' : 'gray'}>
                          {variant.status === 'active' ? 'Active' : 'Inactive'}
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
            <h3 className="text-sm font-semibold text-gray-900">Pricing & performance</h3>
          </div>
          <div className="space-y-3">
            <Row label="Base price" value={basePrice ? `${basePrice.toLocaleString()} RUB` : 'Missing pricing'} />
            <Row label="Active offers" value={String(offers.filter(offer => offer.status === 'active').length)} />
            <Row label="Total bookings" value={String(bookings.length)} />
            <Row label="Total revenue" value={`${totalRevenue.toLocaleString()} RUB`} />
          </div>
        </Card>
      </div>
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
