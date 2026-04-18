import { useState } from 'react';
import { AlertCircle, CheckSquare, ChevronLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PrototypeBanner } from '../../components/ui/PrototypeBanner';
import { HandoverForm } from './HandoverForm';
import { ReturnForm } from './ReturnForm';
import { CompleteForm } from './CompleteForm';
import { IssueReportForm } from './IssueReportForm';
import { mockFulfillmentQueue } from '../../lib/mock-data';
import type { FulfillmentItem, FulfillmentStatus } from '../../types';

const statusConfig: Record<FulfillmentStatus, { label: string; variant: 'yellow' | 'blue' | 'teal' | 'green' | 'red' }> = {
  pending_handover: { label: 'Pending Handover', variant: 'yellow' },
  active: { label: 'Active', variant: 'blue' },
  pending_return: { label: 'Pending Return', variant: 'teal' },
  completed: { label: 'Completed', variant: 'green' },
  issue_reported: { label: 'Issue Reported', variant: 'red' },
};

type FulfillmentAction = 'handover' | 'return' | 'complete' | 'issue';

export function FulfillmentPage() {
  const [queue, setQueue] = useState<FulfillmentItem[]>(mockFulfillmentQueue);
  const [selected, setSelected] = useState<FulfillmentItem | null>(null);
  const [action, setAction] = useState<FulfillmentAction | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAction = (item: FulfillmentItem, nextAction: FulfillmentAction) => {
    setSelected(item);
    setAction(nextAction);
  };

  const handleSuccess = (updated: FulfillmentItem) => {
    setQueue(prev => prev.map(item => item.bookingId === updated.bookingId ? updated : item));
    const successLabels: Record<FulfillmentAction, string> = {
      handover: 'Handover recorded successfully.',
      return: 'Return recorded successfully.',
      complete: 'Booking marked as completed.',
      issue: 'Issue report submitted.',
    };

    if (action) {
      setSuccessMsg(successLabels[action]);
    }

    setAction(null);
    setSelected(null);
    window.setTimeout(() => setSuccessMsg(''), 4000);
  };

  const activeItems = queue.filter(item =>
    item.status === 'pending_handover' || item.status === 'active' || item.status === 'pending_return'
  );
  const completedItems = queue.filter(item =>
    item.status === 'completed' || item.status === 'issue_reported'
  );

  if (action && selected) {
    return (
      <div className="p-6 max-w-2xl">
        <button
          onClick={() => {
            setAction(null);
            setSelected(null);
          }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ChevronLeft size={14} /> Back to fulfillment queue
        </button>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">{selected.bookingRef}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {selected.customer.name} · {selected.selection.offerTitle}
          </p>
        </div>

        {action === 'handover' && (
          <HandoverForm item={selected} onSuccess={handleSuccess} onCancel={() => setAction(null)} />
        )}
        {action === 'return' && (
          <ReturnForm item={selected} onSuccess={handleSuccess} onCancel={() => setAction(null)} />
        )}
        {action === 'complete' && (
          <CompleteForm item={selected} onSuccess={handleSuccess} onCancel={() => setAction(null)} />
        )}
        {action === 'issue' && (
          <IssueReportForm item={selected} onSuccess={handleSuccess} onCancel={() => setAction(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Fulfillment Queue</h2>
        <p className="text-xs text-gray-500 mt-0.5">Track handovers, returns, and issue handling.</p>
      </div>

      <PrototypeBanner
        label="prototype_flow"
        message="Fulfillment actions currently update local prototype state only. Server workflows can be wired in later."
      />

      {successMsg && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <CheckSquare size={14} />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Open Queue</h3>
          <Badge variant="blue">{activeItems.length}</Badge>
        </div>

        {activeItems.length === 0 ? (
          <Card>
            <p className="text-xs text-gray-500">No active fulfillment items.</p>
          </Card>
        ) : (
          activeItems.map(item => (
            <FulfillmentCard
              key={item.bookingId}
              item={item}
              onAction={handleAction}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Completed / Issues</h3>
          <Badge variant="gray">{completedItems.length}</Badge>
        </div>

        {completedItems.length === 0 ? (
          <Card>
            <p className="text-xs text-gray-500">Completed rentals and issue reports will appear here.</p>
          </Card>
        ) : (
          completedItems.map(item => (
            <FulfillmentCard
              key={item.bookingId}
              item={item}
              onAction={handleAction}
              compact
            />
          ))
        )}
      </section>
    </div>
  );
}

function FulfillmentCard({
  item,
  onAction,
  compact = false,
}: {
  item: FulfillmentItem;
  onAction: (item: FulfillmentItem, action: FulfillmentAction) => void;
  compact?: boolean;
}) {
  const status = statusConfig[item.status];

  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">{item.bookingRef}</h4>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-xs text-gray-600">
            {item.customer.name} · {item.selection.offerTitle}
          </p>
          <p className="text-xs text-gray-500">
            {item.selection.resourceTitle}
            {item.selection.variantTitle ? ` · ${item.selection.variantTitle}` : ''}
          </p>
          <p className="text-xs text-gray-500">
            Starts {new Date(item.selection.startDate).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {item.notes && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{item.notes}</span>
            </div>
          )}
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-2">
            {item.status === 'pending_handover' && (
              <Button size="sm" variant="primary" onClick={() => onAction(item, 'handover')}>
                Record Handover
              </Button>
            )}
            {item.status === 'active' && (
              <Button size="sm" variant="secondary" onClick={() => onAction(item, 'return')}>
                Record Return
              </Button>
            )}
            {item.status === 'pending_return' && (
              <Button size="sm" variant="primary" onClick={() => onAction(item, 'complete')}>
                Complete Booking
              </Button>
            )}
            {item.status !== 'issue_reported' && item.status !== 'completed' && (
              <Button size="sm" variant="ghost" onClick={() => onAction(item, 'issue')}>
                Report Issue
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
