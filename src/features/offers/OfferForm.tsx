import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { ApiError, offersApi, pricingApi, variantsApi } from '../../lib/api-client';
import type { AdjustmentRule, Offer, OfferAuthoringOption, OfferAuthoringOptions, Resource, ResourceVariant } from '../../types';

type SimpleOption = {
  value: string;
  label: string;
};

function isAuthoringOptionActive(option: OfferAuthoringOption | undefined) {
  return option?.isActive !== false;
}

function nextAuthoringValue(
  current: string,
  fallback: string,
  options: OfferAuthoringOption[]
) {
  const currentOption = options.find(option => option.value === current);
  if (currentOption && isAuthoringOptionActive(currentOption)) return current;

  const defaultOption = options.find(option => option.value === fallback);
  if (defaultOption && isAuthoringOptionActive(defaultOption)) return fallback;

  return options.find(isAuthoringOptionActive)?.value ?? '';
}

export type OfferFormData = Partial<Offer> & {
  selectedVariantIds?: string[];
  pricingMode?: string;
  pricingBaseAmount?: number;
  pricingCurrency?: string;
  pricingStatus?: string;
  adjustmentRules?: AdjustmentRule[];
};

interface OfferFormProps {
  offer?: Offer;
  resources: Resource[];
  onSubmit: (data: OfferFormData) => void | Promise<void>;
  onCancel: () => void;
  initialResourceId?: string;
  submitting?: boolean;
}

