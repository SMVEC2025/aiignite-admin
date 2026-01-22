import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { RotateCw } from 'lucide-react';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildExcelHtml(headers, rows) {
  const head = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const body = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="UTF-8"></head><body><table>${head}${body}</table></body></html>`;
}

function buildSolutionsExcelHtml(headers, rows) {
  const head = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const body = rows.map(r => {
    const tds = r.map(cell => {
      if (!cell || typeof cell !== 'object') return `<td>${escapeHtml(cell ?? '')}</td>`;
      const text = escapeHtml(cell.text ?? '');
      if (cell.href) {
        const href = escapeHtml(cell.href);
        return `<td><a href="${href}">${text || href}</a></td>`;
      }
      return `<td>${text}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; }
    th, td { text-align: left; vertical-align: top; }
  </style>
  </head><body><table>${head}${body}</table></body></html>`;
}

function buildPdfHtml(headers, rows) {
  const head = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const body = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f4f4f4; }
  </style>
  </head><body><h1>Submitted Solutions</h1><table>${head}${body}</table></body></html>`;
}

export default function AdminTeams() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [modalTeam, setModalTeam] = useState(null); // which team is open in modal
  const [modalSolution, setModalSolution] = useState(null);
  const [solutionsByTeam, setSolutionsByTeam] = useState({});

  async function load() {
    setLoading(true);
    setMsg('');
    // Load teams + members
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
      id,
      created_by,
      created_at,
      team_members (*)
    `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) { setMsg(error.message); setLoading(false); return; }
    const list = (teams || []).map(t => ({
      ...t,
      team_members: (t.team_members || []).slice().sort((a, b) => {
        const ax = a?.joined_at ? new Date(a.joined_at).getTime() : 0;
        const bx = b?.joined_at ? new Date(b.joined_at).getTime() : 0;
        return ax - bx;
      })
    }));
    setItems(list);

    // Fetch solutions in a single query!
    const { data: sols, error: solErr } = await supabase
      .from('solutions')
      .select('*');
    if (!solErr && sols) {
      // Map: { team_id: solution, ... }
      const map = {};
      sols.forEach(sol => { if (sol.team_id) map[sol.team_id] = sol; });
      setSolutionsByTeam(map);
    }
    setLoading(false);
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

  const fmt = (dt) => {
    try {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return dt || "";

      // Month + day => "Nov 11"
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[d.getMonth()];
      const day = d.getDate();

      // Time => "12.55PM"
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12; // convert 0–23 to 1–12

      const time = `${hours}.${minutes}${suffix}`;

      // Final: "Nov 11, 12.55PM"
      return `${month} ${day}, ${time}`;
    } catch {
      return dt || "";
    }
  };

  const solutionsList = useMemo(() => {
    return Object.values(solutionsByTeam || {}).filter(Boolean);
  }, [solutionsByTeam]);

  const teamMemberMeta = useMemo(() => {
    const map = {};
    (items || []).forEach(t => {
      const first = Array.isArray(t.team_members) && t.team_members.length
        ? t.team_members[0]
        : null;
      if (t.id) {
        map[t.id] = {
          institute_name: first?.institute_name || '',
          state_name: first?.state_name || ''
        };
      }
    });
    return map;
  }, [items]);

  const exportSolutionsExcel = () => {
    if (loading) return;
    if (!solutionsList.length) {
      setMsg('No submitted solutions to export.');
      return;
    }

    const headers = [
      'Team ID',
      'Description',
      'GitHub URL',
      'Documentation URL',
      'Video URL',
      'Project URL',
      'Institute Name',
      'State Name',
      'Submitted At (Date)'
    ];
    const rows = solutionsList.map(s => ([
      { text: s.team_id || '' },
      { text: s.description || '' },
      { text: s.github_url || '', href: s.github_url || '' },
      { text: s.doc_url || '', href: s.doc_url || '' },
      { text: s.video_url || '', href: s.video_url || '' },
      { text: s.project_url || '', href: s.project_url || '' },
      { text: teamMemberMeta[s.team_id]?.institute_name || '' },
      { text: teamMemberMeta[s.team_id]?.state_name || '' },
      { text: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-IN') : '' }
    ]));

    const html = buildSolutionsExcelHtml(headers, rows);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `submitted_solutions_${stamp}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportSolutionsPdf = () => {
    if (loading) return;
    if (!solutionsList.length) {
      setMsg('No submitted solutions to export.');
      return;
    }

    const headers = ['Team ID', 'Submitted At'];
    const rows = solutionsList.map(s => [
      s.team_id || '',
      s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-IN') : ''
    ]);

    const html = buildPdfHtml(headers, rows);
    const win = window.open('', '_blank');
    if (!win) {
      setMsg('Popup blocked. Please allow popups to export PDF.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="c_admin-page">
      <div className="c_admin-row">
        <h2 className="c_admin-title">Teams</h2>
        <div className="c_admin-grow" />
        <button className="c_admin-btn" onClick={exportSolutionsExcel} disabled={loading || solutionsList.length === 0}>
          Export Excel
        </button>
        <button className="c_admin-btn" onClick={exportSolutionsPdf} style={{ marginLeft: 8 }} disabled={loading || solutionsList.length === 0}>
          Export PDF
        </button>
        <input
          className="c_admin-input"
          placeholder="Search team id / created_by / member name/email/phone"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <button className="c_admin-btn-reload" onClick={load} ><RotateCw /></button>
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
            {filtered.map((team, index) => (
              <div key={team.id} className="c_admin-rowline">
                <div className="c_admin-grid">
                  <div className="c_admin-cell"><code className="c_admin-code">{index + 1}</code></div>
                  <div className="c_admin-cell">{fmt(team.created_at)}</div>
                  <div className="c_admin-cell c--actions">
                    <button className="c_admin-btn c_admin-btn" onClick={() => setModalTeam(team)}>
                      View members
                    </button>
                    <Link
                      className="c_admin-btn c_admin-btn--ghost"
                      style={{ marginLeft: 8 }}
                      to={`/teams/${encodeURIComponent(team.id)}`}
                    >
                      Team members
                    </Link>
                  </div>
                  <div>
                    {solutionsByTeam[team.id] && (
                      <button
                        className="c_admin-btn c_admin-btn--rost"
                        style={{ marginLeft: 8 }}
                        onClick={() => setModalSolution(solutionsByTeam[team.id])}
                      >
                        View Solution
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      <MembersModal team={modalTeam} onClose={() => setModalTeam(null)} />
      <SolutionModal solution={modalSolution} onClose={() => setModalSolution(null)} />

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
      const [y, m, d] = s.split('-');
      return `${d}/${m}/${y}`;
    }
    try {
      return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return s; }
  };

  const labelMap = {
    member_name: 'Name', member_email: 'Email', member_phone: 'Phone',
    age: 'Age', gender: 'Gender', dob: 'Date of Birth',
    is_student: 'Student', institute_name: 'Institute',
    course: 'Course', current_year: 'Current Year', cgpa: 'CGPA',
    state_name: 'State', city_name: 'City', programs_known: 'Programs Known',
    preferred_track: 'Preferred Track', problem_statement_preference: 'Problem Preference',
    previous_projects: 'Previous Projects', motivation: 'Motivation',
    ai_ml_experience_level: 'AI/ML Experience', need_accommodation: 'Need Accommodation',
    joined_at: 'Joined At'
  };

  const order = [
    'member_name', 'member_email', 'member_phone',
    'age', 'gender', 'dob',
    'is_student', 'institute_name', 'course', 'current_year', 'cgpa',
    'state_name', 'city_name', 'programs_known',
    'preferred_track', 'problem_statement_preference', 'previous_projects', 'motivation',
    'ai_ml_experience_level', 'need_accommodation', 'joined_at'
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


function SolutionModal({ solution, onClose }) {
  if (!solution) return null;

  function stop(e) { e.stopPropagation(); }

  return (
    <div className="c_modal-backdrop" onMouseDown={onClose}>
      <div className="c_modal" style={{ maxWidth: 600 }} role="dialog" aria-modal="true" onMouseDown={stop}>
        <header className="c_modal-head">
          <div>
            <div className="c_modal-title">Team Solution</div>
            <div className="c_modal-sub">
              <b>Team ID:</b> <code className="c_admin-code">{solution.team_id}</code>
            </div>
          </div>
        </header>
        <section className="c_modal-body" style={{ flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 500, color: '#424242ff', marginBottom: 10 }}>
              {solution.description}
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>GitHub:</b> <a href={solution.github_url} target="_blank" rel="noopener noreferrer">{solution.github_url}</a>
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>Documentation:</b> <a href={solution.doc_url} target="_blank" rel="noopener noreferrer">{solution.doc_url}</a>
            </div>
            {solution.video_url && (
              <div style={{ marginBottom: 8 }}>
                <b>Video Demo:</b> <a href={solution.video_url} target="_blank" rel="noopener noreferrer">{solution.video_url}</a>
              </div>
            )}
            {solution.project_url && (
              <div style={{ marginBottom: 8 }}>
                <b>Project Link:</b> <a href={solution.project_url} target="_blank" rel="noopener noreferrer">{solution.project_url}</a>
              </div>
            )}
            <div style={{ marginTop: 14, color: '#666', fontSize: '0.95em' }}>
              <b>Submitted At:</b> {solution.submitted_at ? new Date(solution.submitted_at).toLocaleString('en-IN') : '—'}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
