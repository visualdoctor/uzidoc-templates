import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  /** Centered header text. */
  title?: string;
  /** Shows a back button at the left of the header. */
  backTo?: string;
}

export default function Layout({ children, title, backTo }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-100 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center shrink-0">
        <div className="justify-self-start">
          {backTo && (
            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Link>
          )}
        </div>
        <h1 className="text-lg font-bold text-slate-800 text-center">{title}</h1>
        <div className="justify-self-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 px-4 sm:px-6 py-4 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
