import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminTeams() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [modalTeam, setModalTeam] = useState(null); // which team is open in modal

  async function load() {
    setLoading(true);
    setMsg('');
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        created_by,
        created_at,
        team_members (*)
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    setLoading(false);
    if (error) { setMsg(error.message); return; }

    const list = (data || []).map(t => ({
      ...t,
      team_members: (t.team_members || []).slice().sort((a, b) => {
        const ax = a?.joined_at ? new Date(a.joined_at).getTime() : 0;
        const bx = b?.joined_at ? new Date(b.joined_at).getTime() : 0;
        return ax - bx;
      })
    }));
    setItems(list);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(t => {
      if ((t.id || '').toLowerCase().includes(needle)) return true;
      if ((t.created_by || '').toLowerCase().includes(needle)) return true;
      if (Array.isArray(t.team_members)) {
        for (const m of t.team_members) {
          if ((m.member_name || '').toLowerCase().includes(needle)) return true;
          if ((m.member_email || '').toLowerCase().includes(needle)) return true;
          if ((m.member_phone || '').toLowerCase().includes(needle)) return true;
        }
      }
      return false;
    });
  }, [q, items]);

  const fmt = (dt) => { try { return new Date(dt).toLocaleString('en-IN'); } catch { return dt || ''; } };

  return (
    <div className="c_admin-page">
      <div className="c_admin-row">
        <h2 className="c_admin-title">Teams</h2>
        <div className="c_admin-grow" />
        <input
          className="c_admin-input"
          placeholder="Search team id / created_by / member name/email/phone"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <button className="c_admin-btn" onClick={load} style={{ marginLeft: 8 }}>Reload</button>
      </div>

      {msg && <div className="c_admin-alert">{msg}</div>}

      {loading ? (
        <p className="c_admin-dim">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="c_admin-dim">No teams found.</p>
      ) : (
        <div className="c_admin-table">
          <div className="c_admin-thead c_admin-grid">
            <div>Team ID</div>
            <div>Created At</div>
            <div>Action</div>
          </div>

          <div className="c_admin-tbody">
            {filtered.map(team => (
              <div key={team.id} className="c_admin-rowline">
                <div className="c_admin-grid">
                  <div className="c_admin-cell"><code className="c_admin-code">{team.id}</code></div>
                  <div className="c_admin-cell">{fmt(team.created_at)}</div>
                  <div className="c_admin-cell c--actions">
                    <button className="c_admin-btn c_admin-btn--ghost" onClick={() => setModalTeam(team)}>
                      View members
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MembersModal team={modalTeam} onClose={() => setModalTeam(null)} />
    </div>
  );
}

/* ---------------- Popup modal (hooks fixed) ---------------- */

function MembersModal({ team, onClose }) {
  // HOOKS MUST ALWAYS RUN (even if team is null)
  const [needle, setNeedle] = useState('');
  const [selected, setSelected] = useState(null);

  // reset inputs when team changes
  useEffect(() => { setNeedle(''); setSelected(null); }, [team]);

  // esc to close (only when open)
  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose?.(); }
    if (team) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [team, onClose]);

  const members = Array.isArray(team?.team_members) ? team.team_members : [];
  const list = useMemo(() => {
    const n = needle.trim().toLowerCase();
    if (!n) return members;
    return members.filter(m =>
      (m.member_name || '').toLowerCase().includes(n) ||
      (m.member_email || '').toLowerCase().includes(n) ||
      (m.member_phone || '').toLowerCase().includes(n)
    );
  }, [members, needle]);

  const fmt = (dt) => { try { return new Date(dt).toLocaleString('en-IN'); } catch { return dt || ''; } };

  // after all hooks are declared, you may return null safely
  if (!team) return null;

  function stop(e) { e.stopPropagation(); }

  return (
    <div className="c_modal-backdrop" onMouseDown={onClose}>
      <div className="c_modal" role="dialog" aria-modal="true" onMouseDown={stop}>
        <header className="c_modal-head">
          <div>
            <div className="c_modal-title">Team members</div>
            <div className="c_modal-sub">
              <b>Team:</b> <code className="c_admin-code">{team.id}</code> &nbsp;·&nbsp;
              <b>Created by:</b> {team.created_by || '—'} &nbsp;·&nbsp;
              <b>Created at:</b> {fmt(team.created_at)}
            </div>
          </div>
          <button className="c_admin-btn" onClick={onClose}>Close</button>
        </header>

        <section className="c_modal-body">
          {/* Left: list */}
          <aside className="c_modal-aside">
            <input
              className="c_admin-input"
              placeholder="Search member name / email / phone"
              value={needle}
              onChange={e => setNeedle(e.target.value)}
            />
            <ul className="c_modal-list">
              {list.length === 0 ? (
                <li className="c_admin-dim" style={{ padding: 8 }}>No members found.</li>
              ) : list.map(m => (
                <li
                  key={m.id || `${team.id}:${m.member_user_id}`}
                  className={`c_modal-item ${selected?.id === m.id ? 'is-active' : ''}`}
                  onClick={() => setSelected(m)}
                >
                  <div className="c_modal-item__title">{m.member_name || '—'}</div>
                  <div className="c_modal-item__sub">
                    {(m.member_email || '—')}{m.member_phone ? ` · ${m.member_phone}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* Right: details */}
          <main className="c_modal-main">
            {!selected ? (
              <p className="c_admin-dim">Select a member to view details.</p>
            ) : (
              <MemberDetail member={selected} />
            )}
          </main>
        </section>
      </div>
    </div>
  );
}

function MemberDetail({ member }) {
  const fmtDT = (dt) => { try { return new Date(dt).toLocaleString('en-IN'); } catch { return dt || ''; } };
  const fmtDateOnly = (v) => {
    if (!v) return '—';
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y,m,d] = s.split('-');
      return `${d}/${m}/${y}`;
    }
    try {
      return new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
    } catch { return s; }
  };

  const labelMap = {
    member_name:'Name', member_email:'Email', member_phone:'Phone',
    age:'Age', gender:'Gender', dob:'Date of Birth',
    is_student:'Student', institute_name:'Institute',
    course:'Course', current_year:'Current Year', cgpa:'CGPA',
    state_name:'State', city_name:'City', programs_known:'Programs Known',
    preferred_track:'Preferred Track', problem_statement_preference:'Problem Preference',
    previous_projects:'Previous Projects', motivation:'Motivation',
    ai_ml_experience_level:'AI/ML Experience', need_accommodation:'Need Accommodation',
    joined_at:'Joined At'
  };

  const order = [
    'member_name','member_email','member_phone',
    'age','gender','dob',
    'is_student','institute_name','course','current_year','cgpa',
    'state_name','city_name','programs_known',
    'preferred_track','problem_statement_preference','previous_projects','motivation',
    'ai_ml_experience_level','need_accommodation','joined_at'
  ];

  const stringify = (k, v) => {
    if (v === null || v === undefined || v === '') return null;
    if (k === 'is_student' || k === 'need_accommodation') return v ? 'Yes' : 'No';
    if (k === 'joined_at') return fmtDT(v);
    if (k === 'dob') return fmtDateOnly(v);            // ⬅️ date only
    if (k === 'programs_known' && Array.isArray(v)) return v.join(', ');
    return String(v);
  };

  const rows = [];
  for (const k of order) {
    const val = stringify(k, member[k]);
    if (val !== null) rows.push([labelMap[k] || k, val]);
  }
  Object.keys(member).forEach(k => {
    if (order.includes(k)) return;
    if (k === 'id' || k === 'team_id') return;
    const val = stringify(k, member[k]);
    if (val !== null) rows.push([labelMap[k] || k, val]);
  });

  return (
    <div className="c_modal-detail">
      <h3 className="c_modal-detail__title">{member.member_name || '—'}</h3>
      <div className="c_modal-kv">
        {rows.map(([k, v]) => (
          <div className="c_modal-kv__row" key={k}>
            <div className="c_modal-kv__k">{k}</div>
            <div className="c_modal-kv__v">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}