import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import type { Resource } from '../../types';
import {
  ApiError,
  equipmentApi,
  type EquipmentAttribute,
  type EquipmentAttributeSchema,
  type EquipmentCategory,
} from '../../lib/api-client';

type FieldValues = Record<string, string>;

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
  unit?: {
    inventoryCode: string;
    displayName: string;
    status: string;
    conditionStatus: string;
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

const unitStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const conditionStatusOptions = [
  { value: 'ready', label: 'Ready' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'damaged', label: 'Damaged' },
];

function isRequired(field: EquipmentAttribute, scope: 'variant' | 'unit') {
  return field.requiredOn.includes(scope);
}

function isVisible(field: EquipmentAttribute, values: FieldValues) {
  if (field.visibleWhen.length === 0) return true;

  return field.visibleWhen.every(condition => {
    const value = values[condition.attributeKey];
    return Boolean(value && condition.allowedValueKeys.includes(value));
  });
}

function fieldsForScope(
  attributes: EquipmentAttribute[],
  scope: 'variant' | 'unit',
  values: FieldValues
) {
  return attributes
    .filter(attribute => attribute.appliesTo.includes(scope))
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
  const [inventoryCode, setInventoryCode] = useState('');
  const [unitDisplayName, setUnitDisplayName] = useState('');
  const [unitStatus, setUnitStatus] = useState('active');
  const [conditionStatus, setConditionStatus] = useState('ready');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCategory = categories.find(category => category.slug === categorySlug);
  const categoryOptions = categories.map(category => ({ value: category.slug, label: category.label }));
  const variantFields = useMemo(
    () => fieldsForScope(schema?.attributes ?? [], 'variant', variantValues),
    [schema, variantValues]
  );
  const unitFields = useMemo(
    () => fieldsForScope(schema?.attributes ?? [], 'unit', {}),
    [schema]
  );

  useEffect(() => {
    if (categorySlug || categories.length === 0) return;

    const matchingCategory = resource
      ? categories.find(category =>
          category.resourceType === resource.resourceType &&
          category.capacityMode === resource.capacityMode
        )
      : undefined;

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

  useEffect(() => {
    if (unitDisplayName || !variantLabel) return;
    setUnitDisplayName(`${variantLabel} #001`);
  }, [unitDisplayName, variantLabel]);

  useEffect(() => {
    if (inventoryCode || !variantKey) return;
    setInventoryCode(`${variantKey}-001`);
  }, [inventoryCode, variantKey]);

  const updateVariantValue = (key: string, value: string) => {
    setVariantValues(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[`variant.${key}`];
      return next;
    });
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
      if (!inventoryCode.trim()) nextErrors.inventoryCode = 'Inventory code is required.';
      if (!unitDisplayName.trim()) nextErrors.unitDisplayName = 'Display name is required.';
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
      unit: isEdit ? undefined : {
        inventoryCode: inventoryCode.trim(),
        displayName: unitDisplayName.trim(),
        status: unitStatus,
        conditionStatus,
      },
    });
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Edit Resource' : 'Create Resource'}</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {isEdit ? 'Update catalog basics.' : 'Create the resource, one variant, and the first physical unit.'}
        </p>
      </div>

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
          <Select
            label="Category"
            options={categoryOptions}
            value={categorySlug}
            onChange={event => setCategorySlug(event.target.value)}
            error={errors.category}
            disabled={loadingCategories || categories.length === 0}
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
          unitCount={unitFields.length}
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
              <Select
                label="Status"
                value={variantStatus}
                onChange={event => setVariantStatus(event.target.value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              {variantFields.map(field => (
                <SchemaField
                  key={field.attributeId}
                  field={field}
                  scope="variant"
                  value={variantValues[field.key] ?? ''}
                  error={errors[`variant.${field.key}`]}
                  onChange={value => updateVariantValue(field.key, value)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Physical Unit" subtitle="Create the first inventory unit for this variant." />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Inventory code"
                value={inventoryCode}
                onChange={event => setInventoryCode(event.target.value)}
                error={errors.inventoryCode}
                placeholder="BIKE-001"
              />
              <Input
                label="Display name"
                value={unitDisplayName}
                onChange={event => setUnitDisplayName(event.target.value)}
                error={errors.unitDisplayName}
                placeholder="Trek Marlin 6 M #001"
              />
              <Select
                label="Status"
                value={unitStatus}
                onChange={event => setUnitStatus(event.target.value)}
                options={unitStatusOptions}
              />
              <Select
                label="Condition"
                value={conditionStatus}
                onChange={event => setConditionStatus(event.target.value)}
                options={conditionStatusOptions}
              />
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
    </div>
  );
}

function SchemaField({
  field,
  scope,
  value,
  error,
  onChange,
}: {
  field: EquipmentAttribute;
  scope: 'variant' | 'unit';
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const label = `${field.label}${isRequired(field, scope) ? ' *' : ''}`;

  if (field.allowedValues.length > 0) {
    return (
      <Select
        label={label}
        value={value}
        onChange={event => onChange(event.target.value)}
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
      <Select
        label={label}
        value={value}
        onChange={event => onChange(event.target.value)}
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
  unitCount: number;
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
