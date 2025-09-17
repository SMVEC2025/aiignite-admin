import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function TeamDetail() {
  const { teamId } = useParams();
  const nav = useNavigate();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');

  const fmt = (dt) => { try { return new Date(dt).toLocaleString('en-IN'); } catch { return dt; } };

  async function loadTeam() {
    setLoadingTeam(true);
    setMsg('');
    const { data, error } = await supabase
      .from('teams')
      .select('id, created_at')
      .eq('id', teamId)
      .single();
    setLoadingTeam(false);
    if (error) { setMsg(error.message); return; }
    setTeam(data);
  }

  async function loadMembers() {
    setLoadingMembers(true);
    setMsg('');
    let query = supabase
      .from('team_members')
      .select(`
        member_user_id, team_id, member_name, member_email, member_phone,
        state_name, city_name, area_name, pincode,
        is_student, institute_name, age, gender, course, current_year, cgpa,
        preferred_track, programs_known, ai_ml_experience_level, previous_projects,
        problem_statement_preference, motivation, need_accommodation,
        joined_at
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

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
    setLoadingMembers(false);
    if (error) { setMsg(error.message); return; }
    setMembers(data || []);
  }

  useEffect(() => {
    loadTeam();
    loadMembers();
    // eslint-disable-next-line
  }, [teamId]);

  return (
    <div className="c_admin-page">
      <div className="c_admin-row">
        <button className="c_admin-btn c_admin-btn--ghost" onClick={() => nav(-1)}>← Back</button>
        <div className="c_admin-grow" />
        <Link to="/teams" className="c_admin-btn c_admin-btn--ghost">All Teams</Link>
      </div>

      {msg && <div className="c_admin-alert">{msg}</div>}

      <h2 className="c_admin-title">Team</h2>

      {loadingTeam ? (
        <p className="c_admin-dim">Loading team…</p>
      ) : !team ? (
        <p className="c_admin-dim">Team not found.</p>
      ) : (
        <div className="c_admin-table" style={{ marginBottom: 12 }}>
          <div className="c_admin-thead">
            <div>Team ID</div><div>Created</div>
          </div>
          <div className="c_admin-tbody">
            <div className="c_admin-rowline">
              <div><code>{team.id}</code></div>
              <div>{fmt(team.created_at)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="c_admin-row" style={{ marginTop: 8 }}>
        <h3 className="c_admin-title">Members</h3>
        <div className="c_admin-grow" />
        <input
          className="c_admin-input"
          placeholder="Search member name/email/phone/state/city/institute/track"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadMembers()}
          style={{ maxWidth: 420 }}
        />
        <button className="c_admin-btn" onClick={loadMembers}>Search</button>
      </div>

      {loadingMembers ? (
        <p className="c_admin-dim">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="c_admin-dim">No members found for this team.</p>
      ) : (
        <div className="c_admin-table">
          <div className="c_admin-thead">
            <div>Name</div><div>Email</div><div>Phone</div><div>Location</div>
            <div>Student</div><div>Track</div><div>Joined</div><div>Action</div>
          </div>
          <div className="c_admin-tbody">
            {members.map(m => (
              <div key={m.member_user_id} className="c_admin-rowline">
                <div><b>{m.member_name}</b></div>
                <div>{m.member_email}</div>
                <div>{m.member_phone}</div>
                <div>{[m.city_name, m.state_name].filter(Boolean).join(', ')}</div>
                <div>{m.is_student ? `Yes${m.institute_name ? ` (${m.institute_name})` : ''}` : 'No'}</div>
                <div>{m.preferred_track || '—'}</div>
                <div>{fmt(m.joined_at)}</div>
                <div>
                  <Link
                    to={`/teams/${teamId}/members/${encodeURIComponent(m.member_user_id)}`}
                    className="c_admin-btn c_admin-btn--ghost"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
