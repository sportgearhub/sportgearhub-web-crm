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
  { value: 'excellent', label: 'Отличное - без проблем' },
  { value: 'good', label: 'Хорошее - небольшой износ' },
  { value: 'fair', label: 'Среднее - заметный износ' },
  { value: 'damaged', label: 'Повреждено - требует внимания' },
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
        <h3 className="text-sm font-semibold text-gray-900">Зафиксировать возврат</h3>
        <p className="text-xs text-gray-500 mt-0.5">Запишите возврат оборудования и его состояние.</p>
      </div>

      <div className="bg-teal-50 border border-teal-100 rounded-md px-4 py-3">
        <p className="text-xs text-teal-800">
          Время возврата будет записано как <strong>{new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</strong>
        </p>
      </div>

      <div className="space-y-3">
        <Select
          label="Состояние оборудования"
          options={conditionOptions}
          value={condition}
          onChange={e => setCondition(e.target.value)}
        />

        <Textarea
          label="Заметки по возврату"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Повреждения, недостающие аксессуары, детали позднего возврата..."
        />

        {condition === 'damaged' && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
            <p className="text-xs text-amber-800 font-medium">Обнаружено повреждение</p>
            <p className="text-xs text-amber-700 mt-0.5">Для дальнейшей обработки автоматически будет создан отчет о проблеме.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="primary" onClick={handleSubmit} loading={loading}>
          Подтвердить возврат
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
