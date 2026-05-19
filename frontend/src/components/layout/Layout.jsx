import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { cn, getInitials } from '../../lib/utils';
import {
  LayoutDashboard, Search, CalendarDays, Wallet, User,
  GraduationCap, Shield, Bell, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/discover', label: 'Find Tutors', icon: Search },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const api = (await import('../../lib/api')).default;
      await api.post('/auth/logout');
    } catch {}
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — Desktop */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 shadow-sm transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold text-lg shadow-lg">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PeerTutor</h1>
              <p className="text-xs text-gray-500">Marketplace</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </NavLink>
            ))}

            {/* Tutor-specific */}
            {['tutor', 'both'].includes(user?.role) && (
              <NavLink
                to="/become-tutor"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )
                }
              >
                <GraduationCap className="h-5 w-5" />
                Tutor Dashboard
              </NavLink>
            )}

            {/* Student — become a tutor */}
            {user?.role === 'student' && (
              <NavLink
                to="/become-tutor"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <GraduationCap className="h-5 w-5" />
                Become a Tutor
              </NavLink>
            )}

            {/* Admin */}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )
                }
              >
                <Shield className="h-5 w-5" />
                Admin Panel
              </NavLink>
            )}
          </nav>

          {/* User Info at Bottom */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
                {getInitials(user?.name)}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-4 ml-auto">
            {/* Notifications */}
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                3
              </span>
            </button>

            {/* User Dropdown */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white text-sm font-semibold">
                {getInitials(user?.name)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
