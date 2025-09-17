// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({ members: 0, teams: 0, announcements: 0, timeline: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: m }, { count: t }, { count: a }, { count: tl }] = await Promise.all([
        supabase.from('team_members').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true }),
        supabase.from('aiignite_timeline').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        members: m ?? 0,
        teams: t ?? 0,
        announcements: a ?? 0,
        timeline: tl ?? 0
      });
    })();
  }, []);

  const cards = [
    { k: 'Members', v: stats.members },
    { k: 'Teams', v: stats.teams },
    { k: 'Announcements', v: stats.announcements },
    { k: 'Timeline Items', v: stats.timeline },
  ];

  return (
    <div className="c_admin-page">
      <h2 className="c_admin-title">Dashboard</h2>
      <div className="c_admin-grid">
        {cards.map(c => (
          <div key={c.k} className="c_admin-stat">
            <div className="c_admin-stat__k">{c.k}</div>
            <div className="c_admin-stat__v">{c.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
