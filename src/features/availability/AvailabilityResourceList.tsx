import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Resource } from '../../types';
import { availabilityModeFor, modeLabel } from './availabilityTypes';

interface AvailabilityResourceListProps {
  resources: Resource[];
  selectedResourceId: string;
  loading: boolean;
  onSelect: (resourceId: string) => void;
  onNavigate?: (path: string) => void;
}

export function AvailabilityResourceList({
  resources,
  selectedResourceId,
  loading,
  onSelect,
  onNavigate,
}: AvailabilityResourceListProps) {
  return (
    <aside className="w-80 shrink-0 border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Доступность</h2>
        <p className="mt-0.5 text-xs text-gray-500">Прокатные позиции и расписание</p>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Загружаем позиции...</div>
        ) : resources.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 px-3 py-8 text-center">
            <p className="text-sm font-medium text-gray-900">Прокатные позиции пока не созданы.</p>
            <p className="mt-1 text-xs text-gray-500">Добавьте первую позицию, чтобы настроить доступность.</p>
            <Button size="sm" variant="primary" className="mt-4" onClick={() => onNavigate?.('/resources/create')}>
              Добавить позицию
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {resources.map(resource => {
              const selected = resource.resourceId === selectedResourceId;
              const mode = availabilityModeFor(resource);
              return (
                <button
                  key={resource.resourceId}
                  type="button"
                  onClick={() => onSelect(resource.resourceId)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    selected ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{resource.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{resource.categoryName ?? resource.resourceType}</p>
                    </div>
                    <Badge variant={mode === 'inventory' ? 'teal' : 'blue'}>{modeLabel(mode)}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
