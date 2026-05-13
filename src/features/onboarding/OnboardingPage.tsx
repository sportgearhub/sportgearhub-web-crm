import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Check, ChevronDown, Clock, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  providerOnboardingApi,
  type ProviderOnboarding,
  type ProviderOnboardingDraft,
  type ProviderOnboardingOptions,
} from '../../lib/api-client';
import { useAuth } from '../../context/useAuth';

type FormState = Record<keyof ProviderOnboardingDraft, string>;
type StepId = 'basic' | 'legalForm' | 'legalDetails';
type FieldErrors = Partial<Record<keyof FormState | 'contact', string>>;

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
  address: '',
  description: '',
};

const checklistLabels = {
  profile: 'Профиль',
  legal: 'Юридические данные',
};

const steps: Array<{ id: StepId; title: string; description: string }> = [
  {
    id: 'basic',
    title: 'О партнере',
    description: 'Название и контакты',
  },
  {
    id: 'legalForm',
    title: 'Форма',
    description: 'Тип регистрации',
  },
  {
    id: 'legalDetails',
    title: 'Реквизиты',
    description: 'Данные для проверки',
  },
];

let onboardingLoadPromise: Promise<ProviderOnboarding> | null = null;
let onboardingOptionsPromise: Promise<ProviderOnboardingOptions> | null = null;

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
      .finally(() => {
        onboardingLoadPromise = null;
      });
  }

  return onboardingLoadPromise;
}

