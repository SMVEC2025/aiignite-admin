// src/components/Nav.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Nav() {
  const nav = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    nav('/login', { replace: true });
  }
  return (
    <nav className="c_admin-nav">
      <div className="c_admin-brand">Admin</div>
      <div className="c_admin-links">
        <NavLink to="/" end className="c_admin-link">Dashboard</NavLink>
        <NavLink to="/teams" className="c_admin-link">Teams</NavLink>
        <NavLink to="/members" className="c_admin-link">Members</NavLink>
        <NavLink to="/announcements" className="c_admin-link">Announcements</NavLink>
        <NavLink to="/timeline" className="c_admin-link">Timeline</NavLink>
      </div>
      <button className="c_admin-btn c_admin-btn--ghost" onClick={signOut}>Sign out</button>
    </nav>
  );
}
