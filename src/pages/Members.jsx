// src/pages/Members.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Members() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [modalMember, setModalMember] = useState(null); // selected member for popup

  async function load() {
    setLoading(true);
    setMsg('');
    let query = supabase
      .from('team_members')
      .select(`
        member_user_id, team_id, member_name, member_email, member_phone,
        state_name, city_name, area_name, pincode,
        is_student, institute_name, age, gender, course, current_year, cgpa,
        preferred_track, programs_known, ai_ml_experience_level,
        problem_statement_preference, previous_projects, motivation, need_accommodation,
        dob, joined_at
      `)
      .order('joined_at', { ascending: false })
      .limit(1000);

    if (q.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or([
        `member_name.ilike.${like}`,
        `member_email.ilike.${like}`,
        `member_phone.ilike.${like}`,
        `state_name.ilike.${like}`,
        `city_name.ilike.${like}`,
        `institute_name.ilike.${like}`,
        `preferred_track.ilike.${like}`
      ].join(','));
    }

    const { data, error } = await query;
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setItems(data || []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const fmt = (dt) => { try { return new Date(dt).toLocaleString('en-IN'); } catch { return dt || ''; } };
  const list = useMemo(() => items, [items]); // placeholder for any future transforms

  return (
    <div className="c_admin-page">
      <div className="c_admin-row">
        <h2 className="c_admin-title">Members</h2>
        <div className="c_admin-grow" />
        <input
          className="c_admin-input"
          placeholder="Search name/email/phone/state/city/institute/track"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          style={{ maxWidth: 420 }}
        />
        <button className="c_admin-btn" onClick={load} style={{ marginLeft: 8 }}>Search</button>
      </div>

      {msg && <div className="c_admin-alert">{msg}</div>}

      {loading ? (
        <p className="c_admin-dim">Loading…</p>
      ) : list.length === 0 ? (
        <p className="c_admin-dim">No members found.</p>
      ) : (
        <div className="c_admin-table">
          <div className="c_admin-thead c_admin-grid">
            <div>Name</div>
            <div>Email</div>
            <div>Action</div>
          </div>

          <div className="c_admin-tbody">
            {list.map(m => (
              <div key={`${m.member_user_id}:${m.team_id}`} className="c_admin-rowline">
                <div className="c_admin-grid" >
                  <div className="c_admin-cell"><b>{m.member_name || '—'}</b></div>
                  <div className="c_admin-cell">{m.member_email || '—'}</div>
                
                  <div className="c_admin-cell c--actions">
                    <button className="c_admin-btn " onClick={() => setModalMember(m)}>
                      View details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MemberModal member={modalMember} onClose={() => setModalMember(null)} />
    </div>
  );
}

/* ---------------- Popup with full member details ---------------- */

function MemberModal({ member, onClose }) {
  // Keep hooks order stable (always run)
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(Boolean(member)); }, [member]);

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose?.(); }
    if (open) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const fmt = (dt) => { try { return new Date(dt).toLocaleString('en-IN'); } catch { return dt || ''; } };

  // after hooks: render nothing when closed
  if (!open || !member) return null;

  const labelMap = {
    member_name:'Name', member_email:'Email', member_phone:'Phone',
    team_id:'Team ID',
    age:'Age', gender:'Gender', dob:'Date of Birth',
    is_student:'Student', institute_name:'Institute / Company',
    course:'Course', current_year:'Current Year', cgpa:'CGPA',
    state_name:'State', city_name:'City', area_name:'Area', pincode:'Pincode',
    programs_known:'Programs Known',
    preferred_track:'Preferred Track', problem_statement_preference:'Problem Preference',
    previous_projects:'Previous Projects', motivation:'Motivation',
    ai_ml_experience_level:'AI/ML Experience', need_accommodation:'Need Accommodation',
    joined_at:'Joined At'
  };

  const order = [
    'member_name','member_email','member_phone',
    'team_id',
    'age','gender','dob',
    'is_student','institute_name','course','current_year','cgpa',
    'state_name','city_name','area_name','pincode',
    'programs_known',
    'preferred_track','problem_statement_preference','previous_projects','motivation',
    'ai_ml_experience_level','need_accommodation','joined_at'
  ];

  const stringify = (k, v) => {
    if (v === null || v === undefined || v === '') return null;
    if (k === 'is_student' || k === 'need_accommodation') return v ? 'Yes' : 'No';
    if (k === 'joined_at' || k === 'dob') return fmt(v);
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
    if (k === 'id') return;
    const val = stringify(k, member[k]);
    if (val !== null) rows.push([labelMap[k] || k, val]);
  });

  function stop(e) { e.stopPropagation(); }

  return (
    <div className="c_modal-backdrop" onMouseDown={onClose}>
      <div className="c_modal" role="dialog" aria-modal="true" onMouseDown={stop}>
        <header className="c_modal-head">
          <div>
            <div className="c_modal-title">Member details</div>
            <div className="c_modal-sub">
              <b>Name:</b> {member.member_name || '—'} &nbsp;·&nbsp;
              <b>Team:</b> <code className="c_admin-code">{member.team_id}</code>
            </div>
          </div>
          <button className="c_admin-btn" onClick={onClose}>Close</button>
        </header>

        <section className="c_modal-body" style={{ minHeight: 260 }}>
          <main className="c_modal-main" style={{ width: '100%' }}>
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
          </main>
        </section>
      </div>
    </div>
  );
}
