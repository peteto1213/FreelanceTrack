import { useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarDays, LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

const links = [
  { to: '/', label: 'Calendar', icon: CalendarDays, end: true },
  { to: '/companies', label: 'Companies', icon: Building2, end: false },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
];

export function AppShell() {
  const username = useAuthStore((state) => state.username);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setAnonymous();
      queryClient.setQueryData(['me'], null);
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-card/70 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 md:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              FT
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">FreelanceTrack</p>
              <p className="text-xs text-muted-foreground">{username}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
        <nav className="flex gap-2 px-3 pb-3 md:flex-col md:px-3 md:pb-6">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground',
                  isActive && 'bg-primary/15 text-foreground',
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-3 pb-6 md:block">
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>
      <main className="px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
