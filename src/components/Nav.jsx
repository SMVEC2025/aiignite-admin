// src/components/Nav.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogOut } from 'lucide-react';
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
        <NavLink to="/mentors" className="c_admin-link">Mentors</NavLink>
        <NavLink to="/mentoring-sessions" className="c_admin-link">Mentors-sessions</NavLink>
        <NavLink to="/sessions" className="c_admin-link">Sessions</NavLink>
      </div>
      <button id='log-out' style={{ border: 'none' }} className="c_admin-btn c_admin-btn--ghost" onClick={signOut}><LogOut size={20} /></button>
    </nav>
  );
}
