import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ApiError, availabilityApi, resourcesApi } from '../../lib/api-client';
import type {
  AvailabilityCalendar,
  AvailabilityDiagnostics,
  AvailabilityProfile,
  CapacitySlot,
  Resource,
} from '../../types';
import { AvailabilityDiagnosticsCard } from './AvailabilityDiagnosticsCard';
import { AvailabilityProfileCard } from './AvailabilityProfileCard';
import { AvailabilityResourceList } from './AvailabilityResourceList';
import { AvailabilityCalendarCard, AvailabilitySlotsCard } from './AvailabilityScheduleCards';
import {
  DEFAULT_TIMEZONE,
  availabilityModeFor,
  emptyCalendar,
  emptyProfileForm,
  emptySlotForm,
  modeLabel,
  profileToForm,
  type ProfileForm,
  type SlotForm,
} from './availabilityTypes';

interface AvailabilityPageProps {
  onNavigate?: (path: string) => void;
}

export function AvailabilityPage({ onNavigate }: AvailabilityPageProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [profile, setProfile] = useState<AvailabilityProfile | null>(null);
  const [diagnostics, setDiagnostics] = useState<AvailabilityDiagnostics | null>(null);
  const [calendar, setCalendar] = useState<AvailabilityCalendar | null>(null);
  const [slots, setSlots] = useState<CapacitySlot[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm('inventory'));
  const [slotForm, setSlotForm] = useState<SlotForm>(emptySlotForm());
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [error, setError] = useState('');
  const [profileMissing, setProfileMissing] = useState(false);

  const selectedResource = useMemo(
    () => resources.find(resource => resource.resourceId === selectedResourceId) ?? null,
    [resources, selectedResourceId]
  );
  const expectedMode = availabilityModeFor(selectedResource);
  const scheduledMode = expectedMode === 'scheduled_slot';
  const scheduledProfileReady = scheduledMode && profile?.status === 'active' && profile.availabilityMode === expectedMode;

  useEffect(() => {
    let cancelled = false;

    setLoadingResources(true);
    setError('');
    resourcesApi.list()
      .then(nextResources => {
        if (cancelled) return;
        setResources(nextResources);
        setSelectedResourceId(current => current || nextResources[0]?.resourceId || '');
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? `Не удалось загрузить позиции: ${err.message}` : 'Не удалось загрузить позиции.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResources(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedResource) {
      resetDetails('inventory');
      return;
    }

    let cancelled = false;
    const mode = availabilityModeFor(selectedResource);

    const loadDetails = async () => {
      setLoadingDetails(true);
      setError('');
      setProfileMissing(false);
      clearModeData();
      setDiagnostics(null);

      await loadProfile(selectedResource, mode, cancelled);
      await loadDiagnostics(selectedResource.resourceId, cancelled);

      if (mode === 'scheduled_slot') await loadSchedule(selectedResource.resourceId, cancelled);

      if (!cancelled) setLoadingDetails(false);
    };

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedResource]);

  const resetDetails = (mode: string) => {
    setProfile(null);
    setDiagnostics(null);
    clearModeData();
    setProfileForm(emptyProfileForm(mode));
  };

  const clearModeData = () => {
    setCalendar(null);
    setSlots([]);
  };

  const loadProfile = async (resource: Resource, mode: string, cancelled: boolean) => {
    try {
      const nextProfile = await availabilityApi.getProfile(resource.resourceId);
      if (cancelled) return;
      setProfile(nextProfile);
      setProfileForm(profileToForm(nextProfile, mode));
    } catch (err) {
      if (cancelled) return;
      if (err instanceof ApiError && err.status === 404) {
        setProfile(null);
        setProfileMissing(true);
        setProfileForm(emptyProfileForm(mode));
      } else {
        setError(err instanceof ApiError ? `Не удалось загрузить профиль доступности: ${err.message}` : 'Не удалось загрузить профиль доступности.');
      }
    }
  };

  const loadDiagnostics = async (resourceId: string, cancelled = false) => {
    try {
      const nextDiagnostics = await availabilityApi.getDiagnostics(resourceId);
      if (!cancelled) setDiagnostics(nextDiagnostics);
    } catch (err) {
      if (!cancelled && !(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof ApiError ? `Не удалось загрузить диагностику: ${err.message}` : 'Не удалось загрузить диагностику.');
      }
    }
  };

  const loadSchedule = async (resourceId: string, cancelled = false) => {
    try {
      const [nextCalendar, nextSlots] = await Promise.all([
        availabilityApi.getCalendar(resourceId).catch(err => {
          if (err instanceof ApiError && err.status === 404) return emptyCalendar();
          throw err;
        }),
        availabilityApi.listSlots(resourceId),
      ]);
      if (!cancelled) {
        setCalendar(nextCalendar);
        setSlots(nextSlots);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof ApiError ? `Не удалось загрузить расписание: ${err.message}` : 'Не удалось загрузить расписание.');
      }
    }
  };

  const saveProfile = async () => {
    if (!selectedResource) return;
    setSavingProfile(true);
    setError('');
    try {
      const nextProfile = await availabilityApi.putProfile(selectedResource.resourceId, {
        availabilityMode: expectedMode,
        timezone: profileForm.timezone.trim() || DEFAULT_TIMEZONE,
        bookingHorizonDays: Number(profileForm.bookingHorizonDays) || 30,
        status: profileForm.status || 'active',
      });
      setProfile(nextProfile);
      setProfileForm(profileToForm(nextProfile, expectedMode));
      setProfileMissing(false);
      if (expectedMode === 'scheduled_slot' && nextProfile.status === 'active') {
        await loadSchedule(selectedResource.resourceId);
      }
      await loadDiagnostics(selectedResource.resourceId);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось сохранить профиль: ${err.message}` : 'Не удалось сохранить профиль.');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveCalendar = async () => {
    if (!selectedResource || !calendar) return;
    setSavingCalendar(true);
    setError('');
    try {
      const nextCalendar = await availabilityApi.putCalendar(selectedResource.resourceId, {
        timezone: calendar.timezone || profileForm.timezone || DEFAULT_TIMEZONE,
        recurringRules: calendar.recurringRules,
        blockedPeriods: calendar.blockedPeriods,
        exceptions: calendar.exceptions,
      });
      setCalendar(nextCalendar);
      await loadDiagnostics(selectedResource.resourceId);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось сохранить календарь: ${err.message}` : 'Не удалось сохранить календарь.');
    } finally {
      setSavingCalendar(false);
    }
  };

  const createSlot = async () => {
    if (!selectedResource) return;
    setSavingSlot(true);
    setError('');
    try {
      const nextSlot = await availabilityApi.createSlot(selectedResource.resourceId, {
        title: slotForm.title.trim() || null,
        startsAt: new Date(slotForm.startsAt).toISOString(),
        endsAt: new Date(slotForm.endsAt).toISOString(),
        totalCapacity: Number(slotForm.totalCapacity) || 1,
        status: 'open',
        meetingPoint: slotForm.meetingPoint.trim() || null,
      });
      setSlots(current => [...current, nextSlot].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setSlotForm(emptySlotForm());
      await loadDiagnostics(selectedResource.resourceId);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось создать окно записи: ${err.message}` : 'Не удалось создать окно записи.');
    } finally {
      setSavingSlot(false);
    }
  };

  const closeSlot = async (slot: CapacitySlot) => {
    if (!selectedResource) return;
    setSavingSlot(true);
    setError('');
    try {
      const nextSlot = await availabilityApi.closeSlot(selectedResource.resourceId, slot.slotId, 'provider_closed');
      setSlots(current => current.map(item => (item.slotId === nextSlot.slotId ? nextSlot : item)));
      await loadDiagnostics(selectedResource.resourceId);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось закрыть окно записи: ${err.message}` : 'Не удалось закрыть окно записи.');
    } finally {
      setSavingSlot(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AvailabilityResourceList
        resources={resources}
        selectedResourceId={selectedResourceId}
        loading={loadingResources}
        onSelect={setSelectedResourceId}
        onNavigate={onNavigate}
      />

      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-4 p-6">
          {selectedResource && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-base font-semibold text-gray-900">{selectedResource.title}</h1>
                <p className="mt-0.5 text-xs text-gray-500">
                  {modeLabel(expectedMode)} · настройте, когда клиенты смогут бронировать
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (selectedResource) void loadDiagnostics(selectedResource.resourceId);
                }}
              >
                <RefreshCw size={13} /> Проверить
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {!selectedResource ? (
            <Card>
              <div className="py-16 text-center text-sm text-gray-500">Выберите прокатную позицию.</div>
            </Card>
          ) : loadingDetails ? (
            <Card>
              <div className="py-16 text-center text-sm text-gray-500">Загружаем настройки доступности...</div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                <AvailabilityProfileCard
                  resource={selectedResource}
                  form={profileForm}
                  missing={profileMissing}
                  profile={profile}
                  saving={savingProfile}
                  onFormChange={setProfileForm}
                  onSave={() => void saveProfile()}
                />
                <AvailabilityDiagnosticsCard diagnostics={diagnostics} />
              </div>

              {scheduledProfileReady ? (
                <>
                  <AvailabilityCalendarCard
                    calendar={calendar ?? emptyCalendar()}
                    saving={savingCalendar}
                    onChange={setCalendar}
                    onSave={() => void saveCalendar()}
                  />
                  <AvailabilitySlotsCard
                    slots={slots}
                    form={slotForm}
                    saving={savingSlot}
                    onFormChange={setSlotForm}
                    onCreate={() => void createSlot()}
                    onClose={slot => void closeSlot(slot)}
                  />
                </>
              ) : scheduledMode ? (
                <Card>
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 text-amber-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Сначала включите правила бронирования</h3>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Расписание и окна записи появятся после сохранения включенных правил бронирования.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Инвентарь и модели</h3>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Конкретные велосипеды, модели и остатки теперь управляются в карточке позиции каталога.
                        Здесь остаются только правила, когда клиенты могут бронировать.
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => onNavigate?.(`/resources/${selectedResource.resourceId}`)}>
                      Открыть позицию
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
