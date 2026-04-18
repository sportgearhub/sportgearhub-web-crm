import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import type { FulfillmentItem } from '../../types';

interface IssueReportFormProps {
  item: FulfillmentItem;
  onSuccess: (updated: FulfillmentItem) => void;
  onCancel: () => void;
}

const severityOptions = [
  { value: 'low', label: 'Low — Minor inconvenience' },
  { value: 'medium', label: 'Medium — Requires follow-up' },
  { value: 'high', label: 'High — Significant damage/issue' },
  { value: 'critical', label: 'Critical — Safety or legal concern' },
];

export function IssueReportForm({ item, onSuccess, onCancel }: IssueReportFormProps) {
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const updated: FulfillmentItem = {
      ...item,
      status: 'issue_reported',
      issueReportedAt: new Date().toISOString(),
      notes: description,
    };
    onSuccess(updated);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Report Issue</h3>
        <p className="text-xs text-gray-500 mt-0.5">Log an issue with this booking for follow-up.</p>
      </div>

      <div className="space-y-3">
        <Select
          label="Severity"
          options={severityOptions}
          value={severity}
          onChange={e => setSeverity(e.target.value)}
        />

        <Textarea
          label="Issue description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe the issue in detail..."
          error={error}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="danger" onClick={handleSubmit} loading={loading}>
          Submit Report
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
