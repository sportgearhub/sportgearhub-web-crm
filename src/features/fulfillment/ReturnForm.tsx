import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import type { FulfillmentItem } from '../../types';

interface ReturnFormProps {
  item: FulfillmentItem;
  onSuccess: (updated: FulfillmentItem) => void;
  onCancel: () => void;
}

const conditionOptions = [
  { value: 'excellent', label: 'Excellent — No issues' },
  { value: 'good', label: 'Good — Minor wear' },
  { value: 'fair', label: 'Fair — Noticeable wear' },
  { value: 'damaged', label: 'Damaged — Requires attention' },
];

export function ReturnForm({ item, onSuccess, onCancel }: ReturnFormProps) {
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const updated: FulfillmentItem = {
      ...item,
      status: condition === 'damaged' ? 'issue_reported' : 'pending_return',
      returnAt: new Date().toISOString(),
      notes,
    };
    onSuccess(updated);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Record Return</h3>
        <p className="text-xs text-gray-500 mt-0.5">Log the equipment return and condition.</p>
      </div>

      <div className="bg-teal-50 border border-teal-100 rounded-md px-4 py-3">
        <p className="text-xs text-teal-800">
          Return time will be recorded as <strong>{new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</strong>
        </p>
      </div>

      <div className="space-y-3">
        <Select
          label="Equipment condition"
          options={conditionOptions}
          value={condition}
          onChange={e => setCondition(e.target.value)}
        />

        <Textarea
          label="Return notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Any damage, missing accessories, late return details..."
        />

        {condition === 'damaged' && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
            <p className="text-xs text-amber-800 font-medium">Damage detected</p>
            <p className="text-xs text-amber-700 mt-0.5">This will automatically create an issue report for follow-up.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="primary" onClick={handleSubmit} loading={loading}>
          Confirm Return
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
