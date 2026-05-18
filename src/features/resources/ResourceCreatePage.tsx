import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { ResourceForm, type ResourceFormData } from './ResourceForm';
import { ApiError, equipmentApi, resourcesApi, variantsApi, type EquipmentCategory } from '../../lib/api-client';

interface ResourceCreatePageProps {
  onNavigate: (path: string) => void;
}

export function ResourceCreatePage({ onNavigate }: ResourceCreatePageProps) {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categoriesError, setCategoriesError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesError('');
      setCategoriesLoading(true);
      try {
        const nextCategories = await equipmentApi.categories();
        if (!cancelled) {
          setCategories(
            nextCategories
              .filter(category => category.status === 'active')
              .sort((a, b) => a.sortOrder - b.sortOrder)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCategories([]);
          setCategoriesError(err instanceof ApiError
            ? `Не удалось загрузить категории оборудования из API: ${err.message}`
            : 'Не удалось загрузить категории оборудования из API.');
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (data: ResourceFormData) => {
    setError('');
    setSaving(true);
    try {
      const newResource = await resourcesApi.create({
        resourceType: data.resourceType,
        capacityMode: data.capacityMode,
        title: data.title,
      });

      const variants = data.variants ?? (data.variant ? [data.variant] : []);
      await Promise.all(variants.map((variant, index) =>
        variantsApi.create(newResource.resourceId, {
          ...variant,
          normalizedAttributes: variant.normalizedAttributes,
          sortOrder: index + 1,
        })
      ));

      onNavigate('/resources');
    } catch (err) {
      setError(err instanceof ApiError
        ? `Не удалось создать ресурс в API: ${err.message}`
        : err instanceof Error
          ? err.message
          : 'Не удалось создать ресурс в API.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <ResourceCreateBreadcrumb onBack={() => onNavigate('/resources')} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {error && <ResourceCreateError message={error} />}
          {categoriesError && <ResourceCreateError message={categoriesError} />}
          <ResourceForm
            categories={categories}
            loadingCategories={categoriesLoading}
            onSubmit={handleCreate}
            onCancel={() => onNavigate('/resources')}
            submitting={saving}
          />
        </div>
      </div>
    </div>
  );
}

function ResourceCreateBreadcrumb({ onBack }: { onBack: () => void }) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-gray-600 transition-colors hover:text-gray-950"
        >
          Ресурсы
        </button>
        <ChevronRight size={14} className="shrink-0 text-gray-400" />
        <span className="truncate font-semibold text-gray-950">Создание</span>
      </div>
    </div>
  );
}

function ResourceCreateError({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <AlertTriangle size={14} className="shrink-0 text-red-600" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}
