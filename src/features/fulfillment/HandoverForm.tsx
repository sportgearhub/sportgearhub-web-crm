import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import type { FulfillmentItem } from '../../types';

interface HandoverFormProps {
  item: FulfillmentItem;
  onSuccess: (updated: FulfillmentItem) => void;
  onCancel: () => void;
}

export function HandoverForm({ item, onSuccess, onCancel }: HandoverFormProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const updated: FulfillmentItem = {
      ...item,
      status: 'active',
      handoverAt: new Date().toISOString(),
      notes,
    };
    onSuccess(updated);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Record Handover</h3>
        <p className="text-xs text-gray-500 mt-0.5">Confirm equipment has been handed to the customer.</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
        <p className="text-xs text-blue-800">
          Handover time will be recorded as <strong>{new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</strong>
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Checklist</label>
          <div className="space-y-2">
            {['Equipment inspected and clean', 'Customer ID verified', 'Waiver signed', 'Equipment serial noted'].map(item => (
              <label key={item} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                {item}
              </label>
            ))}
          </div>
        </div>

        <Textarea
          label="Handover notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Condition notes, accessories included, etc."
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="primary" onClick={handleSubmit} loading={loading}>
          Confirm Handover
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
