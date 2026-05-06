import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  providerOnboardingApi,
  type ProviderOnboarding,
  type ProviderOnboardingDraft,
} from '../../lib/api-client';
import { useAuth } from '../../context/useAuth';

type FormState = Record<keyof ProviderOnboardingDraft, string>;

const emptyForm: FormState = {
  displayName: '',
  legalName: '',
  legalCountryCode: '',
  legalForm: '',
  taxNumber: '',
  registrationNumber: '',
  branchNumber: '',
  registeredAddress: '',
  contactEmail: '',
  contactPhone: '',
  city: '',
  addressLine: '',
  description: '',
};

const checklistLabels = {
  providerIdentity: 'Название партнера',
  profileContact: 'Контакты',
  legalIdentity: 'Юридические данные',
};

let onboardingLoadPromise: Promise<ProviderOnboarding> | null = null;

function formFromDraft(draft: ProviderOnboardingDraft | null): FormState {
  if (!draft) return emptyForm;

  return Object.fromEntries(
    Object.keys(emptyForm).map(key => {
      const typedKey = key as keyof ProviderOnboardingDraft;
      return [typedKey, draft[typedKey] ?? ''];
    })
  ) as FormState;
}

async function loadCurrentOnboarding() {
  if (!onboardingLoadPromise) {
    onboardingLoadPromise = providerOnboardingApi.current()
      .then(current => current.status === 'not_started' ? providerOnboardingApi.create() : current)
      .finally(() => {
        onboardingLoadPromise = null;
      });
  }

  return onboardingLoadPromise;
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
        <p className="text-xs font-medium text-blue-800">Загружаем подключение...</p>
      </div>
    </div>
  );
}

function DecisionState({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#f3f6fb] px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
              {icon}
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-950">{title}</h1>
              <p className="mt-1 text-xs leading-5 text-gray-600">{text}</p>
            </div>
          </div>
          <Button onClick={signOut} variant="ghost" className="w-full justify-center">
            Выйти
          </Button>
        </Card>
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const { reloadUser } = useAuth();
  const [onboarding, setOnboarding] = useState<ProviderOnboarding | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    const checklist = onboarding?.checklist;
    return Boolean(checklist && Object.values(checklist).every(value => value === 'ready'));
  }, [onboarding]);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const next = await loadCurrentOnboarding();
      setOnboarding(next);
      setForm(formFromDraft(next.draft));
    } catch {
      setError('Ошибка в работе сервиса.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const next = await providerOnboardingApi.updateProfile(form);
      setOnboarding(next);
      setForm(formFromDraft(next.draft));
    } catch {
      setError('Ошибка в работе сервиса.');
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const saved = await providerOnboardingApi.updateProfile(form);
      setOnboarding(saved);
      const next = await providerOnboardingApi.submit();
      setOnboarding(next);
      setForm(formFromDraft(next.draft));
      await reloadUser();
    } catch {
      setError('Ошибка в работе сервиса.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await save();
  };

  if (loading) return <LoadingState />;

  if (!onboarding) {
    return (
      <DecisionState
        title="Подключение недоступно"
        text={error || 'Не удалось открыть анкету подключения.'}
        icon={<AlertCircle size={18} />}
      />
    );
  }

  if (onboarding.status === 'submitted' || onboarding.status === 'in_review') {
    return (
      <DecisionState
        title="Заявка на проверке"
        text="Мы получили данные компании. После проверки доступ к кабинету партнера появится автоматически."
        icon={<Clock size={18} />}
      />
    );
  }

  if (onboarding.status === 'rejected' || onboarding.status === 'cancelled') {
    return (
      <DecisionState
        title="Заявка не активна"
        text="Текущую заявку нельзя продолжить. Свяжитесь с поддержкой Sportgearhub, чтобы уточнить следующий шаг."
        icon={<AlertCircle size={18} />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-950">Подключение партнера</h1>
          <p className="mt-1 text-sm text-gray-600">Заполните данные компании, чтобы отправить заявку на проверку.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertCircle size={14} className="shrink-0 text-red-600" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader title="Готовность анкеты" subtitle="Разделы обновляются после сохранения." />
          <div className="grid gap-2 sm:grid-cols-3">
            {onboarding.checklist && Object.entries(onboarding.checklist).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-[#d7e0ea] px-3 py-2">
                <span className="text-xs font-medium text-gray-700">{checklistLabels[key as keyof typeof checklistLabels]}</span>
                <Badge variant={value === 'ready' ? 'green' : 'yellow'}>
                  {value === 'ready' ? 'Готово' : 'Нужно заполнить'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card>
            <CardHeader title="Профиль партнера" subtitle="Название и контактные данные для связи." />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Название для клиентов" value={form.displayName} onChange={event => updateField('displayName', event.target.value)} />
              <Input label="Почта для связи" type="email" value={form.contactEmail} onChange={event => updateField('contactEmail', event.target.value)} />
              <Input label="Телефон для связи" value={form.contactPhone} onChange={event => updateField('contactPhone', event.target.value)} />
              <Input label="Город" value={form.city} onChange={event => updateField('city', event.target.value)} />
              <Input label="Адрес точки выдачи" value={form.addressLine} onChange={event => updateField('addressLine', event.target.value)} className="md:col-span-2" />
              <Textarea label="Описание" value={form.description} onChange={event => updateField('description', event.target.value)} rows={3} className="md:col-span-2" />
            </div>
          </Card>

          <Card>
            <CardHeader title="Юридические данные" subtitle="Эти поля нужны для проверки партнера." />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Юридическое название" value={form.legalName} onChange={event => updateField('legalName', event.target.value)} />
              <Input label="Страна регистрации" value={form.legalCountryCode} onChange={event => updateField('legalCountryCode', event.target.value)} placeholder="KZ, RU, AM" />
              <Input label="Правовая форма" value={form.legalForm} onChange={event => updateField('legalForm', event.target.value)} placeholder="ИП, ТОО, ООО" />
              <Input label="Налоговый номер" value={form.taxNumber} onChange={event => updateField('taxNumber', event.target.value)} />
              <Input label="Регистрационный номер" value={form.registrationNumber} onChange={event => updateField('registrationNumber', event.target.value)} />
              <Input label="Номер филиала" value={form.branchNumber} onChange={event => updateField('branchNumber', event.target.value)} />
              <Input label="Юридический адрес" value={form.registeredAddress} onChange={event => updateField('registeredAddress', event.target.value)} className="md:col-span-2" />
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" loading={saving} className="justify-center">
              Сохранить
            </Button>
            <Button type="button" variant="primary" loading={submitting} disabled={!canSubmit} onClick={submit} className="justify-center">
              Отправить на проверку
            </Button>
          </div>
        </form>

        {!canSubmit && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <FileText size={14} className="mt-0.5 shrink-0 text-amber-700" />
            <p className="text-xs leading-5 text-amber-800">Сохраните обязательные разделы, чтобы отправить заявку.</p>
          </div>
        )}
      </div>
    </div>
  );
}
