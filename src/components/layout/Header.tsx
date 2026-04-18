import { LogOut, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { signOut, user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-[#cbd5e1] bg-[#f8fbff] px-4 py-2 lg:px-6">
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold tracking-[-0.02em] text-gray-950">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>

        {user && (
          <div className="hidden border-l border-[#d7e0ea] pl-3 text-right xl:block">
            <p className="text-xs font-medium text-gray-900">{user.providerName}</p>
            <p className="text-[11px] text-gray-500">{user.email}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {actions && <div className="mr-2 flex items-center gap-2">{actions}</div>}
          <button className="rounded-md border border-[#cbd5e1] bg-white p-2 text-[#6b7a90] transition-colors hover:bg-[#f8fafc] hover:text-[#334155]">
            <Bell size={15} />
          </button>
          <button className="rounded-md border border-[#cbd5e1] bg-white p-2 text-[#6b7a90] transition-colors hover:bg-[#f8fafc] hover:text-[#334155]">
            <HelpCircle size={15} />
          </button>
          <button
            onClick={signOut}
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#495057] transition-colors hover:bg-[#f8fafc] hover:text-[#1f2d3d]"
            title={`Sign out ${user?.email}`}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
