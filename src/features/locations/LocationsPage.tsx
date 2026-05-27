import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Save, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ApiError, catalogApi, locationsApi } from '../../lib/api-client';
import type { CatalogCity, ProviderLocation } from '../../types';
import { OpenStreetMapPicker } from './OpenStreetMapPicker';

type LocationForm = {
  locationId?: string;
  cityId: string;
  name: string;
  address: string;
  type: string;
  isDefaultPickup: boolean;
  description: string;
  latitude: string;
  longitude: string;
  status?: string;
};

const emptyForm: LocationForm = {
  cityId: '',
  name: '',
  address: '',
  type: 'pickup',
  isDefaultPickup: false,
  description: '',
  latitude: '',
  longitude: '',
};

export function LocationsPage({ embedded = false }: { embedded?: boolean }) {
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [error, setError] = useState('');

  const cityOptions = useMemo(
    () => [
      { value: '', label: 'Выберите город' },
      ...cities.map(city => ({ value: city.cityId, label: city.name })),
    ],
    [cities]
  );

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCities, nextLocations] = await Promise.all([
        catalogApi.cities(),
        locationsApi.list(),
      ]);
      setCities(nextCities);
      setLocations(nextLocations);
      setForm(current => current.cityId ? current : { ...current, cityId: nextCities[0]?.cityId ?? '' });
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось загрузить пункты выдачи: ${err.message}` : 'Не удалось загрузить пункты выдачи.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const startCreate = () => {
    setEditing(true);
    setForm({ ...emptyForm, cityId: cities[0]?.cityId ?? '' });
  };

  const startEdit = (location: ProviderLocation) => {
    setEditing(true);
    setForm({
      locationId: location.locationId,
      cityId: location.cityId,
      name: location.name,
      address: location.address,
      type: location.type,
      isDefaultPickup: location.isDefaultPickup,
      description: location.description ?? '',
      latitude: readCoordinate(location, 'latitude'),
      longitude: readCoordinate(location, 'longitude'),
      status: location.status,
    });
  };

  const save = async () => {
    if (!form.cityId || !form.name.trim() || !form.address.trim()) {
      setError('Заполните город, название и адрес.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (form.locationId) {
        await locationsApi.patch(form.locationId, {
          cityId: form.cityId,
          name: form.name.trim(),
          address: form.address.trim(),
          type: form.type,
          isDefaultPickup: form.isDefaultPickup,
          latitude: parseCoordinate(form.latitude),
          longitude: parseCoordinate(form.longitude),
          description: form.description.trim() || null,
        });
      } else {
        await locationsApi.create({
          cityId: form.cityId,
          name: form.name.trim(),
          address: form.address.trim(),
          type: form.type,
          isDefaultPickup: form.isDefaultPickup,
          latitude: parseCoordinate(form.latitude),
          longitude: parseCoordinate(form.longitude),
          description: form.description.trim() || null,
        });
      }
      setEditing(false);
      setForm({ ...emptyForm, cityId: cities[0]?.cityId ?? '' });
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось сохранить пункт выдачи: ${err.message}` : 'Не удалось сохранить пункт выдачи.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={embedded ? 'p-6' : 'p-6'}>
      <div className={embedded ? 'space-y-4' : 'mx-auto max-w-5xl space-y-4'}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Пункты выдачи</h2>
            <p className="mt-0.5 text-xs text-gray-500">Адреса выдачи и сервисные зоны для предложений.</p>
          </div>
          {!editing && (
            <Button size="sm" variant="primary" onClick={startCreate}>
              <Plus size={14} /> Добавить
            </Button>
          )}
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        {editing && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{form.locationId ? 'Редактировать пункт выдачи' : 'Новый пункт выдачи'}</h3>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                <X size={14} />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label="Город"
                value={form.cityId}
                options={cityOptions}
                onChange={event => setForm(current => ({ ...current, cityId: event.target.value }))}
              />
              <Select
                label="Тип"
                value={form.type}
                options={[
                  { value: 'pickup', label: 'Пункт выдачи' },
                  { value: 'service_area', label: 'Сервисная зона' },
                ]}
                onChange={event => setForm(current => ({ ...current, type: event.target.value }))}
              />
              <Input
                label="Название"
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                placeholder="Пункт выдачи на Ленина"
              />
              <div>
                <Input
                  label="Адрес"
                  value={form.address}
                  onChange={event => setForm(current => ({ ...current, address: event.target.value }))}
                  placeholder="ул. Ленина, 1"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setMapOpen(true)}>
                    <MapPin size={13} /> Выбрать на карте
                  </Button>
                  {readFormCoordinates(form) && (
                    <span className="text-[11px] text-gray-500">
                      {form.latitude}, {form.longitude}
                    </span>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isDefaultPickup}
                  onChange={event => setForm(current => ({ ...current, isDefaultPickup: event.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Основной пункт выдачи
              </label>
              <div className="md:col-span-2">
                <Textarea
                  label="Описание"
                  value={form.description}
                  onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                  rows={3}
                  placeholder="Как найти пункт, режим работы, особенности выдачи..."
                />
              </div>
            </div>
            <OpenStreetMapPicker
              open={mapOpen}
              value={readFormCoordinates(form)}
              onClose={() => setMapOpen(false)}
              onAddressSelect={address => setForm(current => ({ ...current, address }))}
              onSave={coordinates => setForm(current => ({
                ...current,
                latitude: String(coordinates.latitude),
                longitude: String(coordinates.longitude),
              }))}
            />
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={save} loading={saving}>
                <Save size={14} /> Сохранить
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Отмена
              </Button>
            </div>
          </Card>
        )}

        {!editing && (
          <Card>
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-500">Загружаем пункты выдачи...</div>
            ) : locations.length === 0 ? (
              <div className="py-10 text-center">
                <MapPin size={24} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-900">Пункты выдачи еще не добавлены.</p>
                <p className="mt-1 text-xs text-gray-500">Добавьте пункт выдачи перед публикацией прокатного предложения.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {locations.map(location => (
                  <button
                    key={location.locationId}
                    type="button"
                    onClick={() => startEdit(location)}
                    className="flex w-full items-start justify-between gap-4 py-3 text-left transition hover:bg-gray-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900">{location.name}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{location.cityName ?? location.cityId} · {location.address}</span>
                      {location.description && <span className="mt-1 block text-xs text-gray-500">{location.description}</span>}
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      {location.type === 'pickup' ? 'Пункт выдачи' : 'Сервисная зона'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function parseCoordinate(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readFormCoordinates(form: LocationForm) {
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function readCoordinate(location: ProviderLocation, key: 'latitude' | 'longitude') {
  const value = (location as ProviderLocation & Record<string, unknown>)[key];
  return typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
}
