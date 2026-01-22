// src/pages/Members.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildExcelHtml(headers, rows) {
  const head = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join(', ')}</tr>`;
  const body = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join(', ')}</tr>`).join(', ');
  return `<!doctype html><html><head><meta charset=\"UTF-8\"></head><body><table>${head}${body}</table></body></html>`;
}

export default function Members() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [modalMember, setModalMember] = useState(null); // selected member for popup
  const [instFilter, setInstFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

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
  const instKeywords = ['smvec', 'manakula', 'srimanakula', 'vinayagar', 'mailam', 'mvit', 'mit'];
  const isSmvec = (name) => {
    const n = (name || '').toLowerCase();
    return instKeywords.some(k => n.includes(k));
  };
  const stateGroup = (state) => {
    const s = (state || '').toLowerCase();
    if (['pondicherry', 'puducherry', 'py'].some(k => s.includes(k))) return 'pondy';
    if (['tamil nadu', 'tamilnadu', 'tn'].some(k => s.includes(k))) return 'tn';
    return 'other';
  };
  const list = useMemo(() => {
    return items.filter(m => {
      if (instFilter === 'smvec' && !isSmvec(m.institute_name)) return false;
      if (instFilter === 'other' && isSmvec(m.institute_name)) return false;
      const sg = stateGroup(m.state_name);
      if (stateFilter === 'pondy' && sg !== 'pondy') return false;
      if (stateFilter === 'tn' && sg !== 'tn') return false;
      if (stateFilter === 'other' && sg !== 'other') return false;
      return true;
    });
  }, [items, instFilter, stateFilter]);
  const exportMembers = () => {
    if (loading) return;
    if (!list.length) {
      setMsg('No members to export.');
      return;
    }

    const headers = ['Name', 'Email', 'State', 'City'];
    const rows = list.map(m => [
      m.member_name || '',
      m.member_email || '',
      m.state_name || '',
      m.city_name || ''
    ]);

    const html = buildExcelHtml(headers, rows);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `members_${stamp}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="c_admin-page">
      <div className="c_admin-row">
        <h2 className="c_admin-title">Members</h2>
        <div className="c_admin-dim" style={{ marginLeft: 12 }}>Total: {loading ? "..." : list.length}</div>
        <button className="c_admin-btn" onClick={exportMembers} style={{ marginLeft: 12 }} disabled={loading || list.length === 0}>Export</button>
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

      <div className="c_admin-row" style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="c_admin-dim">Institute</span>
          <select className="c_admin-input" value={instFilter} onChange={e => setInstFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="smvec">SMVEC / Manakula / Mailam</option>
            <option value="other">Other colleges</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="c_admin-dim">State</span>
          <select className="c_admin-input" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pondy">Pondicherry / Puducherry</option>
            <option value="tn">Tamil Nadu</option>
            <option value="other">Others</option>
          </select>
        </div>
      </div>

      {msg && <div className="c_admin-alert">{msg}</div>}

      {loading ? (
        <p className="c_admin-dim">Loading…</p>
      ) : list.length === 0 ? (
        <p className="c_admin-dim">No members found.</p>
      ) : (
        <div className="c_admin-table c_admin-table--members">
          <div className="c_admin-thead c_admin-grid c_admin-grid--members">
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Location</div>
            <div>Student</div>
            <div>Track</div>
            <div>Joined</div>
            <div>Action</div>
          </div>

          <div className="c_admin-tbody">
            {list.map(m => (
              <div key={`${m.member_user_id}:${m.team_id}`} className="c_admin-rowline">
                <div className="c_admin-grid c_admin-grid--members">
                  <div className="c_admin-cell"><b>{m.member_name || '—'}</b></div>
                  <div className="c_admin-cell">{m.member_email || '—'}</div>
                  <div className="c_admin-cell">{m.member_phone || '—'}</div>
                  <div className="c_admin-cell">{[m.city_name, m.state_name].filter(Boolean).join(', ') || '—'}</div>
                  <div className="c_admin-cell">
                    {m.is_student ? `Yes${m.institute_name ? ` (${m.institute_name})` : ''}` : 'No'}
                  </div>
                  <div className="c_admin-cell">{m.preferred_track || '—'}</div>
                  <div className="c_admin-cell">{fmt(m.joined_at) || '—'}</div>

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
    member_name: 'Name', member_email: 'Email', member_phone: 'Phone',
    team_id: 'Team ID',
    age: 'Age', gender: 'Gender', dob: 'Date of Birth',
    is_student: 'Student', institute_name: 'Institute / Company',
    course: 'Course', current_year: 'Current Year', cgpa: 'CGPA',
    state_name: 'State', city_name: 'City', area_name: 'Area', pincode: 'Pincode',
    programs_known: 'Programs Known',
    preferred_track: 'Preferred Track', problem_statement_preference: 'Problem Preference',
    previous_projects: 'Previous Projects', motivation: 'Motivation',
    ai_ml_experience_level: 'AI/ML Experience', need_accommodation: 'Need Accommodation',
    joined_at: 'Joined At'
  };

  const order = [
    'member_name', 'member_email', 'member_phone',
    'team_id',
    'age', 'gender', 'dob',
    'is_student', 'institute_name', 'course', 'current_year', 'cgpa',
    'state_name', 'city_name', 'area_name', 'pincode',
    'programs_known',
    'preferred_track', 'problem_statement_preference', 'previous_projects', 'motivation',
    'ai_ml_experience_level', 'need_accommodation', 'joined_at'
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





