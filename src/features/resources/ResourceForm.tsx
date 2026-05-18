import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ResourceImageDraftSection, ResourceImagesSection } from './ResourceImagesSection';
import type { Resource } from '../../types';
import {
  ApiError,
  equipmentApi,
  type EquipmentAttribute,
  type EquipmentAttributeSchema,
  type EquipmentBrandSuggestion,
  type EquipmentCategory,
} from '../../lib/api-client';

export type ResourceFormData = {
  title: string;
  categorySlug: string;
  resourceType: string;
  capacityMode: string;
  categoryName?: string;
  description?: string;
  imageUrl?: string;
  imageFiles?: File[];
  status?: Resource['status'];
  variant?: {
    variantKey: string;
    label: string;
    normalizedAttributes: Array<{ key: string; value: string }>;
    status: string;
  };
  variants?: Array<{
    variantKey: string;
    label: string;
    normalizedAttributes: Array<{ key: string; value: string }>;
    status: string;
  }>;
};

interface ResourceFormProps {
  resource?: Resource;
  categories: EquipmentCategory[];
  onSubmit: (data: ResourceFormData) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  loadingCategories?: boolean;
}

type BikeFormState = {
  brandName: string;
  brandId: string;
  model: string;
};

type DraftVariant = {
  id: string;
  attributeValues: Record<string, string>;
};

function optionsForField(field: EquipmentAttribute | undefined) {
  if (!field?.allowedValues.length) return [{ value: '', label: 'Выберите значение' }];

  return [
    { value: '', label: 'Выберите значение' },
    ...field.allowedValues
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(option => ({ value: option.valueKey, label: option.label })),
  ];
}

function textValue(value: unknown) {
  return String(value ?? '').trim();
}

function transliterate(value: string) {
  const table: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  return value.replace(/[А-Яа-яЁё]/g, char => {
    const lower = char.toLowerCase();
    const mapped = table[lower] ?? '';
    return char === lower ? mapped : mapped.toUpperCase();
  });
}

function makeKey(parts: string[]) {
  const key = transliterate(parts.filter(Boolean).join('-'))
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();

  return key || `BIKE-${Date.now()}`;
}

function makeResourceTitle(categoryLabel: string, brandName: string, model: string, override: string) {
  const cleanOverride = textValue(override);
  if (cleanOverride) return cleanOverride;

  const product = [brandName, model].map(textValue).filter(Boolean).join(' ');
  if (!product) return categoryLabel || 'Велосипеды';

  const normalizedCategory = categoryLabel.toLowerCase();
  if (normalizedCategory.includes('велосип')) return `Велосипеды ${product}`;
  return `${categoryLabel} ${product}`.trim();
}

const fixedAttributeKeys = new Set(['brand', 'brand_id', 'brand_name', 'model']);

function makeVariantLabel(form: BikeFormState, attributeValues: Record<string, string>) {
  return [
    [form.brandName, form.model].map(textValue).filter(Boolean).join(' '),
    attributeValues.frame_size,
    attributeValues.wheel_size_in,
  ].map(textValue).filter(Boolean).join(' / ');
}

function newDraftVariant(): DraftVariant {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    attributeValues: {},
  };
}

function isAttributeVisible(attribute: EquipmentAttribute, values: Record<string, string>) {
  if (attribute.visibleWhen.length === 0) return true;

  return attribute.visibleWhen.every(condition => {
    const selectedValue = values[condition.attributeKey];
    return selectedValue ? condition.allowedValueKeys.includes(selectedValue) : false;
  });
}

function visibleSchemaAttributes(schema: EquipmentAttributeSchema | null, attributeValues: Record<string, string>) {
  return schema?.attributes
    .filter(attribute =>
      attribute.appliesTo.includes('variant') &&
      !fixedAttributeKeys.has(attribute.key) &&
      isAttributeVisible(attribute, attributeValues)
    )
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
}

function pruneHiddenAttributeValues(schema: EquipmentAttributeSchema | null, values: Record<string, string>) {
  if (!schema) return values;

  const visibleKeys = new Set(visibleSchemaAttributes(schema, values).map(attribute => attribute.key));
  const next = Object.fromEntries(
    Object.entries(values).filter(([key]) => visibleKeys.has(key))
  );

  return next;
}

