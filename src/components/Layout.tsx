import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, FileText, LayoutTemplate } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TEMPLATES_ROOT } from '@/lib/templates';

const NAV_ITEMS = [
  { icon: LayoutTemplate, label: 'Шаблоны', title: 'Шаблоны', path: TEMPLATES_ROOT },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('Пользователь');

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return;
      const meta = session.user.user_metadata as { full_name?: string } | undefined;
      setUserName(meta?.full_name?.trim() || session.user.email || 'Пользователь');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="h-[100dvh] flex bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Uzidoc</p>
              <p className="text-blue-400 text-xs">Шаблоны протоколов</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: profile + logout */}
        <div className="px-3 pb-4 border-t border-slate-800 pt-3">
          <div className="bg-slate-800/60 rounded-xl px-3 py-3 mb-2">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center shrink-0">
                <span className="text-blue-300 text-sm font-bold">
                  {userName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{userName}</p>
                <p className="text-slate-400 text-xs">Владелец</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-600/10 hover:text-red-400 transition-colors text-sm font-medium w-full"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content — scrolls independently of fixed sidebar */}
      <div className="ml-64 flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.title ?? 'Uzidoc'}
            </h1>
          </div>
        </header>

        <main className="flex-1 min-h-0 px-8 py-6 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
