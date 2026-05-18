import { useEffect, useState } from 'react';
import { ArrowRight, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ApiError, resourcesApi } from '../../lib/api-client';
import type { Resource } from '../../types';

interface PricingPageProps {
  onNavigate?: (path: string) => void;
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    resourcesApi.list()
      .then(nextResources => {
        if (!cancelled) setResources(nextResources);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? `Не удалось загрузить каталог: ${err.message}` : 'Не удалось загрузить каталог.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Цены</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Базовая цена настраивается в карточке позиции каталога. Для велосипедов это обычно цена за час.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        <Card>
          <CardHeader
            title="Где настраивать цену"
            subtitle="Откройте позицию каталога и перейдите во вкладку “Цены”. Эта настройка закрывает предупреждение перед публикацией предложения."
          />
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Загружаем каталог...</div>
          ) : resources.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 px-3 py-10 text-center">
              <p className="text-sm font-medium text-gray-900">Позиции пока не созданы.</p>
              <Button className="mt-4" size="sm" variant="primary" onClick={() => onNavigate?.('/resources/create')}>
                Добавить позицию
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {resources.map(resource => (
                <button
                  key={resource.resourceId}
                  type="button"
                  onClick={() => onNavigate?.(`/resources/${resource.resourceId}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-100 px-3 py-2 text-left transition hover:bg-gray-50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CreditCard size={15} className="shrink-0 text-gray-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{resource.title}</span>
                      <span className="block text-xs text-gray-500">{resource.categoryName ?? resource.resourceType}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-blue-700">
                    Открыть цены <ArrowRight size={13} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