function buildAttributes(form: BikeFormState, schema: EquipmentAttributeSchema, attributeValues: Record<string, string>) {
  const values: Record<string, string> = {
    brand: form.brandId,
    brand_id: form.brandId,
    brand_name: textValue(form.brandName),
    model: textValue(form.model),
    ...attributeValues,
  };

  return schema.attributes
    .filter(attribute =>
      attribute.appliesTo.includes('variant') &&
      (fixedAttributeKeys.has(attribute.key) || isAttributeVisible(attribute, attributeValues))
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(attribute => ({ key: attribute.key, value: values[attribute.key] ?? '' }))
    .filter(attribute => attribute.value);
}

export function ResourceForm({
  resource,
  categories,
  onSubmit,
  onCancel,
  submitting = false,
  loadingCategories = false,
}: ResourceFormProps) {
  const isEdit = Boolean(resource);
  const [titleOverride, setTitleOverride] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [schema, setSchema] = useState<EquipmentAttributeSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  const [description, setDescription] = useState(resource?.description || '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [brandSelection, setBrandSelection] = useState<EquipmentBrandSuggestion | null>(null);
  const [variants, setVariants] = useState<DraftVariant[]>(() => [newDraftVariant()]);
  const [activeVariantId, setActiveVariantId] = useState('');
  const submitInFlightRef = useRef(false);
  const [form, setForm] = useState<BikeFormState>({
    brandName: '',
    brandId: '',
    model: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCategory = categories.find(category => category.slug === categorySlug);
  const categoryOptions = categories.map(category => ({ value: category.slug, label: category.label }));
  const previewTitle = selectedCategory
    ? makeResourceTitle(selectedCategory.label, form.brandName, form.model, titleOverride)
    : titleOverride || 'Велосипеды';
  const showGeneratedFields = Boolean(selectedCategory && schema && !schemaLoading);
  const activeVariant = variants.find(variant => variant.id === activeVariantId) ?? variants[0];
  const activeAttributeValues = activeVariant?.attributeValues ?? {};
  const generatedAttributes = useMemo(
    () => visibleSchemaAttributes(schema, activeAttributeValues),
    [activeAttributeValues, schema]
  );

  useEffect(() => {
    if (!activeVariantId && variants[0]) setActiveVariantId(variants[0].id);
  }, [activeVariantId, variants]);

  useEffect(() => {
    if (!resource || categorySlug || categories.length === 0) return;

    const matchingCategory = categories.find(category =>
      category.resourceType === resource.resourceType &&
      category.capacityMode === resource.capacityMode
    );

    if (matchingCategory) setCategorySlug(matchingCategory.slug);
  }, [categories, categorySlug, resource]);

  useEffect(() => {
    if (!resource || titleOverride) return;
    setTitleOverride(resource.title || '');
  }, [resource, titleOverride]);

  useEffect(() => {
    if (!categorySlug) {
      setSchema(null);
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError('');
    setSchema(null);

    equipmentApi.categoryAttributes(categorySlug)
      .then(nextSchema => {
        if (!cancelled) setSchema(nextSchema);
      })
      .catch((err) => {
        if (!cancelled) {
          setSchemaError(err instanceof ApiError
            ? `Не удалось загрузить схему категории: ${err.message}`
            : 'Не удалось загрузить схему категории.');
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  const updateForm = (key: keyof BikeFormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    if (key === 'brandName') {
      setBrandSelection(null);
      setForm(current => ({ ...current, brandName: value, brandId: '' }));
    }
  };

  const updateAttribute = (variantId: string, key: string, value: string) => {
    setVariants(current => current.map(variant => {
      if (variant.id !== variantId) return variant;

      return {
        ...variant,
        attributeValues: pruneHiddenAttributeValues(schema, {
          ...variant.attributeValues,
          [key]: value,
        }),
      };
    }));
    setErrors(current => {
      const next = { ...current };
      delete next[`${variantId}:${key}`];
      return next;
    });
  };

  const addVariant = () => {
    const nextVariant = newDraftVariant();
    setVariants(current => [...current, nextVariant]);
    setActiveVariantId(nextVariant.id);
  };

  const removeVariant = (variantId: string) => {
    setVariants(current => {
      const next = current.filter(variant => variant.id !== variantId);
      if (activeVariantId === variantId) setActiveVariantId(next[0]?.id ?? '');
      return next.length > 0 ? next : [newDraftVariant()];
    });
    setErrors(current => {
      const next = { ...current };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${variantId}:`)) delete next[key];
      });
      return next;
    });
  };

  const chooseCategory = (slug: string) => {
    setCategorySlug(slug);
    const nextVariant = newDraftVariant();
    setVariants([nextVariant]);
    setActiveVariantId(nextVariant.id);
    setErrors(current => {
      const next = { ...current };
      delete next.category;
      delete next.schema;
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!selectedCategory) nextErrors.category = 'Выберите категорию оборудования.';
    if (!isEdit && !textValue(form.brandName)) nextErrors.brandName = 'Укажите бренд.';
    if (!isEdit && !textValue(form.model)) nextErrors.model = 'Укажите модель.';

    if (!isEdit && schema) {
      if (variants.length === 0) {
        nextErrors.variants = 'Добавьте хотя бы одну комплектацию.';
      }

      variants.forEach((variant, index) => {
        visibleSchemaAttributes(schema, variant.attributeValues)
          .filter(attribute => attribute.requiredOn.includes('create'))
          .forEach(attribute => {
            if (!textValue(variant.attributeValues[attribute.key] ?? '')) {
              nextErrors[`${variant.id}:${attribute.key}`] = `Заполните поле в комплектации ${index + 1}.`;
            }
          });
      });
    }

    if (!isEdit && schemaLoading) nextErrors.schema = 'Дождитесь загрузки схемы категории.';
    if (!isEdit && selectedCategory && !schema && !schemaLoading) {
      nextErrors.schema = schemaError || 'Не удалось загрузить поля комплектации.';
    }

    return nextErrors;
  };

  const resolveBrand = async () => {
    const brandName = textValue(form.brandName);
    if (!brandName || isEdit) return { brandId: form.brandId, brandName };

    if (brandSelection && brandSelection.canonicalName.toLowerCase() === brandName.toLowerCase()) {
      return { brandId: brandSelection.brandId, brandName: brandSelection.canonicalName };
    }

    if (form.brandId) return { brandId: form.brandId, brandName };

    const result = await equipmentApi.createBrand({
      name: brandName,
      category: selectedCategory?.slug ?? null,
    });

    return {
      brandId: result.brand.brandId,
      brandName: result.brand.canonicalName || brandName,
    };
  };

  const handleSubmit = async () => {
    if (submitting || submitInFlightRef.current) return;
    submitInFlightRef.current = true;

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      submitInFlightRef.current = false;
      return;
    }
    if (!selectedCategory) {
      submitInFlightRef.current = false;
      return;
    }

    try {
      const resolvedBrand = await resolveBrand();
      const nextForm = {
        ...form,
        brandName: resolvedBrand.brandName,
        brandId: resolvedBrand.brandId,
      };
      if (!isEdit && !schema) return;
      const title = makeResourceTitle(selectedCategory.label, nextForm.brandName, nextForm.model, titleOverride);
      const nextVariants = variants.map((variant, index) => {
        const variantLabel = makeVariantLabel(nextForm, variant.attributeValues) || `Комплектация ${index + 1}`;

        return {
          variantKey: makeKey([
            nextForm.brandName,
            nextForm.model,
            variant.attributeValues.frame_size,
            variant.attributeValues.wheel_size_in,
            String(index + 1),
          ]),
          label: variantLabel,
          normalizedAttributes: buildAttributes(nextForm, schema, variant.attributeValues),
          status: 'active',
        };
      });

      await onSubmit({
        title,
        categorySlug: selectedCategory.slug,
        resourceType: selectedCategory.resourceType,
        capacityMode: selectedCategory.capacityMode,
        categoryName: selectedCategory.label,
        description,
        imageFiles: isEdit ? undefined : imageFiles,
        status: 'draft',
        variant: isEdit ? undefined : nextVariants[0],
        variants: isEdit ? undefined : nextVariants,
      });
    } finally {
      submitInFlightRef.current = false;
    }
  };

  return (
    <div className="max-w-5xl space-y-3">
      <Card className="p-3">
        <CardHeader title="Категория" className="mb-3" />
        <div className="grid gap-3 md:grid-cols-2">
          <FancySelect
            label="Категория"
            options={categoryOptions}
            value={categorySlug}
            onChange={chooseCategory}
            error={errors.category}
            disabled={loadingCategories || categories.length === 0}
          />
          <Input
            label="Название в каталоге (если нужно переопределить)"
            value={titleOverride}
            onChange={event => setTitleOverride(event.target.value)}
            placeholder={previewTitle}
          />
        </div>
        <CategorySchemaPanel
          loading={schemaLoading}
          error={errors.schema || schemaError}
        />
      </Card>

      {showGeneratedFields && (
        <>
          <Card className="p-3">
            <CardHeader title="Основное" className="mb-3" />
            <div className="grid gap-3 md:grid-cols-2">
              <BrandCombobox
                label="Бренд"
                value={form.brandName}
                categorySlug={selectedCategory?.slug}
                selectedBrand={brandSelection}
                error={errors.brandName}
                onChange={value => updateForm('brandName', value)}
                onSelect={brand => {
                  setBrandSelection(brand);
                  setForm(current => ({ ...current, brandName: brand.canonicalName, brandId: brand.brandId }));
                  setErrors(current => {
                    const next = { ...current };
                    delete next.brandName;
                    return next;
                  });
                }}
              />
              <Input
                label="Модель"
                value={form.model}
                onChange={event => updateForm('model', event.target.value)}
                error={errors.model}
                placeholder="Max"
              />
            </div>
          </Card>

          <Card className="p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <CardHeader title="Комплектации" />
              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1f2d3d] transition hover:bg-[#f8fafc]"
              >
                <Plus size={14} />
                Добавить
              </button>
            </div>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {variants.map((variant, index) => {
                const active = variant.id === activeVariant?.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveVariantId(variant.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${
                      active
                        ? 'border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]'
                        : 'border-[#d7e0ea] bg-white text-[#5c6b7c] hover:bg-[#f8fafc]'
                    }`}
                  >
                    Комплектация {index + 1}
                    {variants.length > 1 && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={event => {
                          event.stopPropagation();
                          removeVariant(variant.id);
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            removeVariant(variant.id);
                          }
                        }}
                        className="rounded p-0.5 hover:bg-white/70"
                      >
                        <X size={13} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.variants && <p className="mb-2 text-xs text-red-600">{errors.variants}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {generatedAttributes.map(attribute => (
                <AttributeField
                  key={attribute.key}
                  attribute={attribute}
                  value={activeAttributeValues[attribute.key] ?? ''}
                  error={activeVariant ? errors[`${activeVariant.id}:${attribute.key}`] : undefined}
                  onChange={value => activeVariant && updateAttribute(activeVariant.id, attribute.key, value)}
                />
              ))}
            </div>
          </Card>

          <Card className="p-3">
            <CardHeader title="Наличие" className="mb-3" />
            <Textarea
              label="Описание (необязательно)"
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={2}
              placeholder="Короткое описание состояния, комплекта или особенностей."
            />
          </Card>

          {isEdit && resource?.resourceId ? (
            <ResourceImagesSection resourceId={resource.resourceId} compact />
          ) : (
            <ResourceImageDraftSection files={imageFiles} onChange={setImageFiles} disabled={submitting} />
          )}
        </>
      )}

      <div className="flex gap-2">
        {showGeneratedFields && (
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Сохранить изменения' : 'Добавить велосипед'}
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}

function BrandCombobox({
  label,
  value,
  categorySlug,
  selectedBrand,
  error,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  categorySlug?: string;
  selectedBrand: EquipmentBrandSuggestion | null;
  error?: string;
  onChange: (value: string) => void;
  onSelect: (brand: EquipmentBrandSuggestion) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<EquipmentBrandSuggestion[]>([]);
  const [suggestError, setSuggestError] = useState('');
  const query = textValue(value);

  useEffect(() => {
    if (!open || query.length < 2) {
      setSuggestions([]);
      setSuggestError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSuggestError('');

    const timer = window.setTimeout(() => {
      equipmentApi.brandSuggestions(query, categorySlug)
        .then(result => {
          if (!cancelled) setSuggestions(result.items);
        })
        .catch(err => {
          if (!cancelled) {
            setSuggestions([]);
            setSuggestError(err instanceof ApiError ? err.message : 'Не удалось загрузить бренды.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [categorySlug, open, query]);

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

  const exactMatch = suggestions.some(item => item.canonicalName.toLowerCase() === query.toLowerCase());
  const canCreate = query.length >= 2 && !exactMatch;

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={event => {
            onChange(event.target.value);
            setOpen(true);
          }}
          placeholder="Луна"
          className={`w-full rounded-md border bg-white px-9 py-2 text-sm text-gray-900 outline-none transition focus:border-[#86b7fe] focus:ring-2 focus:ring-[#9ec5fe] ${error ? 'border-[#dc3545]' : 'border-[#cbd5e1]'}`}
        />
      </div>
      {selectedBrand && selectedBrand.canonicalName === value && (
        <p className="mt-1 text-xs text-emerald-700">Выбран бренд из справочника.</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && query.length >= 2 && (
        <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border border-[#d7e0ea] bg-white py-1 shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-500">Ищем бренды...</div>}
          {suggestError && <div className="px-3 py-2 text-xs text-red-600">{suggestError}</div>}
          {!loading && suggestions.map(brand => (
            <button
              key={brand.brandId}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                onSelect(brand);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50"
            >
              <span className="truncate font-medium text-gray-900">{brand.canonicalName}</span>
              <span className="text-[11px] text-gray-500">{Math.round(brand.confidence * 100)}%</span>
            </button>
          ))}
          {!loading && canCreate && (
            <button
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-blue-800 transition-colors hover:bg-blue-50"
            >
              <Check size={14} /> Создать бренд "{query}" при сохранении
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FancySelect({
  label,
  value,
  options,
  error,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find(option => option.value === value);
  const filtered = options.filter(option => option.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className={`flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#9ec5fe] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] ${
          error ? 'border-[#dc3545]' : open ? 'border-[#86b7fe]' : 'border-[#cbd5e1]'
        } ${selected?.value ? 'text-[#1f2d3d]' : 'text-[#8a97a8]'}`}
      >
        <span className="truncate">{selected?.label ?? 'Выберите значение'}</span>
        <ChevronDown size={15} className={`ml-2 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-hidden rounded-md border border-[#d7e0ea] bg-white shadow-lg">
          {options.length > 7 && (
            <div className="border-b border-gray-100 p-2">
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                autoFocus
                placeholder="Поиск..."
                className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.map(option => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
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
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AttributeField({
  attribute,
  value,
  error,
  onChange,
}: {
  attribute: EquipmentAttribute;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const label = attribute.unitLabel
    ? `${attribute.label}, ${attribute.unitLabel}`
    : attribute.unit
      ? `${attribute.label}, ${attribute.unit}`
      : attribute.label;

  if (attribute.allowedValues.length > 0) {
    return (
      <FancySelect
        label={label}
        value={value}
        onChange={onChange}
        options={optionsForField(attribute)}
        error={error}
      />
    );
  }

  return (
    <Input
      label={label}
      type={attribute.valueType === 'integer' || attribute.valueType === 'decimal' ? 'number' : 'text'}
      value={value}
      onChange={event => onChange(event.target.value)}
      error={error}
    />
  );
}

function CategorySchemaPanel({
  loading,
  error,
}: {
  loading: boolean;
  error: string;
}) {
  if (!loading && !error) {
    return null;
  }

  return (
    <div className="mt-2 text-xs">
      {loading && <p className="text-[#5c6b7c]">Загружаем поля комплектации...</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