async function loadOnboardingOptions() {
  if (!onboardingOptionsPromise) {
    onboardingOptionsPromise = providerOnboardingApi.options()
      .finally(() => {
        onboardingOptionsPromise = null;
      });
  }

  return onboardingOptionsPromise;
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

function FancySelect({
  label,
  value,
  options,
  error,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={`flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] ${
          error ? 'border-[#dc3545]' : open ? 'border-[#86b7fe]' : 'border-[#cbd5e1]'
        } ${selected?.value ? 'text-[#1f2d3d]' : 'text-[#8a97a8]'}`}
      >
        <span className="truncate">{selected?.label ?? 'Выберите значение'}</span>
        <ChevronDown size={15} className={`ml-2 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[#d7e0ea] bg-white py-1 shadow-lg">
          {options.map(option => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-blue-700" />}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function OnboardingPage() {
  const { reloadUser } = useAuth();
  const [onboarding, setOnboarding] = useState<ProviderOnboarding | null>(null);
  const [options, setOptions] = useState<ProviderOnboardingOptions | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [activeStep, setActiveStep] = useState<StepId>('basic');

  const canSubmit = useMemo(() => {
    const checklist = onboarding?.checklist;
    return Boolean(checklist && Object.values(checklist).every(value => value === 'ready'));
  }, [onboarding]);

  const selectedLegalForm = options?.legalForms.find(option => option.value === form.legalForm);
  const requiredLegalFields = selectedLegalForm?.requiredLegalIdentityFields ?? [];
  const isRequiredLegalField = (field: keyof ProviderOnboardingDraft) => requiredLegalFields.includes(field);
  const activeStepIndex = steps.findIndex(step => step.id === activeStep);
  const activeStepMeta = steps[activeStepIndex] ?? steps[0];
  const progressPercent = ((activeStepIndex + 1) / steps.length) * 100;

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const [next, nextOptions] = await Promise.all([
        loadCurrentOnboarding(),
        loadOnboardingOptions(),
      ]);
      setOnboarding(next);
      setOptions(nextOptions);
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
    setFieldErrors(current => {
      const next = { ...current };
      delete next[field];
      if (field === 'contactEmail' || field === 'contactPhone') {
        delete next.contact;
      }
      return next;
    });
  };

  const legalCountryOptions = [
    { value: '', label: 'Выберите страну' },
    ...(options?.legalCountries ?? []),
  ];

  const legalFormOptions = [
    { value: '', label: 'Выберите форму' },
    ...(options?.legalForms.map(option => ({ value: option.value, label: option.label })) ?? []),
  ];

  const validateStep = (step: StepId) => {
    const nextErrors: FieldErrors = {};

    if (step === 'basic') {
      if (!form.displayName.trim()) {
        nextErrors.displayName = 'Укажите название партнера.';
      }
      if (!form.contactEmail.trim() && !form.contactPhone.trim()) {
        nextErrors.contact = 'Укажите почту или телефон для связи.';
      }
    }

    if (step === 'legalForm') {
      if (!form.legalCountryCode) {
        nextErrors.legalCountryCode = 'Выберите страну регистрации.';
      }
      if (!form.legalForm) {
        nextErrors.legalForm = 'Выберите правовую форму.';
      }
    }

    if (step === 'legalDetails') {
      requiredLegalFields.forEach(field => {
        if (!form[field].trim()) {
          nextErrors[field] = 'Заполните поле.';
        }
      });
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep(activeStep === 'basic' ? 'legalForm' : 'legalDetails');
  };

  const startOnboarding = async () => {
    setError('');
    setStarting(true);
    try {
      const next = await providerOnboardingApi.create();
      setOnboarding(next);
      setForm(formFromDraft(next.draft));
      setActiveStep('basic');
    } catch {
      setError('Ошибка в работе сервиса.');
    } finally {
      setStarting(false);
    }
  };

  const save = async () => {
    if (!validateStep(activeStep)) return;
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
    if (!validateStep('legalDetails')) return;
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

  if (onboarding.status === 'not_started') {
    return (
      <div className="min-h-screen bg-[#f3f6fb] px-4 py-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                <Building2 size={18} />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-950">Подключение партнера</h1>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Создадим черновик заявки без предзаполненных данных. Затем вы сможете заполнить профиль партнера и юридическую информацию.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <Button onClick={startOnboarding} variant="primary" loading={starting} className="w-full justify-center">
              Начать подключение
            </Button>
          </Card>
        </div>
      </div>
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

        <div className="rounded-lg border border-[#d7e0ea] bg-white px-4 py-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-blue-700">Шаг {activeStepIndex + 1} из {steps.length}</p>
              <h2 className="mt-0.5 text-sm font-semibold text-gray-950">{activeStepMeta.title}</h2>
              <p className="mt-0.5 text-xs text-gray-500">{activeStepMeta.description}</p>
            </div>
            <Badge variant={canSubmit ? 'green' : 'yellow'}>
              {canSubmit ? 'Готово' : 'Заполняется'}
            </Badge>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {activeStep === 'basic' && (
            <Card>
              <CardHeader title="О партнере" subtitle="Название, контакты и место работы." />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Название партнера *" value={form.displayName} onChange={event => updateField('displayName', event.target.value)} error={fieldErrors.displayName} />
                <Input label="Почта для связи" type="email" value={form.contactEmail} onChange={event => updateField('contactEmail', event.target.value)} error={fieldErrors.contact} />
                <Input label="Телефон для связи" value={form.contactPhone} onChange={event => updateField('contactPhone', event.target.value)} error={fieldErrors.contact} />
                <Input label="Город" value={form.city} onChange={event => updateField('city', event.target.value)} />
                <Input label="Адрес" value={form.address} onChange={event => updateField('address', event.target.value)} className="md:col-span-2" />
                <Textarea label="Описание" value={form.description} onChange={event => updateField('description', event.target.value)} rows={3} className="md:col-span-2" />
              </div>
            </Card>
          )}

          {activeStep === 'legalForm' && (
            <Card>
              <CardHeader title="Правовая форма" subtitle="Выберите страну регистрации и тип партнера." />
              <div className="grid gap-4 md:grid-cols-2">
                <FancySelect label="Страна регистрации *" options={legalCountryOptions} value={form.legalCountryCode} onChange={value => updateField('legalCountryCode', value)} error={fieldErrors.legalCountryCode} />
                <FancySelect label="Правовая форма *" options={legalFormOptions} value={form.legalForm} onChange={value => updateField('legalForm', value)} error={fieldErrors.legalForm} />
              </div>
              {selectedLegalForm && (
                <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-blue-900">{selectedLegalForm.label}</p>
                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    На следующем шаге попросим только реквизиты, которые нужны для этой формы.
                  </p>
                </div>
              )}
            </Card>
          )}

          {activeStep === 'legalDetails' && (
            <Card>
              <CardHeader title="Юридические данные" subtitle="Заполните реквизиты для выбранной формы." />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label={`Название юрлица или ИП${isRequiredLegalField('legalName') ? ' *' : ''}`} value={form.legalName} onChange={event => updateField('legalName', event.target.value)} error={fieldErrors.legalName} />
                <Input label={`ИНН${isRequiredLegalField('taxNumber') ? ' *' : ''}`} value={form.taxNumber} onChange={event => updateField('taxNumber', event.target.value)} error={fieldErrors.taxNumber} />
                {isRequiredLegalField('registrationNumber') && (
                  <Input label="ОГРН / ОГРНИП *" value={form.registrationNumber} onChange={event => updateField('registrationNumber', event.target.value)} error={fieldErrors.registrationNumber} />
                )}
                {isRequiredLegalField('branchNumber') && (
                  <Input label="КПП *" value={form.branchNumber} onChange={event => updateField('branchNumber', event.target.value)} error={fieldErrors.branchNumber} />
                )}
                <Input label={`Юридический адрес${isRequiredLegalField('registeredAddress') ? ' *' : ''}`} value={form.registeredAddress} onChange={event => updateField('registeredAddress', event.target.value)} error={fieldErrors.registeredAddress} className="md:col-span-2" />
              </div>
            </Card>
          )}

          <div className="grid gap-2 sm:flex sm:justify-end">
            {activeStep !== 'basic' && (
              <Button
                type="button"
                onClick={() => setActiveStep(activeStep === 'legalDetails' ? 'legalForm' : 'basic')}
                className="min-h-10 w-full justify-center sm:w-32"
              >
                Назад
              </Button>
            )}
            <Button type="submit" loading={saving} className="min-h-10 w-full justify-center sm:w-32">
              Сохранить
            </Button>
            {activeStep === 'basic' && (
              <Button type="button" variant="primary" onClick={goNext} className="min-h-10 w-full justify-center sm:w-32">
                Далее
              </Button>
            )}
            {activeStep === 'legalForm' && (
              <Button type="button" variant="primary" onClick={goNext} className="min-h-10 w-full justify-center sm:w-32">
                Далее
              </Button>
            )}
            {activeStep === 'legalDetails' && (
              <Button type="button" variant="primary" loading={submitting} disabled={!canSubmit} onClick={submit} className="min-h-10 w-full justify-center sm:w-52">
                Отправить на проверку
              </Button>
            )}
          </div>
        </form>

        {!canSubmit && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <div className="mb-2 flex items-start gap-2">
              <FileText size={14} className="mt-0.5 shrink-0 text-amber-700" />
              <p className="text-xs leading-5 text-amber-800">Сохраните обязательные разделы, чтобы отправить заявку.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {onboarding.checklist && Object.entries(onboarding.checklist).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-amber-200 bg-white/60 px-2 py-1.5">
                  <span className="text-[11px] font-medium text-amber-900">{checklistLabels[key as keyof typeof checklistLabels]}</span>
                  <Badge variant={value === 'ready' ? 'green' : 'yellow'}>
                    {value === 'ready' ? 'Готово' : 'Заполнить'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {canSubmit && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <FileText size={14} className="mt-0.5 shrink-0 text-emerald-700" />
            <p className="text-xs leading-5 text-emerald-800">Анкета готова к отправке.</p>
          </div>
        )}
      </div>
    </div>
  );
}
