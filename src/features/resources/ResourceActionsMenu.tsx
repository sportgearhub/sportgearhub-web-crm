import { useState } from 'react';
import { Archive, CreditCard as Edit2, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Resource } from '../../types';

interface ResourceActionsMenuProps {
  resource: Resource;
  onEdit: () => void;
  onArchive: () => void;
  onRemove: () => void;
  removing?: boolean;
  showEdit?: boolean;
  className?: string;
}

export function ResourceActionsMenu({
  resource,
  onEdit,
  onArchive,
  onRemove,
  removing = false,
  showEdit = true,
  className,
}: ResourceActionsMenuProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const open = Boolean(position);

  const close = () => setPosition(null);

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      left: Math.min(Math.max(8, rect.right - 208), window.innerWidth - 216),
    });
  };

  const runAction = (action: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    close();
    action();
  };

  return (
    <div className={cn('inline-flex', className)} onClick={event => event.stopPropagation()}>
      <button
        type="button"
        onClick={openMenu}
        disabled={removing}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        title="Действия"
        aria-label={`Действия с позицией ${resource.title}`}
        aria-expanded={open}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && position && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className="fixed z-50 w-52 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            style={{ top: position.top, left: position.left }}
          >
            {showEdit && <MenuItem icon={<Edit2 size={14} />} label="Редактировать" onClick={runAction(onEdit)} />}
            {resource.status !== 'archived' && (
              <MenuItem icon={<Archive size={14} />} label="В архив" onClick={runAction(onArchive)} />
            )}
            {(showEdit || resource.status !== 'archived') && <div className="my-1 border-t border-gray-100" />}
            <MenuItem
              icon={<Trash2 size={14} />}
              label="Удалить"
              danger
              disabled={removing}
              onClick={runAction(onRemove)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-9 w-full items-center gap-2 px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
