import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import type { Resource } from '../../types';
import {
  ApiError,
  equipmentApi,
  type EquipmentAttribute,
  type EquipmentAttributeSchema,
  type EquipmentCategory,
} from '../../lib/api-client';

type FieldValues = Record<string, string>;
type CreateStep = 'category' | 'details';

export type ResourceFormData = {
  title: string;
  baseCapacity: number;
  categorySlug: string;
  resourceType: string;
  capacityMode: string;
  categoryName?: string;
  description?: string;
  imageUrl?: string;
  status?: Resource['status'];
  variant?: {
    variantKey: string;
    variantType: string;
    label: string;
    normalizedAttributes: Array<{ key: string; value: string }>;
    status: string;
  };
};

interface ResourceFormProps {
  resource?: Resource;
  categories: EquipmentCategory[];
  onSubmit: (data: ResourceFormData) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  loadingCategories?: boolean;
}

function isRequired(field: EquipmentAttribute, scope: 'variant') {
  return field.requiredOn.includes(scope);
}

function isVisible(field: EquipmentAttribute, values: FieldValues) {
  if (field.visibleWhen.length === 0) return true;

  return field.visibleWhen.every(condition => {
    const value = values[condition.attributeKey];
    return Boolean(value && condition.allowedValueKeys.includes(value));
  });
}

