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
        <h3 className="text-sm font-semibold text-gray-900">Завершить бронь</h3>
        <p className="text-xs text-gray-500 mt-0.5">Отметьте бронь как полностью завершенную.</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-md px-4 py-3">
        <p className="text-xs text-emerald-800">
          Завершение подтверждает, что оборудование возвращено, а аренда закрыта.
        </p>
      </div>

      <Textarea
        label="Заметки о завершении (необязательно)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
        placeholder="Итоговые комментарии, оценка, дальнейшие действия..."
      />

      <div className="flex gap-2 pt-2">
        <Button variant="primary" onClick={handleSubmit} loading={loading}>
          Завершить
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
