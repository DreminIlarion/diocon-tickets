import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Building2, 
  Mail, 
  Bell, 
  User,
  Plus,
  LogOut,
  X,
  Building,
  FolderOpen,
  FileAxis3d
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const isCustomer = user?.role === 'customer' || user?.role === 'customer_admin';
  const canInvite = ['support_agent', 'support_manager', 'executor', 'admin'].includes(user?.role || '');

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
    { to: '/tickets', icon: FileText, label: 'Заявки' },
    ...(isCustomer 
      ? [{ to: '/my-company', icon: Building, label: 'Моя компания' }]
      : [{ to: '/counterparties', icon: Building2, label: 'Контрагенты' }]
    ),
    { to: '/projects', icon: FolderOpen, label: 'Проекты' },
    ...(canInvite ? [{ to: '/products', icon: FileAxis3d, label: 'Продукты' }] : []),
    ...(canInvite ? [{ to: '/invitations', icon: Mail, label: 'Приглашения' }] : []),
  ];

  const settingsItems = [
    { to: '/notifications', icon: Bell, label: 'Уведомления' },
    { to: '/profile', icon: User, label: 'Профиль' },
  ];

  const SidebarContent = () => (
    <div className="bg-[var(--bg-sidebar-inner)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-4 flex-1 min-w-0">
          <img 
            src="http://80.93.62.177:8000/media/images/Logo_bez_fona_bez_teksta.width-80.height-80.png"
            alt="ДИО-Консалт"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-[var(--text-primary)] text-lg truncate">ДИО-Деск</h1>
              <p className="text-xs text-[var(--text-muted)]">Система заявок</p>
            </div>
          )}
        </NavLink>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--hover-1)] transition-colors flex-shrink-0"
        >
          {isCollapsed ? (
            <img 
              src="http://80.93.62.177:8000/media/images/Logo_bez_fona_bez_teksta.width-80.height-80.png"
              alt="logo"
              className="w-7 h-7 object-contain"
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="w-5 h-0.5 bg-[var(--text-secondary)] rounded" />
              <div className="w-5 h-0.5 bg-[var(--text-secondary)] rounded" />
              <div className="w-5 h-0.5 bg-[var(--text-secondary)] rounded" />
            </div>
          )}
        </button>

        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="p-5">
        <button
          onClick={() => { navigate('/tickets/new'); onClose?.(); }}
          className="w-full btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Новая заявка</span>}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              'nav-item text-base flex items-center gap-4 ' + (isActive ? 'nav-item-active' : '') + (isCollapsed ? ' justify-center px-2' : '')
            }
          >
            <item.icon className="w-6 h-6 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        <div className="my-6 border-t border-[var(--border-color)]" />

        {settingsItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              'nav-item text-base flex items-center gap-4 ' + (isActive ? 'nav-item-active' : '') + (isCollapsed ? ' justify-center px-2' : '')
            }
          >
            <item.icon className="w-6 h-6 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <aside 
        className={'hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border-color)] transition-all duration-300 bg-[var(--bg-sidebar)] ' +
          (isCollapsed ? 'w-20' : 'w-72')}
      >
        <SidebarContent />
      </aside>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
          <aside className="fixed right-0 top-0 h-full w-80 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] z-50 lg:hidden overflow-y-auto">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