function fieldsForScope(attributes: EquipmentAttribute[], values: FieldValues) {
  return attributes
    .filter(attribute => attribute.appliesTo.includes('variant'))
    .filter(attribute => isVisible(attribute, values))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function makeVariantKey(values: FieldValues) {
  return ['brand_name', 'brand', 'model', 'frame_size', 'wheel_size_in']
    .map(key => values[key])
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

function makeVariantLabel(values: FieldValues) {
  return ['brand_name', 'brand', 'model', 'frame_size', 'wheel_size_in']
    .map(key => values[key])
    .filter(Boolean)
    .join(' / ');
}

function inputTypeFor(field: EquipmentAttribute) {
  if (field.valueType === 'integer' || field.valueType === 'decimal') return 'number';
  return 'text';
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
  const [createStep, setCreateStep] = useState<CreateStep>(isEdit ? 'details' : 'category');
  const [title, setTitle] = useState(resource?.title || '');
  const [categorySlug, setCategorySlug] = useState('');
  const [schema, setSchema] = useState<EquipmentAttributeSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  const [baseCapacity, setBaseCapacity] = useState(String(resource?.baseCapacity || 1));
  const [description, setDescription] = useState(resource?.description || '');
  const [imageUrl, setImageUrl] = useState(resource?.imageUrl || '');
  const [variantKey, setVariantKey] = useState('');
  const [variantType, setVariantType] = useState('equipment_configuration');
  const [variantLabel, setVariantLabel] = useState('');
  const [variantStatus, setVariantStatus] = useState('active');
  const [variantValues, setVariantValues] = useState<FieldValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCategory = categories.find(category => category.slug === categorySlug);
  const categoryOptions = categories.map(category => ({ value: category.slug, label: category.label }));
  const variantFields = useMemo(
    () => fieldsForScope(schema?.attributes ?? [], variantValues),
    [schema, variantValues]
  );

  useEffect(() => {
    if (!resource || categorySlug || categories.length === 0) return;

    const matchingCategory = categories.find(category =>
      category.resourceType === resource.resourceType &&
      category.capacityMode === resource.capacityMode
    );

    setCategorySlug((matchingCategory ?? categories[0]).slug);
  }, [categories, categorySlug, resource]);

  useEffect(() => {
    if (!categorySlug) {
      setSchema(null);
      setVariantValues({});
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError('');
    setSchema(null);
    setVariantValues({});

    equipmentApi.categoryAttributes(categorySlug)
      .then(nextSchema => {
        if (!cancelled) setSchema(nextSchema);
      })
      .catch((err) => {
        if (!cancelled) {
          setSchemaError(err instanceof ApiError
            ? `Could not load category schema: ${err.message}`
            : 'Could not load category schema.');
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  useEffect(() => {
    if (variantKey || isEdit) return;
    const nextKey = makeVariantKey(variantValues);
    if (nextKey) setVariantKey(nextKey);
  }, [isEdit, variantKey, variantValues]);

  useEffect(() => {
    if (variantLabel || isEdit) return;
    const nextLabel = makeVariantLabel(variantValues);
    if (nextLabel) setVariantLabel(nextLabel);
  }, [isEdit, variantLabel, variantValues]);

  const updateVariantValue = (key: string, value: string) => {
    setVariantValues(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[`variant.${key}`];
      return next;
    });
  };

  const chooseCategory = (slug: string) => {
    setCategorySlug(slug);
    setErrors(current => {
      const next = { ...current };
      delete next.category;
      return next;
    });
  };

  const continueFromCategory = () => {
    if (!selectedCategory) {
      setErrors(current => ({ ...current, category: 'Choose an equipment category.' }));
      return;
    }
    setCreateStep('details');
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Title is required.';
    if (!selectedCategory) nextErrors.category = 'Choose an equipment category.';
    const capacity = Number(baseCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      nextErrors.baseCapacity = 'Base capacity must be a whole number greater than zero.';
    }

    if (!isEdit) {
      if (schemaLoading) nextErrors.schema = 'Wait for category schema to load.';
      if (schemaError) nextErrors.schema = schemaError;
      if (!schema && !schemaLoading) nextErrors.schema = 'Category schema is required.';
      if (!variantKey.trim()) nextErrors.variantKey = 'Variant key is required.';
      if (!variantType.trim()) nextErrors.variantType = 'Variant type is required.';
      if (!variantLabel.trim()) nextErrors.variantLabel = 'Variant label is required.';
      variantFields.forEach(field => {
        if (isRequired(field, 'variant') && !variantValues[field.key]?.trim()) {
          nextErrors[`variant.${field.key}`] = 'Required.';
        }
      });
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!selectedCategory) return;

    const normalizedAttributes = variantFields
      .map(field => ({ key: field.key, value: variantValues[field.key]?.trim() ?? '' }))
      .filter(attribute => attribute.value);

    await onSubmit({
      title,
      baseCapacity: Number(baseCapacity),
      categorySlug: selectedCategory.slug,
      resourceType: selectedCategory.resourceType,
      capacityMode: selectedCategory.capacityMode,
      categoryName: selectedCategory.label,
      description,
      imageUrl: imageUrl || undefined,
      status: 'draft',
      variant: isEdit ? undefined : {
        variantKey: variantKey.trim(),
        variantType: variantType.trim(),
        label: variantLabel.trim(),
        normalizedAttributes,
        status: variantStatus,
      },
    });
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Edit Resource' : 'Create Resource'}</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {isEdit ? 'Update catalog basics.' : createStep === 'category' ? 'Choose the resource category first.' : 'Create the resource and its first catalog variant.'}
        </p>
      </div>

      {!isEdit && createStep === 'category' && (
        <>
          <Card>
            <CardHeader title="Choose Category" subtitle="The selected category determines which variant fields are shown next." />
            <div className="mb-4 max-w-md">
              <FancySelect
                label="Category"
                options={categoryOptions}
                value={categorySlug}
                onChange={chooseCategory}
                error={errors.category}
                disabled={loadingCategories || categories.length === 0}
              />
            </div>

            {loadingCategories ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
                <p className="text-xs font-medium text-blue-800">Loading live categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-medium text-amber-900">No equipment categories returned by the API.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map(category => {
                  const selected = category.slug === categorySlug;

                  return (
                    <button
                      key={category.categoryId}
                      type="button"
                      onClick={() => chooseCategory(category.slug)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        selected
                          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-950">{category.label}</p>
                          <p className="mt-1 text-xs text-gray-500">{category.resourceType} / {category.capacityMode}</p>
                        </div>
                        {selected && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                            <Check size={13} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex gap-2">
            <Button variant="primary" onClick={continueFromCategory} disabled={loadingCategories || categories.length === 0}>
              Continue
            </Button>
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}

      {(isEdit || createStep === 'details') && (
      <>
        {!isEdit && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-blue-900">
                Category: {selectedCategory?.label ?? 'Not selected'}
              </p>
              <Button size="sm" variant="ghost" onClick={() => setCreateStep('category')}>
                Change
              </Button>
            </div>
          </div>
        )}

        <Card>
        <CardHeader title="Resource" subtitle="Category defines which variant schema is loaded." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            error={errors.title}
            placeholder="Велосипеды"
          />
          <FancySelect
            label="Category"
            options={categoryOptions}
            value={categorySlug}
            onChange={chooseCategory}
            error={errors.category}
            disabled={!isEdit || loadingCategories || categories.length === 0}
          />
          <Input
            label="Base capacity"
            type="number"
            min={1}
            value={baseCapacity}
            onChange={event => setBaseCapacity(event.target.value)}
            error={errors.baseCapacity}
            placeholder="10"
          />
        </div>
        <CategorySchemaPanel
          loading={schemaLoading}
          error={errors.schema || schemaError}
          category={selectedCategory}
          variantCount={variantFields.length}
        />
        <div className="mt-4">
          <Textarea
            label="Description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            rows={3}
            placeholder="Describe the resource..."
          />
        </div>
        <div className="mt-4">
          <Input
            label="Image URL"
            value={imageUrl}
            onChange={event => setImageUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>
        </Card>

        {!isEdit && (
        <>
          <Card>
            <CardHeader title="Variant" subtitle="Fields come from the selected category schema." />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Variant key"
                value={variantKey}
                onChange={event => setVariantKey(event.target.value)}
                error={errors.variantKey}
                placeholder="TREK-MARLIN-6-M-29"
              />
              <Input
                label="Variant type"
                value={variantType}
                onChange={event => setVariantType(event.target.value)}
                error={errors.variantType}
                placeholder="equipment_configuration"
              />
              <Input
                label="Label"
                value={variantLabel}
                onChange={event => setVariantLabel(event.target.value)}
                error={errors.variantLabel}
                placeholder="Trek Marlin 6 / M / 29&quot;"
              />
              <FancySelect
                label="Status"
                value={variantStatus}
                onChange={setVariantStatus}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              {variantFields.map(field => (
                <SchemaField
                  key={field.attributeId}
                  field={field}
                  value={variantValues[field.key] ?? ''}
                  error={errors[`variant.${field.key}`]}
                  onChange={value => updateVariantValue(field.key, value)}
                />
              ))}
            </div>
          </Card>
        </>
        )}

        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Save Changes' : 'Create Resource'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </>
      )}
    </div>
  );
}

function SchemaField({
  field,
  value,
  error,
  onChange,
}: {
  field: EquipmentAttribute;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const label = `${field.label}${isRequired(field, 'variant') ? ' *' : ''}`;

  if (field.allowedValues.length > 0) {
    return (
      <FancySelect
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        options={[
          { value: '', label: 'Choose value' },
          ...field.allowedValues
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(option => ({ value: option.valueKey, label: option.label })),
        ]}
      />
    );
  }

  if (field.valueType === 'boolean') {
    return (
      <FancySelect
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        options={[
          { value: '', label: 'Choose value' },
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]}
      />
    );
  }

  return (
    <Input
      label={label}
      type={inputTypeFor(field)}
      value={value}
      onChange={event => onChange(event.target.value)}
      error={error}
      placeholder={field.unitLabel ?? field.unit ?? undefined}
    />
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
        <span className="truncate">{selected?.label ?? 'Choose value'}</span>
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
                placeholder="Search..."
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

function CategorySchemaPanel({
  loading,
  error,
  category,
  variantCount,
}: {
  loading: boolean;
  error: string;
  category?: EquipmentCategory;
  variantCount: number;
}) {
  if (!category) {
    return (
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
        <p className="text-xs font-medium text-amber-900">No live equipment categories loaded.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
      <p className="text-xs font-medium text-blue-900">
        {category.label} · {category.resourceType} / {category.capacityMode}
      </p>
      {loading && <p className="mt-1 text-xs text-blue-800">Loading category schema...</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      {!loading && !error && (
        <p className="mt-1 text-xs leading-5 text-blue-800">
          {variantCount > 0
            ? `${variantCount} variant field${variantCount === 1 ? '' : 's'} available for this category.`
            : 'This category does not expose variant fields yet.'}
        </p>
      )}
    </div>
  );
}
