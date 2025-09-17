// src/components/RequireAdmin.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ensureAdminOrSignOut } from '../lib/admin';
import { useNavigate } from 'react-router-dom';

export default function RequireAdmin({ children }) {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? null;
      if (!alive) return;

      if (!session) {
        nav('/login', { replace: true });
        return;
      }

      const ok = await ensureAdminOrSignOut();
      if (!alive) return;

      if (!ok) {
        nav('/login', { replace: true, state: { err: 'Not authorized' } });
        return;
      }
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!alive) return;
      if (!s) nav('/login', { replace: true });
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [nav]);

  if (!ready) {
    return (
      <div className="c_admin-wrap">
        <div className="c_admin-card"><p>Checking access…</p></div>
      </div>
    );
  }
  return children;
}
