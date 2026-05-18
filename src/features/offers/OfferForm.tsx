import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import type { Offer, Resource } from '../../types';

const durationUnitOptions = [
  { value: 'hour', label: 'Часы' },
  { value: 'day', label: 'Дни' },
  { value: 'week', label: 'Недели' },
];

interface OfferFormProps {
  offer?: Offer;
  onSubmit: (data: Partial<Offer>) => void;
  onCancel: () => void;
  initialResourceId?: string;
}

export function OfferForm({ offer, onSubmit, onCancel, initialResourceId }: OfferFormProps) {
  const resources: Resource[] = [];
  const [title, setTitle] = useState(offer?.title || '');
  const [resourceId, setResourceId] = useState(offer?.resourceId || initialResourceId || '');
  const [basePrice, setBasePrice] = useState(String(offer?.basePrice || ''));
  const [durationValue, setDurationValue] = useState(String(offer?.durationValue || 1));
  const [durationUnit, setDurationUnit] = useState<Offer['durationUnit']>(offer?.durationUnit || 'day');
  const [description, setDescription] = useState(offer?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resourceOptions = resources.map(r => ({ value: r.id, label: r.title }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Укажите название.';
    if (!basePrice || isNaN(Number(basePrice))) e.basePrice = 'Укажите корректную базовую цену.';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const resource = resources.find(r => r.id === resourceId);
    onSubmit({
      title,
      resourceId,
      resourceTitle: resource?.title || '',
      basePrice: Number(basePrice),
      durationValue: Number(durationValue),
      durationUnit: durationUnit as 'hour' | 'day' | 'week',
      description,
    });
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{offer ? 'Редактировать оффер' : 'Создать оффер'}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {offer ? 'Обновите настройки оффера.' : 'Опишите новое предложение аренды для клиентов.'}
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            label="Название оффера"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={errors.title}
            placeholder="Например: горный велосипед на день"
          />
          <Select
            label="Ресурс"
            options={resourceOptions}
            value={resourceId}
            onChange={e => setResourceId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Базовая цена (RUB)"
              type="number"
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
              error={errors.basePrice}
              placeholder="Например: 3200"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Длительность"
                type="number"
                value={durationValue}
                onChange={e => setDurationValue(e.target.value)}
                placeholder="1"
                min="1"
              />
              <Select
                label="Ед."
                options={durationUnitOptions}
                value={durationUnit}
                onChange={e => setDurationUnit(e.target.value as Offer['durationUnit'])}
              />
            </div>
          </div>
          <Textarea
            label="Описание (необязательно)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Что включено, основные детали..."
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="primary" onClick={handleSubmit}>
          {offer ? 'Сохранить изменения' : 'Создать оффер'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}
