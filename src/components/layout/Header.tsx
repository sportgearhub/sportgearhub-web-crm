import { LogOut, Bell, HelpCircle } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {

  return (
    <header className="sticky top-0 z-20 border-b border-[#cbd5e1] bg-[#f8fbff] px-4 py-2 lg:px-6">
      <div className="flex items-start gap-3 py-1">
        <div className="flex items-center gap-2">
          {actions && <div className="mr-2 flex items-center gap-2">{actions}</div>}
          <button className="rounded-md border border-[#cbd5e1] bg-white p-2 text-[#6b7a90] transition-colors hover:bg-[#f8fafc] hover:text-[#334155]">
            <HelpCircle size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
