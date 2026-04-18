import { CreditCard as Edit2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Offer, OfferStatus } from '../../types';

const statusBadge: Record<OfferStatus, { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  active: { label: 'Active', variant: 'green' },
  draft: { label: 'Draft', variant: 'yellow' },
  inactive: { label: 'Inactive', variant: 'gray' },
  archived: { label: 'Archived', variant: 'gray' },
};

interface OfferDetailProps {
  offer: Offer;
  onEdit: () => void;
  onStatusChange: (s: OfferStatus) => void;
}

export function OfferDetail({ offer, onEdit, onStatusChange }: OfferDetailProps) {
  const sb = statusBadge[offer.status];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{offer.title}</h2>
          <p className="text-xs font-mono text-gray-500 mt-0.5">{offer.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={sb.variant} size="md">{sb.label}</Badge>
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Edit2 size={13} /> Edit
          </Button>
          {offer.status === 'draft' && (
            <Button size="sm" variant="primary" onClick={() => onStatusChange('active')} disabled={!offer.isPublishable}>
              Activate
            </Button>
          )}
          {offer.status === 'active' && (
            <Button size="sm" variant="ghost" onClick={() => onStatusChange('inactive')}>
              Deactivate
            </Button>
          )}
          {offer.status === 'inactive' && (
            <Button size="sm" variant="primary" onClick={() => onStatusChange('active')}>
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {!offer.isPublishable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-xs font-semibold text-amber-800">Publishability Issues</p>
          </div>
          <ul className="space-y-1">
            {offer.publishabilityIssues.map((issue, i) => (
              <li key={i} className="text-xs text-amber-700">• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {offer.isPublishable && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle size={14} className="text-emerald-600" />
          <p className="text-xs text-emerald-800 font-medium">This offer is ready to be published.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Offer Details</h3>
          <div className="space-y-2">
            <Row label="Resource" value={offer.resourceTitle} />
            <Row label="Base price" value={`${offer.basePrice.toLocaleString()} ${offer.currency}`} />
            <Row label="Duration" value={`${offer.durationValue} ${offer.durationUnit}${offer.durationValue > 1 ? 's' : ''}`} />
          </div>
        </Card>

        <Card>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Timeline</h3>
          <div className="space-y-2">
            <Row label="Created" value={new Date(offer.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
            <Row label="Updated" value={new Date(offer.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
          </div>
        </Card>
      </div>

      {offer.description && (
        <Card>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Description</h3>
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
