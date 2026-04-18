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
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/useAuth';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/' },
  { label: 'Bookings', icon: <ShoppingBag size={16} />, path: '/bookings' },
  { label: 'Fulfillment', icon: <CheckSquare size={16} />, path: '/fulfillment', badge: '8' },
  {
    label: 'Catalog',
    icon: <Package size={16} />,
    path: '/resources',
    children: [
      { label: 'Resources', path: '/resources' },
      { label: 'Variants', path: '/variants' },
      { label: 'Offers', path: '/offers' },
    ],
  },
  {
    label: 'Configuration',
    icon: <CalendarDays size={16} />,
    path: '/availability',
    children: [
      { label: 'Availability', path: '/availability' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Policy', path: '/policy' },
    ],
  },
  { label: 'Reports', icon: <ClipboardList size={16} />, path: '/reports' },
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
      className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-[#b6c2d2] bg-[#f8fbff] text-[#2b3a4b] transition-[width] duration-200 ${
        collapsed ? 'w-[86px]' : 'w-64'
      }`}
    >
      <div className="border-b border-[#d7e0ea] px-3 py-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#0d6efd] bg-[#0d6efd] text-white">
            <Mountain size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.02em] text-[#1f2d3d]">Sportgearhub</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[#6b7a90]">Partner CRM</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onToggleCollapse}
        className="m-3 inline-flex items-center justify-center rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-[#5b6b80] transition hover:bg-[#f8fafc] hover:text-[#1f2d3d]"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {navItems.map(item => {
          if (item.children) {
            const open = expanded.includes(item.label);
            const childActive = item.children.some(c => isActive(c.path));
            return (
              <div key={item.label} className="mb-2">
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-colors ${
                    childActive ? 'border-[#b6d4fe] bg-[#e7f1ff] text-[#084298]' : 'text-[#556579] hover:border-[#d7e0ea] hover:bg-white hover:text-[#1f2d3d]'
                  }`}
                  title={item.label}
                >
                  <span className={childActive ? 'text-[#0d6efd]' : 'text-[#7b8ba1]'}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                </button>
                {open && !collapsed && (
                  <div className="mt-1 space-y-1 pl-4">
                    {item.children.map(child => (
                      <button
                        key={child.path}
                        onClick={() => onNavigate(child.path)}
                        className={`w-full rounded-md border border-transparent px-4 py-2 text-left text-xs tracking-[0.02em] transition-colors ${
                          isActive(child.path)
                            ? 'border-[#b6d4fe] bg-[#e7f1ff] text-[#084298]'
                            : 'text-[#6b7a90] hover:border-[#d7e0ea] hover:bg-white hover:text-[#1f2d3d]'
                        }`}
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
              className={`mb-1 flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'border-[#b6d4fe] bg-[#e7f1ff] text-[#084298]'
                  : 'text-[#556579] hover:border-[#d7e0ea] hover:bg-white hover:text-[#1f2d3d]'
              }`}
              title={item.label}
            >
              <span className={isActive(item.path) ? 'text-[#0d6efd]' : 'text-[#7b8ba1]'}>{item.icon}</span>
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="rounded-md border border-[#b6d4fe] bg-[#e7f1ff] px-2 py-0.5 text-[10px] font-bold text-[#084298]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-2 border-t border-[#d7e0ea] px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#cbd5e1] bg-white">
              <span className="text-xs font-bold text-[#1f2d3d]">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#1f2d3d]">{user?.name}</p>
              <p className="truncate text-[11px] capitalize text-[#6b7a90]">{user?.role.replace(/_/g, ' ')}</p>
            </div>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#198754]" />
          </div>
        </div>
      )}
    </aside>
  );
}
