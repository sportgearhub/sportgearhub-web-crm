import { LogOut, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { signOut, user, activeMembership } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <div className="flex min-h-12 items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {user && (
          <div className="hidden border-l pl-3 text-right xl:block">
            <p className="text-xs font-medium text-foreground">{activeMembership?.displayName ?? 'Доступ партнера'}</p>
            <p className="text-[11px] text-muted-foreground">{user.email}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {actions && <div className="mr-2 flex items-center gap-2">{actions}</div>}
          <Button type="button" variant="secondary" size="icon" title="Уведомления">
            <Bell size={15} />
          </Button>
          <Button type="button" variant="secondary" size="icon" title="Помощь">
            <HelpCircle size={15} />
          </Button>
          <Button
            onClick={signOut}
            variant="secondary"
            size="sm"
            className="ml-1"
            title={`Выйти из ${user?.email}`}
          >
            <LogOut size={13} />
            Выйти
          </Button>
        </div>
      </div>
    </header>
  );
}
