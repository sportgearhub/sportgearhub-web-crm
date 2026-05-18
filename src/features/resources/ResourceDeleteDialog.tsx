import { AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Resource } from '../../types';

interface ResourceDeleteDialogProps {
  resource: Resource | null;
  removing: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (resource: Resource) => void;
  onArchive: (resource: Resource) => void;
}

export function ResourceDeleteDialog({
  resource,
  removing,
  error,
  onClose,
  onConfirm,
  onArchive,
}: ResourceDeleteDialogProps) {
  return (
    <Modal
      open={Boolean(resource)}
      onClose={() => {
        if (!removing) onClose();
      }}
      title="Удалить ресурс"
      size="sm"
    >
      {resource && (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-950">Удалить "{resource.title}"?</p>
              <p className="mt-1 text-xs leading-5 text-red-700">
                Это действие нельзя отменить. Удаление доступно только для ресурсов без офферов,
                броней и записей выдачи.
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={removing}>
              Отмена
            </Button>
            {error && resource.status !== 'archived' && (
              <Button variant="secondary" onClick={() => onArchive(resource)} disabled={removing}>
                В архив
              </Button>
            )}
            <Button variant="danger" onClick={() => onConfirm(resource)} loading={removing}>
              Удалить
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
