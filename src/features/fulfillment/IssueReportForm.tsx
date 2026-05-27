import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { ApiError, bookingsApi } from '../../lib/api-client';
import type { FulfillmentItem } from '../../types';

interface IssueReportFormProps {
  item: FulfillmentItem;
  onSuccess: (updated: FulfillmentItem) => void;
  onCancel: () => void;
}

const severityOptions = [
  { value: 'low', label: 'Низкая - небольшое неудобство' },
  { value: 'medium', label: 'Средняя - нужен контроль' },
  { value: 'high', label: 'Высокая - серьезное повреждение или проблема' },
  { value: 'critical', label: 'Критическая - безопасность или юридический риск' },
];

export function IssueReportForm({ item, onSuccess, onCancel }: IssueReportFormProps) {
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Опишите проблему.');
      return;
    }
    setError('');
    setLoading(true);
    const issueReportedAt = new Date().toISOString();
    try {
      await bookingsApi.reportIssue(item.bookingId, {
        reasonCode: `fulfillment_${severity}`,
        description: description.trim(),
        evidenceRefs: [],
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить отчет.');
      setLoading(false);
      return;
    }
    const updated: FulfillmentItem = {
      ...item,
      status: 'issue_reported',
      issueReportedAt,
      notes: description,
    };
    onSuccess(updated);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Сообщить о проблеме</h3>
        <p className="text-xs text-gray-500 mt-0.5">Зафиксируйте проблему по этой брони для дальнейшей обработки.</p>
      </div>

      <div className="space-y-3">
        <Select
          label="Серьезность"
          options={severityOptions}
          value={severity}
          onChange={e => setSeverity(e.target.value)}
        />

        <Textarea
          label="Описание проблемы"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Подробно опишите проблему..."
          error={error}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="danger" onClick={handleSubmit} loading={loading}>
          Отправить отчет
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
