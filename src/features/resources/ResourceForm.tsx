import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import type { Resource } from '../../types';
import { ApiError, equipmentApi, type EquipmentAttributeSchema, type EquipmentCategory } from '../../lib/api-client';

type CreateMode = 'quick' | 'guided';

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
  variantCount?: number;
};

interface ResourceFormProps {
  resource?: Resource;
  categories: EquipmentCategory[];
  onSubmit: (data: ResourceFormData) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  loadingCategories?: boolean;
}

const guidedSteps = [
  { id: 'basics', label: 'Basics' },
  { id: 'variants', label: 'Variants' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'availability', label: 'Availability' },
  { id: 'media', label: 'Media' },
] as const;

export function ResourceForm({
  resource,
  categories,
  onSubmit,
  onCancel,
  submitting = false,
  loadingCategories = false,
}: ResourceFormProps) {
  const isEdit = Boolean(resource);
  const [mode, setMode] = useState<CreateMode>('quick');
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState(resource?.title || '');
  const [categorySlug, setCategorySlug] = useState('');
  const [schema, setSchema] = useState<EquipmentAttributeSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  const [baseCapacity, setBaseCapacity] = useState(String(resource?.baseCapacity || 1));
  const [description, setDescription] = useState(resource?.description || '');
  const [variantPlan, setVariantPlan] = useState(resource?.variantCount ? String(resource.variantCount) : '1');
  const [basePrice, setBasePrice] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [imageUrl, setImageUrl] = useState(resource?.imageUrl || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / guidedSteps.length) * 100),
    [stepIndex]
  );
  const selectedCategory = categories.find(category => category.slug === categorySlug);
  const categoryOptions = categories.map(category => ({ value: category.slug, label: category.label }));
  const variantAttributes = schema?.attributes
    .filter(attribute => attribute.appliesTo.includes('variant'))
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

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
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError('');

    equipmentApi.categoryAttributes(categorySlug)
      .then(nextSchema => {
        if (!cancelled) setSchema(nextSchema);
      })
      .catch((err) => {
        if (!cancelled) {
          setSchema(null);
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

  const validateBasics = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Title is required.';
    if (!selectedCategory) nextErrors.category = 'Choose an equipment category.';
    const capacity = Number(baseCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      nextErrors.baseCapacity = 'Base capacity must be a whole number greater than zero.';
    }
    return nextErrors;
  };

  const validateCurrentStep = () => {
    const step = guidedSteps[stepIndex]?.id;
    const nextErrors: Record<string, string> = {};

    if (step === 'basics') {
      Object.assign(nextErrors, validateBasics());
    }
    if (step === 'pricing' && !basePrice.trim()) {
      nextErrors.basePrice = 'Add a starting price.';
    }
    if (step === 'media' && !imageUrl.trim()) {
      nextErrors.imageUrl = 'Add a preview image URL or use quick create instead.';
    }

    return nextErrors;
  };

  const handleQuickCreate = async () => {
    const nextErrors = validateBasics();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!selectedCategory) return;

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
    });
  };

  const handleGuidedNext = async () => {
    const nextErrors = validateCurrentStep();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    if (stepIndex === guidedSteps.length - 1) {
      if (!selectedCategory) return;

      await onSubmit({
        title,
        baseCapacity: Number(baseCapacity),
        categorySlug: selectedCategory.slug,
        resourceType: selectedCategory.resourceType,
        capacityMode: selectedCategory.capacityMode,
        categoryName: selectedCategory.label,
        description,
        imageUrl: imageUrl || undefined,
        variantCount: Number(variantPlan) || 0,
        status: 'draft',
      });
      return;
    }

    setStepIndex(prev => prev + 1);
  };

  const currentStep = guidedSteps[stepIndex]?.id;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Edit Resource' : 'Create Resource'}</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {isEdit ? 'Update catalog details, readiness, and selling inputs.' : 'Choose a fast draft flow or complete guided listing setup.'}
          </p>
        </div>

        {!isEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode('quick')}
              className={`border px-3 py-2 text-xs font-medium transition ${
                mode === 'quick' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              Quick Create
            </button>
            <button
              onClick={() => setMode('guided')}
              className={`border px-3 py-2 text-xs font-medium transition ${
                mode === 'guided' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              Guided Setup
            </button>
          </div>
        )}
      </div>

      {!isEdit && mode === 'guided' && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-900">Setup progress</p>
              <p className="text-[11px] text-gray-500">{progress}% complete</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {guidedSteps.map((step, index) => (
                <span
                  key={step.id}
                  className={`border px-2.5 py-1 text-[11px] ${
                    index === stepIndex
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : index < stepIndex
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {(isEdit || mode === 'quick') && (
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Title"
              value={title}
              onChange={event => setTitle(event.target.value)}
              error={errors.title}
              placeholder="e.g. Trek X-Caliber 8"
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
            error={schemaError}
            category={selectedCategory}
            variantAttributes={variantAttributes}
          />
          <div className="mt-4">
            <Textarea
              label="Description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={4}
              placeholder="Describe the resource, intended use, and key selling points..."
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
      )}

      {!isEdit && mode === 'guided' && (
        <Card>
          {currentStep === 'basics' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Title"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  error={errors.title}
                  placeholder="e.g. Trek X-Caliber 8"
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
                error={schemaError}
                category={selectedCategory}
                variantAttributes={variantAttributes}
              />
              <Textarea
                label="Description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={4}
                placeholder="Explain how providers should present this listing to renters."
              />
            </div>
          )}

          {currentStep === 'variants' && (
            <div className="space-y-4">
              <Input
                label="Planned variant count"
                type="number"
                value={variantPlan}
                onChange={event => setVariantPlan(event.target.value)}
                placeholder="e.g. 3"
              />
              <p className="text-xs text-gray-500">
                This creates a draft planning baseline for sizes, bundles, or equipment conditions.
              </p>
            </div>
          )}

          {currentStep === 'pricing' && (
            <div className="space-y-4">
              <Input
                label="Starting price"
                type="number"
                value={basePrice}
                onChange={event => setBasePrice(event.target.value)}
                error={errors.basePrice}
                placeholder="e.g. 3200"
              />
              <p className="text-xs text-gray-500">
                Guided setup uses a starter price placeholder so the listing is commercially ready faster.
              </p>
            </div>
          )}

          {currentStep === 'availability' && (
            <div className="space-y-4">
              <Textarea
                label="Availability notes"
                value={availabilityNotes}
                onChange={event => setAvailabilityNotes(event.target.value)}
                rows={4}
                placeholder="Example: 10 units total, weekends blocked for service, same-day pickup disabled."
              />
            </div>
          )}

          {currentStep === 'media' && (
            <div className="space-y-4">
              <Input
                label="Primary image URL"
                value={imageUrl}
                onChange={event => setImageUrl(event.target.value)}
                error={errors.imageUrl}
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500">
                Listings with strong imagery convert better and avoid “missing images” health issues.
              </p>
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-2">
        {isEdit || mode === 'quick' ? (
          <Button variant="primary" onClick={handleQuickCreate} loading={submitting}>
            {isEdit ? 'Save Changes' : 'Create Draft'}
          </Button>
        ) : (
          <>
            <Button variant="primary" onClick={handleGuidedNext} loading={submitting}>
              {stepIndex === guidedSteps.length - 1 ? 'Finish Setup' : 'Next Step'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStepIndex(prev => Math.max(0, prev - 1))}
              disabled={stepIndex === 0}
            >
              Previous
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function CategorySchemaPanel({
  loading,
  error,
  category,
  variantAttributes,
}: {
  loading: boolean;
  error: string;
  category?: EquipmentCategory;
  variantAttributes: EquipmentAttributeSchema['attributes'];
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
          {variantAttributes.length > 0
            ? `Variant setup will use ${variantAttributes.length} schema field${variantAttributes.length === 1 ? '' : 's'}: ${variantAttributes.slice(0, 4).map(attribute => attribute.label).join(', ')}${variantAttributes.length > 4 ? '...' : ''}.`
            : 'This category does not expose variant schema fields yet.'}
        </p>
      )}
    </div>
  );
}
