import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import type { Offer, Resource } from '../../types';

const durationUnitOptions = [
  { value: 'hour', label: 'Hour(s)' },
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
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
    if (!title.trim()) e.title = 'Title is required.';
    if (!basePrice || isNaN(Number(basePrice))) e.basePrice = 'Valid base price is required.';
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
        <h2 className="text-sm font-semibold text-gray-900">{offer ? 'Edit Offer' : 'Create Offer'}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {offer ? 'Update offer configuration.' : 'Define a new rental offer for customers.'}
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            label="Offer title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={errors.title}
            placeholder="e.g. Mountain Bike Daily"
          />
          <Select
            label="Resource"
            options={resourceOptions}
            value={resourceId}
            onChange={e => setResourceId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Base price (RUB)"
              type="number"
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
              error={errors.basePrice}
              placeholder="e.g. 3200"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Duration"
                type="number"
                value={durationValue}
                onChange={e => setDurationValue(e.target.value)}
                placeholder="1"
                min="1"
              />
              <Select
                label="Unit"
                options={durationUnitOptions}
                value={durationUnit}
                onChange={e => setDurationUnit(e.target.value as Offer['durationUnit'])}
              />
            </div>
          </div>
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="What's included, key highlights..."
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="primary" onClick={handleSubmit}>
          {offer ? 'Save Changes' : 'Create Offer'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
