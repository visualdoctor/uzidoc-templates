import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Lets through only a signed-in account listed in public.uzidoc_owners.
 * The database enforces the same rule with RLS; this only spares a stranger
 * an empty editor.
 */
export default function RequireOwner({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'out'>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (!cancelled) setState('out'); return; }
      const { data } = await supabase
        .from('uzidoc_owners')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        await supabase.auth.signOut();
        setState('out');
        return;
      }
      setState('ok');
    })();

    // Never await inside this callback: it deadlocks supabase.auth.getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setState('out');
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (state === 'out') return <Navigate to="/login" replace />;
  if (state === 'checking') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