export function OfferForm({ offer, resources, onSubmit, onCancel, initialResourceId, submitting = false }: OfferFormProps) {
  const [title, setTitle] = useState(offer?.title || '');
  const [resourceId, setResourceId] = useState(offer?.primaryResourceId || offer?.resourceId || initialResourceId || '');
  const [offerType, setOfferType] = useState(offer?.offerType || '');
  const [bookingFlowType, setBookingFlowType] = useState(offer?.bookingFlowType || '');
  const [variantExposureMode, setVariantExposureMode] = useState(offer?.variantExposureMode || '');
  const [pricingMode, setPricingMode] = useState('per_unit_time');
  const [pricingBaseAmount, setPricingBaseAmount] = useState(String(offer?.basePrice || offer?.price || ''));
  const [pricingCurrency, setPricingCurrency] = useState(offer?.currency || 'RUB');
  const [adjustmentRules, setAdjustmentRules] = useState<AdjustmentRule[]>([]);
  const [advancedPricingOpen, setAdvancedPricingOpen] = useState(false);
  const [description, setDescription] = useState(offer?.description || '');
  const [authoringOptions, setAuthoringOptions] = useState<OfferAuthoringOptions | null>(null);
  const [resourceVariants, setResourceVariants] = useState<ResourceVariant[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [variantsError, setVariantsError] = useState('');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resourceOptions = [
    { value: '', label: 'Выберите позицию' },
    ...resources.map(r => ({ value: r.resourceId, label: r.title })),
  ];

  useEffect(() => {
    let cancelled = false;

    setOptionsLoading(true);
    setOptionsError('');
    offersApi.authoringOptions(resourceId || undefined)
      .then(options => {
        if (cancelled) return;

        setAuthoringOptions(options);
        setOfferType(current => nextAuthoringValue(current, options.defaults.offerType, options.offerTypes));
        setBookingFlowType(current => nextAuthoringValue(current, options.defaults.bookingFlowType, options.bookingFlowTypes));
        setVariantExposureMode(current => nextAuthoringValue(current, options.defaults.variantExposureMode, options.variantExposureModes));
      })
      .catch(err => {
        if (!cancelled) {
          setOptionsError(err instanceof ApiError ? err.message : 'Не удалось загрузить параметры предложения.');
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  useEffect(() => {
    if (!resourceId) {
      setResourceVariants([]);
      setSelectedVariantIds([]);
      return;
    }

    let cancelled = false;

    setVariantsLoading(true);
    setVariantsError('');
    variantsApi.list(resourceId)
      .then(variants => {
        if (cancelled) return;
        const nextVariants = variants.slice().sort((a, b) => a.sortOrder - b.sortOrder);
        setResourceVariants(nextVariants);
        setSelectedVariantIds(current => current.filter(id => nextVariants.some(variant => variant.variantId === id || variant.id === id)));
      })
      .catch(err => {
        if (!cancelled) {
          setResourceVariants([]);
          setSelectedVariantIds([]);
          setVariantsError(err instanceof ApiError ? err.message : 'Не удалось загрузить модели позиции.');
        }
      })
      .finally(() => {
        if (!cancelled) setVariantsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  useEffect(() => {
    if (variantExposureMode !== 'selected_variants_only') return;
    if (selectedVariantIds.length > 0) return;

    const activeVariantIds = resourceVariants
      .filter(variant => variant.status === 'active')
      .map(variant => variant.variantId || variant.id)
      .filter(Boolean);

    if (activeVariantIds.length > 0) setSelectedVariantIds(activeVariantIds);
  }, [resourceVariants, selectedVariantIds.length, variantExposureMode]);

  useEffect(() => {
    if (!offer?.offerId) return;
    let cancelled = false;

    setPricingLoading(true);
    setPricingError('');
    pricingApi.getOfferPolicy(offer.offerId)
      .then(policy => {
        if (cancelled) return;
        setPricingMode(policy.pricingMode || 'per_unit_time');
        setPricingBaseAmount(String(policy.baseAmount ?? policy.unitRules?.baseAmount ?? ''));
        setPricingCurrency(policy.currency || 'RUB');
        setAdjustmentRules(policy.adjustmentRules ?? []);
      })
      .catch(err => {
        if (!cancelled && !(err instanceof ApiError && err.status === 404)) {
          setPricingError(err instanceof ApiError ? err.message : 'Не удалось загрузить цену предложения.');
        }
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [offer?.offerId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Укажите название.';
    if (!resourceId) e.resourceId = 'Выберите позицию инвентаря.';
    if (!offerType) e.offerType = 'Выберите тип предложения.';
    if (offerType && !isAuthoringOptionActive(authoringOptions?.offerTypes.find(option => option.value === offerType))) {
      e.offerType = 'Этот тип предложения недоступен.';
    }
    if (!bookingFlowType) e.bookingFlowType = 'Выберите сценарий бронирования.';
    if (bookingFlowType && !isAuthoringOptionActive(authoringOptions?.bookingFlowTypes.find(option => option.value === bookingFlowType))) {
      e.bookingFlowType = 'Этот сценарий бронирования недоступен.';
    }
    if (!variantExposureMode) e.variantExposureMode = 'Выберите режим моделей.';
    if (variantExposureMode && !isAuthoringOptionActive(authoringOptions?.variantExposureModes.find(option => option.value === variantExposureMode))) {
      e.variantExposureMode = 'Этот режим моделей недоступен.';
    }
    if (variantExposureMode === 'selected_variants_only' && selectedVariantIds.length === 0) {
      e.selectedVariantIds = 'Выберите хотя бы одну модель.';
    }
    if (!pricingMode) e.pricingMode = 'Выберите способ расчета цены.';
    if (!pricingCurrency.trim()) e.pricingCurrency = 'Укажите валюту.';
    if (!pricingBaseAmount || isNaN(Number(pricingBaseAmount)) || Number(pricingBaseAmount) < 0) {
      e.pricingBaseAmount = 'Укажите корректную цену за час.';
    }
    adjustmentRules.forEach((rule, index) => {
      if (!rule.type) e[`adjustment-${index}`] = 'Выберите тип правила.';
      if (rule.type === 'percent' && (rule.percent === undefined || rule.percent === null || Number.isNaN(Number(rule.percent)))) {
        e[`adjustment-${index}`] = 'Укажите процент.';
      }
      if (rule.type === 'fixed' && (rule.amount === undefined || rule.amount === null || Number.isNaN(Number(rule.amount)))) {
        e[`adjustment-${index}`] = 'Укажите сумму.';
      }
    });
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const resource = resources.find(r => r.resourceId === resourceId);
    void onSubmit({
      title,
      primaryResourceId: resourceId,
      offerType,
      bookingFlowType,
      variantExposureMode,
      resourceId,
      resourceTitle: resource?.title || '',
      pricingMode,
      pricingBaseAmount: Number(pricingBaseAmount),
      pricingCurrency: pricingCurrency || 'RUB',
      pricingStatus: 'active',
      adjustmentRules,
      description,
      selectedVariantIds: variantExposureMode === 'selected_variants_only' ? selectedVariantIds : undefined,
    });
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{offer ? 'Редактировать предложение' : 'Создать предложение'}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {offer ? 'Обновите условия предложения.' : 'Опишите новое предложение аренды для клиентов.'}
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            label="Название предложения"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={errors.title}
            placeholder="Например: горный велосипед на день"
          />
          <FancySelect
            label="Инвентарь"
            options={resourceOptions}
            value={resourceId}
            onChange={value => {
              setResourceId(value);
              setOfferType('');
              setBookingFlowType('');
              setVariantExposureMode('');
            }}
            error={errors.resourceId}
          />

          <div className="space-y-3">
            <OptionPicker
              title="Тип предложения"
              options={authoringOptions?.offerTypes ?? []}
              value={offerType}
              loading={optionsLoading}
              error={errors.offerType}
              onChange={setOfferType}
            />
            <OptionPicker
              title="Бронирование"
              options={authoringOptions?.bookingFlowTypes ?? []}
              value={bookingFlowType}
              loading={optionsLoading}
              error={errors.bookingFlowType}
              onChange={setBookingFlowType}
            />
            <OptionPicker
              title="Модели"
              options={authoringOptions?.variantExposureModes ?? []}
              value={variantExposureMode}
              loading={optionsLoading}
              error={errors.variantExposureMode}
              onChange={setVariantExposureMode}
            />
            {variantExposureMode === 'selected_variants_only' && (
              <VariantPicker
                variants={resourceVariants}
                selectedIds={selectedVariantIds}
                loading={variantsLoading}
                error={errors.selectedVariantIds || variantsError}
                onChange={setSelectedVariantIds}
              />
            )}
            {optionsError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {optionsError}
              </p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Цена предложения</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Сохранится вместе с предложением и будет использоваться при расчете бронирования.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
            <Input
              label={pricingMode === 'per_unit_time' ? 'Цена за час' : 'Цена'}
              type="number"
              value={pricingBaseAmount}
              onChange={e => setPricingBaseAmount(e.target.value)}
              error={errors.pricingBaseAmount}
              placeholder="Например: 500"
            />
            <Input
              label="Валюта"
              value={pricingCurrency}
              onChange={e => setPricingCurrency(e.target.value.toUpperCase())}
              placeholder="RUB"
              disabled={pricingLoading}
            />
            </div>

            <button
              type="button"
              onClick={() => setAdvancedPricingOpen(current => !current)}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-gray-100"
            >
              <span>Расширенные правила цены</span>
              <ChevronDown size={14} className={`text-gray-400 transition ${advancedPricingOpen ? 'rotate-180' : ''}`} />
            </button>

            {advancedPricingOpen && (
              <div className="mt-3 space-y-3 rounded-md border border-gray-100 bg-gray-50 p-3">
                <div className="grid gap-3 md:grid-cols-1">
                  <FancySelect
                    label="Как считать цену"
                    options={[
                      { value: 'fixed', label: 'Фиксированная' },
                      { value: 'per_unit_time', label: 'За время проката' },
                      { value: 'per_participant', label: 'За участника' },
                      { value: 'tiered', label: 'По тарифам' },
                      { value: 'dynamic', label: 'Динамическая' },
                    ]}
                    value={pricingMode}
                    error={errors.pricingMode}
                    onChange={setPricingMode}
                  />
                </div>

              </div>
            )}
          </div>
          {pricingError && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Не удалось загрузить текущую цену. Можно сохранить новое значение.
            </p>
          )}
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
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {offer ? 'Сохранить изменения' : 'Создать предложение'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}

function FancySelect({
  label,
  options,
  value,
  error,
  onChange,
}: {
  label: string;
  options: SimpleOption[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <p className="mb-1.5 text-xs font-medium text-foreground">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className={`flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          error ? 'border-red-300' : open ? 'border-blue-300' : 'border-gray-200'
        }`}
      >
        <span className={`truncate ${selected?.value ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected?.label ?? 'Выберите значение'}
        </span>
        <ChevronDown size={16} className={`ml-3 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
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
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                  isSelected ? 'bg-blue-50 text-blue-950' : 'text-gray-800 hover:bg-gray-50'
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

function variantId(variant: ResourceVariant) {
  return variant.variantId || variant.id;
}

function VariantPicker({
  variants,
  selectedIds,
  loading,
  error,
  onChange,
}: {
  variants: ResourceVariant[];
  selectedIds: string[];
  loading: boolean;
  error?: string;
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const filtered = variants.filter(variant => {
    const searchText = `${variant.label || variant.title || ''} ${variant.variantKey || ''}`.toLowerCase();
    const matchesQuery = !query || searchText.includes(query.toLowerCase());
    const matchesStatus = !statusFilter || variant.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const toggleVariant = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(selectedId => selectedId !== id)
        : [...selectedIds, id]
    );
  };

  if (loading) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">Выбранные модели</p>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Загружаем модели позиции...
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">Выбранные модели</p>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          У позиции пока нет моделей для выбора.
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-foreground">Выбранные модели</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${
          error ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        <span className={selectedIds.length > 0 ? 'font-medium text-gray-900' : 'text-gray-400'}>
          {selectedIds.length > 0 ? `Выбрано: ${selectedIds.length}` : 'Выберите модели'}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Выбор моделей" size="lg">
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Поиск по названию или ключу..."
            />
            <FancySelect
              label=""
              options={[
                { value: '', label: 'Все статусы' },
                { value: 'active', label: 'Активные' },
                { value: 'inactive', label: 'Неактивные' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-500">
              {filtered.length === 0
                ? 'Нет моделей'
                : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)} из ${filtered.length}`}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange(variants.filter(variant => variant.status === 'active').map(variantId))}
                className="font-medium text-blue-700 hover:text-blue-900"
              >
                Все активные
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="font-medium text-gray-500 hover:text-gray-800"
              >
                Очистить
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {paginated.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-8 text-center text-sm text-gray-500">
                Модели не найдены.
              </div>
            ) : paginated.map(variant => {
              const id = variantId(variant);
              const checked = selectedIds.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleVariant(id)}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition ${
                    checked ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'
                  }`}>
                    {checked && <Check size={12} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {variant.label || variant.title || variant.variantKey}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {variant.status === 'active' ? 'Активен' : 'Неактивен'} · {variant.variantKey}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">Выбрано: {selectedIds.length}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(value => Math.max(1, value - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <span className="min-w-14 text-center text-xs text-gray-500">{currentPage}/{pageCount}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(value => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
              >
                Далее
              </Button>
              <Button size="sm" variant="primary" onClick={() => setOpen(false)}>
                Готово
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function OptionPicker({
  title,
  options,
  value,
  loading,
  error,
  onChange,
}: {
  title: string;
  options: OfferAuthoringOption[];
  value: string;
  loading: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  if (loading) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">{title}</p>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Загружаем модели...
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <p className="mb-1.5 text-xs font-medium text-foreground">{title}</p>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className={`flex min-h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          error ? 'border-red-300' : open ? 'border-blue-300' : 'border-gray-200'
        }`}
      >
        <span className="min-w-0">
          <span className={`block truncate font-medium ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
            {selected?.title ?? 'Выберите значение'}
          </span>
          {selected?.description && (
            <span className="mt-0.5 block truncate text-xs text-gray-500">{selected.description}</span>
          )}
        </span>
        <ChevronDown size={16} className={`ml-3 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.map(option => {
            const isSelected = option.value === value;
            const isActive = isAuthoringOptionActive(option);

            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  if (!isActive) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                disabled={!isActive}
                className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition ${
                  !isActive
                    ? 'cursor-not-allowed bg-gray-50 text-gray-400'
                    : isSelected
                      ? 'bg-blue-50 text-blue-950'
                      : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span>{option.title}</span>
                    {!isActive && (
                      <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Недоступно
                      </span>
                    )}
                  </span>
                  {option.description && (
                    <span className={`mt-0.5 block text-xs leading-4 ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                      {option.description}
                    </span>
                  )}
                </span>
                {isSelected && <Check size={14} className="mt-0.5 shrink-0 text-blue-700" />}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
