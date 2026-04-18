import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import type { FulfillmentItem } from '../../types';

interface CompleteFormProps {
  item: FulfillmentItem;
  onSuccess: (updated: FulfillmentItem) => void;
  onCancel: () => void;
}

export function CompleteForm({ item, onSuccess, onCancel }: CompleteFormProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const updated: FulfillmentItem = {
      ...item,
      status: 'completed',
      completedAt: new Date().toISOString(),
      notes,
    };
    onSuccess(updated);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Complete Booking</h3>
        <p className="text-xs text-gray-500 mt-0.5">Mark this booking as fully completed.</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-md px-4 py-3">
        <p className="text-xs text-emerald-800">
          Completing this booking confirms equipment has been returned and the rental is concluded.
        </p>
      </div>

      <Textarea
        label="Completion notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
        placeholder="Final remarks, rating, follow-ups..."
      />

      <div className="flex gap-2 pt-2">
        <Button variant="primary" onClick={handleSubmit} loading={loading}>
          Mark as Completed
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
