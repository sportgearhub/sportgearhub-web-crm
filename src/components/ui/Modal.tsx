import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1f2d3d]/35" onClick={onClose} />
      <div className={`relative w-full max-h-[90vh] overflow-y-auto rounded-lg border border-[#cbd5e1] bg-white shadow-[0_10px_30px_rgba(18,38,63,0.12)] ${sizeClasses[size]}`}>
        <div className="flex items-center justify-between rounded-t-lg border-b border-[#d7e0ea] bg-[#f8fbff] px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-md border border-[#cbd5e1] bg-white p-1 text-gray-400 hover:bg-[#f8fafc] hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
