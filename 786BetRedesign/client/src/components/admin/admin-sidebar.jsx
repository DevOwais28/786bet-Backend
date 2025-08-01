import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Settings,
  Gamepad2,
  Shield,
  LogOut
} from 'lucide-react';

const AdminSidebar = () => {
  const [location] = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/admin',
      active: location === '/admin'
    },
    {
      title: 'Users',
      icon: Users,
      href: '/admin/users',
      active: location.startsWith('/admin/users')
    },
    {
      title: 'Deposits',
      icon: DollarSign,
      href: '/admin/deposits',
      active: location.startsWith('/admin/deposits')
    },
    {
      title: 'Withdrawals',
      icon: DollarSign,
      href: '/admin/withdrawals',
      active: location.startsWith('/admin/withdrawals')
    },
    {
      title: 'Game Settings',
      icon: Gamepad2,
      href: '/admin/game-settings',
      active: location.startsWith('/admin/game-settings')
    },
    {
      title: 'Security',
      icon: Shield,
      href: '/admin/security',
      active: location.startsWith('/admin/security')
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/admin/settings',
      active: location.startsWith('/admin/settings')
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 h-screen flex flex-col">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-gold">Admin Panel</h2>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      item.active
                        ? 'bg-gold text-black'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.title}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-3 py-2 w-full text-left text-zinc-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
