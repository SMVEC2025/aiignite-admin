// src/pages/Login.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ensureAdminOrSignOut } from '../lib/admin';
import '../styles/Admin.scss';

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(loc.state?.err || '');

  useEffect(() => {
    // If already logged in & admin, go to final solutions
    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data?.session ?? null;
      if (s && (await ensureAdminOrSignOut())) {
        nav('/final-solutions', { replace: true });
      }
    })();
  }, [nav]);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) return setMsg(error.message);

    const ok = await ensureAdminOrSignOut();
    if (!ok) return setMsg('Not authorized');

    nav('/final-solutions', { replace: true });
  }

  return (
    <div className="c_admin-wrap">
      <div className="c_admin-card c_admin-login">
        <h2 className='login_title'>Admin Login</h2>
        {msg && <div className="c_admin-alert">{msg}</div>}
        <form onSubmit={submit} className="c_admin-form" autoComplete="off">
          <input
            className="c_admin-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />
          <input
            className="c_admin-input"
            placeholder="Password"
            type="password"
            value={pw}
            onChange={e=>setPw(e.target.value)}
            required
          />
          <button className="c_admin-btn">Sign in</button>
        </form>
       
      </div>
    </div>
  );
}
