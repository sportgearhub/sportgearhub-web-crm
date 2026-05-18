import { Save } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { AvailabilityProfile, Resource } from '../../types';
import { availabilityModeFor, availabilityStatusOptions, DEFAULT_TIMEZONE, modeLabel, type ProfileForm } from './availabilityTypes';

interface AvailabilityProfileCardProps {
  resource: Resource;
  form: ProfileForm;
  missing: boolean;
  profile: AvailabilityProfile | null;
  saving: boolean;
  onFormChange: (value: ProfileForm) => void;
  onSave: () => void;
}

export function AvailabilityProfileCard({
  resource,
  form,
  missing,
  profile,
  saving,
  onFormChange,
  onSave,
}: AvailabilityProfileCardProps) {
  const mode = availabilityModeFor(resource);
  const bookingAheadDays = Number(form.bookingHorizonDays) || 0;
  const bookingAheadHint = mode === 'scheduled_slot'
    ? 'Окна записи и даты дальше этого срока не будут доступны клиентам для бронирования.'
    : `Клиенты смогут бронировать ${resource.categoryName?.toLowerCase() || 'позицию'} максимум на ${bookingAheadDays || 30} дней вперед.`;

  return (
    <Card>
      <CardHeader
        title="Правила бронирования"
        subtitle={missing ? 'Задайте, как далеко вперед клиенты смогут бронировать эту позицию.' : 'Эти правила применяются к клиентскому календарю бронирования.'}
        action={<Badge variant={profile?.status === 'active' ? 'green' : 'yellow'}>{profile?.status === 'active' ? 'Включено' : 'Не настроено'}</Badge>}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Как работает доступность" value={modeLabel(mode)} disabled />
        <Input
          label="Часовой пояс бронирований"
          value={form.timezone}
          onChange={event => onFormChange({ ...form, timezone: event.target.value })}
          placeholder={DEFAULT_TIMEZONE}
        />
        <Input
          label="Бронирование вперед"
          type="number"
          min="1"
          value={form.bookingHorizonDays}
          onChange={event => onFormChange({ ...form, bookingHorizonDays: event.target.value })}
          hint={bookingAheadHint}
        />
        <Select
          label="Принимать бронирования"
          value={form.status}
          options={availabilityStatusOptions}
          onChange={event => onFormChange({ ...form, status: event.target.value })}
        />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          Обновлено: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString('ru-RU') : 'еще нет'}
        </p>
        <Button size="sm" variant="primary" onClick={onSave} loading={saving}>
          <Save size={13} /> Сохранить профиль
        </Button>
      </div>
    </Card>
  );
}
