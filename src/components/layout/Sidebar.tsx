import {
  Mountain,
  LayoutDashboard,
  Package,
  CalendarDays,
  ShoppingBag,
  ClipboardList,
  CheckSquare,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: string;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Bookings', icon: ShoppingBag, path: '/bookings' },
  { label: 'Fulfillment', icon: CheckSquare, path: '/fulfillment', badge: '8' },
  {
    label: 'Catalog',
    icon: Package,
    path: '/resources',
    children: [
      { label: 'Resources', path: '/resources' },
      { label: 'Variants', path: '/variants' },
      { label: 'Offers', path: '/offers' },
    ],
  },
  {
    label: 'Configuration',
    icon: CalendarDays,
    path: '/availability',
    children: [
      { label: 'Availability', path: '/availability' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Policy', path: '/policy' },
    ],
  },
  { label: 'Reports', icon: ClipboardList, path: '/reports' },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentPath, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string[]>(['Catalog', 'Configuration']);

  const toggleExpand = (label: string) => {
    setExpanded(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      <div className="border-b px-3 py-3">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Mountain size={18} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">Sportgearhub</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Partner CRM</p>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={onToggleCollapse}
        variant="ghost"
        size="icon"
        className="m-3 self-center text-muted-foreground"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </Button>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {navItems.map(item => {
          const Icon = item.icon;
          if (item.children) {
            const open = expanded.includes(item.label);
            const childActive = item.children.some(c => isActive(c.path));
            return (
              <div key={item.label} className="mb-2">
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'flex h-9 w-full items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    collapsed ? 'justify-center' : 'gap-3',
                    childActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                  title={item.label}
                >
                  <Icon size={16} className={cn('shrink-0', childActive ? 'text-sidebar-primary' : 'text-muted-foreground')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                </button>
                {open && !collapsed && (
                  <div className="mt-1 space-y-1 border-l pl-3 ml-4">
                    {item.children.map(child => (
                      <button
                        key={child.path}
                        onClick={() => onNavigate(child.path)}
                        className={cn(
                          'h-8 w-full rounded-md px-3 text-left text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          isActive(child.path) ? 'bg-sidebar-accent text-sidebar-primary' : 'text-muted-foreground'
                        )}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                'mb-1 flex h-9 w-full items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed ? 'justify-center' : 'gap-3',
                isActive(item.path) && 'bg-sidebar-accent text-sidebar-accent-foreground'
              )}
              title={item.label}
            >
              <Icon size={16} className={cn('shrink-0', isActive(item.path) ? 'text-sidebar-primary' : 'text-muted-foreground')} />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && item.badge && (
                <Badge variant="blue">{item.badge}</Badge>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-2 border-t px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
              <span className="text-xs font-bold text-foreground">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-[11px] capitalize text-muted-foreground">{user?.role.replace(/_/g, ' ')}</p>
            </div>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
        </div>
      )}
    </aside>
  );
}
