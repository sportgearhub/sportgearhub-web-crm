import { Save } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { AvailabilityCalendar, BlockedPeriod, CapacitySlot, RecurringRule } from '../../types';
import { dayOptions, fromDatetimeLocal, toDatetimeLocal, type SlotForm } from './availabilityTypes';

interface AvailabilityCalendarCardProps {
  calendar: AvailabilityCalendar;
  saving: boolean;
  onChange: (value: AvailabilityCalendar) => void;
  onSave: () => void;
}

export function AvailabilityCalendarCard({ calendar, saving, onChange, onSave }: AvailabilityCalendarCardProps) {
  const updateRule = (index: number, patch: Partial<RecurringRule>) => {
    onChange({
      ...calendar,
      recurringRules: calendar.recurringRules.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)),
    });
  };
  const updateBlock = (index: number, patch: Partial<BlockedPeriod>) => {
    onChange({
      ...calendar,
      blockedPeriods: calendar.blockedPeriods.map((block, blockIndex) => (blockIndex === index ? { ...block, ...patch } : block)),
    });
  };

  return (
    <Card>
      <CardHeader
        title="Расписание"
        subtitle="Укажите дни и время, когда клиенты могут записаться."
        action={<Button size="sm" variant="primary" onClick={onSave} loading={saving}><Save size={13} /> Сохранить</Button>}
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            label="Часовой пояс расписания"
            value={calendar.timezone}
            onChange={event => onChange({ ...calendar, timezone: event.target.value })}
          />
          <Button
            size="sm"
            variant="secondary"
            className="mt-6"
            onClick={() => onChange({
              ...calendar,
              recurringRules: [...calendar.recurringRules, { dayOfWeek: 'monday', startsAtLocal: '10:00', endsAtLocal: '18:00', capacity: 1 }],
            })}
          >
            Добавить день
          </Button>
        </div>

        <div className="space-y-2">
          {calendar.recurringRules.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500">
              Добавьте дни недели и время записи.
            </div>
          ) : calendar.recurringRules.map((rule, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-gray-100 bg-gray-50 p-2 md:grid-cols-[110px_1fr_1fr_100px_80px]">
              <Select
                options={dayOptions}
                value={rule.dayOfWeek ?? 'monday'}
                onChange={event => updateRule(index, { dayOfWeek: event.target.value })}
              />
              <Input type="time" value={rule.startsAtLocal ?? ''} onChange={event => updateRule(index, { startsAtLocal: event.target.value })} />
              <Input type="time" value={rule.endsAtLocal ?? ''} onChange={event => updateRule(index, { endsAtLocal: event.target.value })} />
              <Input type="number" min="1" value={String(rule.capacity ?? '')} onChange={event => updateRule(index, { capacity: Number(event.target.value) || null })} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...calendar, recurringRules: calendar.recurringRules.filter((_, ruleIndex) => ruleIndex !== index) })}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Закрытые даты</h3>
            <p className="text-xs text-gray-500">Дни или часы, когда запись временно недоступна.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChange({
              ...calendar,
              blockedPeriods: [...calendar.blockedPeriods, { startsAt: '', endsAt: '', reasonCode: 'provider_closed' }],
            })}
          >
            Закрыть дату
          </Button>
        </div>
        <div className="space-y-2">
          {calendar.blockedPeriods.map((block, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-gray-100 bg-gray-50 p-2 md:grid-cols-[1fr_1fr_1fr_80px]">
              <Input type="datetime-local" value={toDatetimeLocal(block.startsAt)} onChange={event => updateBlock(index, { startsAt: fromDatetimeLocal(event.target.value) })} />
              <Input type="datetime-local" value={toDatetimeLocal(block.endsAt)} onChange={event => updateBlock(index, { endsAt: fromDatetimeLocal(event.target.value) })} />
              <Input value={block.reasonCode ?? ''} onChange={event => updateBlock(index, { reasonCode: event.target.value })} placeholder="Причина, например ремонт" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...calendar, blockedPeriods: calendar.blockedPeriods.filter((_, blockIndex) => blockIndex !== index) })}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

interface AvailabilitySlotsCardProps {
  slots: CapacitySlot[];
  form: SlotForm;
  saving: boolean;
  onFormChange: (value: SlotForm) => void;
  onCreate: () => void;
  onClose: (slot: CapacitySlot) => void;
}

export function AvailabilitySlotsCard({
  slots,
  form,
  saving,
  onFormChange,
  onCreate,
  onClose,
}: AvailabilitySlotsCardProps) {
  return (
    <Card>
      <CardHeader title="Окна записи" subtitle="Создайте конкретное время, на которое клиент сможет записаться." />
      <div className="grid gap-2 border-b border-gray-100 pb-4 md:grid-cols-[1fr_180px_180px_110px]">
        <Input label="Название" value={form.title} onChange={event => onFormChange({ ...form, title: event.target.value })} placeholder="Утренняя группа" />
        <Input label="Начало" type="datetime-local" value={form.startsAt} onChange={event => onFormChange({ ...form, startsAt: event.target.value })} />
        <Input label="Конец" type="datetime-local" value={form.endsAt} onChange={event => onFormChange({ ...form, endsAt: event.target.value })} />
        <Input label="Мест" type="number" min="1" value={form.totalCapacity} onChange={event => onFormChange({ ...form, totalCapacity: event.target.value })} />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Input label="Место встречи" value={form.meetingPoint} onChange={event => onFormChange({ ...form, meetingPoint: event.target.value })} placeholder="Адрес или ориентир" />
        <Button size="sm" variant="primary" onClick={onCreate} loading={saving} disabled={!form.startsAt || !form.endsAt}>
          Создать окно
        </Button>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-gray-100">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Окно</th>
              <th className="px-3 py-2 text-left">Время</th>
              <th className="px-3 py-2 text-right">Места</th>
              <th className="px-3 py-2 text-left">Состояние</th>
              <th className="px-3 py-2 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-500">Окон записи пока нет.</td>
              </tr>
            ) : slots.map(slot => (
              <tr key={slot.slotId} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <p className="truncate font-medium text-gray-900">{slot.title || 'Окно записи'}</p>
                  {slot.meetingPoint && <p className="truncate text-xs text-gray-500">{slot.meetingPoint}</p>}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {new Date(slot.startsAt).toLocaleString('ru-RU')}<br />
                  <span className="text-xs text-gray-500">{new Date(slot.endsAt).toLocaleString('ru-RU')}</span>
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{slot.availableCapacity}/{slot.totalCapacity}</td>
                <td className="px-3 py-2">
                  <Badge variant={slot.status === 'open' ? 'green' : slot.status === 'cancelled' ? 'red' : 'gray'}>{slotStatusLabel(slot.status)}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => onClose(slot)} disabled={saving || slot.status !== 'open'}>
                    Закрыть
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function slotStatusLabel(status: string) {
  if (status === 'open') return 'Открыто';
  if (status === 'closed') return 'Закрыто';
  if (status === 'cancelled') return 'Отменено';
  return status;
}
