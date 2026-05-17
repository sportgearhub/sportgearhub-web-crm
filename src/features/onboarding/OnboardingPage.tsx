import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Clock, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import {
  addressesApi,
  providerOnboardingApi,
  type ProviderOnboarding,
  type ProviderOnboardingDraft,
  type ProviderOnboardingOptions,
  type RuAddressSuggestion,
} from '../../lib/api-client';
import { useAuth } from '../../context/useAuth';

type FormState = Record<keyof ProviderOnboardingDraft, string>;
type FieldErrors = Partial<Record<keyof FormState | 'contact', string>>;
type LegalFormMismatch = {
  selectedLabel: string;
  returnedLabel: string;
  returnedValue: string;
};

const emptyForm: FormState = {
  displayName: '',
  legalName: '',
  legalCountryCode: 'RU',
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

const legalFieldLabels: Partial<Record<keyof ProviderOnboardingDraft, string>> = {
  legalName: 'Название юрлица или ИП',
  taxNumber: 'ИНН',
  registrationNumber: 'ОГРН / ОГРНИП',
  branchNumber: 'КПП',
  registeredAddress: 'Юридический адрес',
};

const legalFieldOrder: Array<keyof ProviderOnboardingDraft> = [
  'legalName',
  'taxNumber',
  'registrationNumber',
  'branchNumber',
  'registeredAddress',
];

let onboardingLoadPromise: Promise<ProviderOnboarding> | null = null;
let onboardingOptionsPromise: Promise<ProviderOnboardingOptions> | null = null;

function formFromDraft(draft: ProviderOnboardingDraft | null): FormState {
  if (!draft) return emptyForm;

  return Object.fromEntries(
    Object.keys(emptyForm).map(key => {
      const typedKey = key as keyof ProviderOnboardingDraft;
      if (typedKey === 'legalCountryCode') return [typedKey, 'RU'];
      return [typedKey, draft[typedKey] ?? emptyForm[typedKey]];
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

function OnboardingFrame({ children, contentClassName = 'mx-auto max-w-4xl space-y-5' }: { children: ReactNode; contentClassName?: string }) {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f3f6fb] px-4 py-6">
      <div className="mx-auto mb-5 flex max-w-4xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">Sportgearhub</p>
          <p className="truncate text-sm font-semibold text-gray-950">{user?.email ?? 'Партнерский кабинет'}</p>
        </div>
        <Button onClick={signOut} variant="secondary" size="sm" className="shrink-0">
          <LogOut size={14} />
          Выйти
        </Button>
      </div>
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <OnboardingFrame contentClassName="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
        <p className="text-xs font-medium text-blue-800">Загружаем подключение...</p>
      </div>
    </OnboardingFrame>
  );
}

function DecisionState({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <OnboardingFrame contentClassName="mx-auto max-w-xl">
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
            {icon}
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-950">{title}</h1>
            <p className="mt-1 text-xs leading-5 text-gray-600">{text}</p>
          </div>
        </div>
      </Card>
    </OnboardingFrame>
  );
}

function formatReviewDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function AddressSuggestionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<RuAddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [shouldSuggest, setShouldSuggest] = useState(false);

  useEffect(() => {
    setQuery(value);
    setShouldSuggest(false);
  }, [value]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!shouldSuggest || trimmedQuery.length < 3) {
      setSuggestions([]);
      setSuggestError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await addressesApi.ruSuggestions(trimmedQuery, 10);
        if (cancelled) return;
        setSuggestions(response.suggestions);
        setSuggestError('');
        setOpen(true);
      } catch {
        if (cancelled) return;
        setSuggestions([]);
        setSuggestError('Не удалось загрузить подсказки адреса.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, shouldSuggest]);

  const selectSuggestion = (suggestion: RuAddressSuggestion) => {
    setQuery(suggestion.value);
    setShouldSuggest(false);
    onChange(suggestion.value);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        label="Адрес"
        value={query}
        onChange={event => {
          setQuery(event.target.value);
          setShouldSuggest(true);
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        placeholder="Начните вводить адрес"
      />

      {open && (loading || suggestions.length > 0 || suggestError) && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[#d7e0ea] bg-white py-1 shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-500">Ищем адрес...</div>
          )}
          {!loading && suggestError && (
            <div className="px-3 py-2 text-xs text-red-600">{suggestError}</div>
          )}
          {!loading && !suggestError && suggestions.map(suggestion => (
            <button
              key={`${suggestion.fiasId ?? suggestion.value}-${suggestion.unrestrictedValue}`}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              className="w-full truncate px-3 py-2 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              title={suggestion.value}
            >
              {suggestion.value}
            </button>
          ))}
          {!loading && !suggestError && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">Ничего не найдено.</div>
          )}
        </div>
      )}
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
  const [legalLookupLoading, setLegalLookupLoading] = useState(false);
  const [legalLookupError, setLegalLookupError] = useState('');
  const [legalFormMismatch, setLegalFormMismatch] = useState<LegalFormMismatch | null>(null);
  const [taxLookupModalOpen, setTaxLookupModalOpen] = useState(false);
  const [taxLookupTaxNumber, setTaxLookupTaxNumber] = useState('');
  const [taxLookupBranchNumber, setTaxLookupBranchNumber] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isReviewing = onboarding?.status === 'submitted' || onboarding?.status === 'in_review';
  const reviewMessage = onboarding?.review?.message;
  const reviewDate = formatReviewDate(onboarding?.review?.reviewedAt);

  const selectedLegalForm = options?.legalForms.find(option => option.value === form.legalForm);
  const requiredLegalFields = selectedLegalForm?.requiredLegalIdentityFields ?? [];
  const isRequiredLegalField = (field: keyof ProviderOnboardingDraft) => requiredLegalFields.includes(field);
  const visibleLegalFields = legalFieldOrder.filter(field => isRequiredLegalField(field));
  const legalFormLabels = useMemo(
    () => Object.fromEntries(options?.legalForms.map(option => [option.value, option.label]) ?? []),
    [options]
  );
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

  useEffect(() => {
    if (onboarding?.status !== 'approved' && onboarding?.status !== 'accepted') return;

    void reloadUser().then(session => {
      if (session?.memberships.length) {
        window.history.replaceState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });
  }, [onboarding?.status, reloadUser]);

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

  const selectLegalForm = (legalForm: string) => {
    setForm(current => ({
      ...current,
      legalCountryCode: 'RU',
      legalForm,
    }));
    setLegalFormMismatch(current => current?.returnedValue === legalForm ? null : current);
    setFieldErrors(current => {
      const next = { ...current };
      delete next.legalForm;
      delete next.legalCountryCode;
      return next;
    });
  };

  const openTaxLookupModal = () => {
    setTaxLookupTaxNumber(form.taxNumber);
    setTaxLookupBranchNumber(form.branchNumber);
    setLegalLookupError('');
    setTaxLookupModalOpen(true);
  };

  const lookupLegalIdentity = async () => {
    const taxNumber = taxLookupTaxNumber.trim();
    const branchNumber = taxLookupBranchNumber.trim();

    if (!selectedLegalForm) {
      setLegalLookupError('Сначала выберите правовую форму.');
      return;
    }

    if (taxNumber.length < 10) {
      setLegalLookupError('Введите ИНН.');
      return;
    }

    setLegalLookupLoading(true);
    setLegalLookupError('');
    try {
      const result = await providerOnboardingApi.lookupRuLegalIdentity(taxNumber, branchNumber || undefined);
      setForm(current => ({
        ...current,
        legalCountryCode: 'RU',
        legalName: result.legalName ?? current.legalName,
        taxNumber: result.taxNumber ?? taxNumber,
        registrationNumber: result.registrationNumber ?? current.registrationNumber,
        branchNumber: result.branchNumber ?? branchNumber,
        registeredAddress: result.registeredAddress ?? current.registeredAddress,
      }));

      if (result.legalForm && result.legalForm !== selectedLegalForm.value) {
        setLegalFormMismatch({
          selectedLabel: selectedLegalForm.label,
          returnedLabel: legalFormLabels[result.legalForm] ?? result.legalForm,
          returnedValue: result.legalForm,
        });
      } else {
        setLegalFormMismatch(null);
      }
      setTaxLookupModalOpen(false);
    } catch {
      setLegalLookupError('Не удалось найти реквизиты по ИНН.');
    } finally {
      setLegalLookupLoading(false);
    }
  };

  const handleTaxLookupSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await lookupLegalIdentity();
  };


  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!form.displayName.trim()) {
      nextErrors.displayName = 'Укажите название партнера.';
    }

    if (!form.legalCountryCode) {
      nextErrors.legalCountryCode = 'Выберите страну регистрации.';
    }

    if (!form.legalForm || !selectedLegalForm) {
      nextErrors.legalForm = 'Выберите правовую форму.';
    }

    requiredLegalFields.forEach(field => {
      if (!form[field].trim()) {
        nextErrors[field] = 'Заполните поле.';
      }
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const startOnboarding = async () => {
    setError('');
    setStarting(true);
    try {
      const next = await providerOnboardingApi.create();
      setOnboarding(next);
      setForm(formFromDraft(next.draft));
    } catch {
      setError('Ошибка в работе сервиса.');
    } finally {
      setStarting(false);
    }
  };

  const save = async () => {
    if (!validateForm()) return null;
    setError('');
    setSaving(true);
    try {
      const next = await providerOnboardingApi.updateProfile({ ...form, legalCountryCode: 'RU' });
      setOnboarding(next);
      setForm(formFromDraft(next.draft));
      return next;
    } catch {
      setError('Ошибка в работе сервиса.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (isReviewing) return;
    if (!validateForm()) return;
    setError('');
    setSubmitting(true);
    try {
      const saved = await providerOnboardingApi.updateProfile({ ...form, legalCountryCode: 'RU' });
      setOnboarding(saved);
      if (!saved.checklist || !Object.values(saved.checklist).every(value => value === 'ready')) {
        setError('Сохраните обязательные данные перед отправкой.');
        return;
      }
      const next = await providerOnboardingApi.submit();
      setOnboarding(next);
      setForm(formFromDraft(next.draft));
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

  if (onboarding.status === 'rejected' || onboarding.status === 'cancelled') {
    return (
      <DecisionState
        title="Заявка не активна"
        text={reviewMessage || 'Текущую заявку нельзя продолжить. Свяжитесь с поддержкой Sportgearhub, чтобы уточнить следующий шаг.'}
        icon={<AlertCircle size={18} />}
      />
    );
  }

  if (onboarding.status === 'not_started') {
    return (
      <OnboardingFrame contentClassName="mx-auto max-w-xl">
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
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-950">Подключение партнера</h1>
            <p className="mt-1 text-sm text-gray-600">Заполните профиль и реквизиты на одной странице, чтобы отправить заявку на проверку.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertCircle size={14} className="shrink-0 text-red-600" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {onboarding.status === 'changes_requested' && reviewMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-700" />
            <div>
              <p className="text-xs leading-5 text-amber-800">{reviewMessage}</p>
              {reviewDate && <p className="mt-1 text-[11px] font-medium text-amber-700">Проверено: {reviewDate}</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="legalCountryCode" value="RU" />

          <Card>
            <CardHeader title="Основное" />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Название партнера *" value={form.displayName} onChange={event => updateField('displayName', event.target.value)} error={fieldErrors.displayName} />
              <AddressSuggestionInput value={form.address} onChange={value => updateField('address', value)} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Правовая форма" />
            <div className="flex overflow-x-auto rounded-md border border-[#cbd5e1] bg-gray-50 p-1" role="radiogroup" aria-label="Правовая форма">
              {options?.legalForms.map(option => {
                const isSelected = option.value === form.legalForm;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectLegalForm(option.value)}
                    className={`flex min-h-10 flex-1 shrink-0 items-center justify-center gap-2 rounded px-3 py-2 text-center text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] ${
                      isSelected ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-950'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                    aria-pressed={isSelected}
                  >
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.legalForm && <p className="mt-1 text-xs text-red-600">{fieldErrors.legalForm}</p>}

            {selectedLegalForm && (
              <div className="mt-4 border-t border-[#e2e8f0] pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-700">Реквизиты</p>
                  <Button type="button" size="sm" onClick={openTaxLookupModal}>
                    Заполнить по ИНН
                  </Button>
                </div>
                {legalFormMismatch && (
                  <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-700" />
                    <p className="text-xs leading-5 text-amber-800">
                      По ИНН найдена форма: {legalFormMismatch.returnedLabel}. Вы выбрали: {legalFormMismatch.selectedLabel}.
                    </p>
                  </div>
                )}
              {visibleLegalFields.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleLegalFields.map(field => (
                    <Input
                      key={field}
                      label={`${legalFieldLabels[field] ?? field} *`}
                      value={form[field]}
                      onChange={event => updateField(field, event.target.value)}
                      error={fieldErrors[field]}
                      className={field === 'registeredAddress' ? 'md:col-span-2' : ''}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <p className="text-xs leading-5 text-blue-800">Для выбранной правовой формы дополнительные реквизиты не требуются.</p>
                </div>
              )}
              </div>
            )}
          </Card>

          <div className="grid gap-2 sm:flex sm:justify-end">
            <Button type="submit" loading={saving} className="min-h-10 w-full justify-center sm:w-32">
              Сохранить
            </Button>
            {isReviewing ? (
              <Button type="button" variant="secondary" disabled className="min-h-10 w-full justify-center sm:w-52">
                На проверке
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                loading={submitting}
                onClick={submit}
                title="Анкета готова к отправке."
                className="min-h-10 w-full justify-center sm:w-52"
              >
                Отправить на проверку
              </Button>
            )}
          </div>
        </form>

        <Modal
          open={taxLookupModalOpen}
          onClose={() => {
            if (!legalLookupLoading) setTaxLookupModalOpen(false);
          }}
          title="Заполнить по ИНН"
          size="sm"
        >
          <form onSubmit={handleTaxLookupSubmit} className="space-y-4">
            <Input
              label="ИНН *"
              value={taxLookupTaxNumber}
              onChange={event => {
                setTaxLookupTaxNumber(event.target.value);
                setLegalLookupError('');
              }}
              placeholder="Введите ИНН"
              autoFocus
            />
            <Input
              label="КПП"
              value={taxLookupBranchNumber}
              onChange={event => {
                setTaxLookupBranchNumber(event.target.value);
                setLegalLookupError('');
              }}
              placeholder="Для юрлица, если нужно уточнить филиал"
            />
            {legalLookupError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                <p className="text-xs leading-5 text-red-700">{legalLookupError}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setTaxLookupModalOpen(false)}
                disabled={legalLookupLoading}
              >
                Отмена
              </Button>
              <Button type="submit" variant="primary" loading={legalLookupLoading}>
                Найти
              </Button>
            </div>
          </form>
        </Modal>

        {isReviewing && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Clock size={14} className="mt-0.5 shrink-0 text-blue-700" />
            <p className="text-xs leading-5 text-blue-800">Заявка на проверке. Вы можете сохранить изменения в анкете, не отправляя ее повторно.</p>
          </div>
        )}

    </OnboardingFrame>
  );
}
