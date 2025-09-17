// src/pages/MemberDetail.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function MemberDetail() {
  const { teamId, memberId } = useParams();
  const nav = useNavigate();

  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fmt = (dt) => { try { return new Date(dt).toLocaleString('en-IN'); } catch { return dt; } };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg('');
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          member_user_id, team_id, member_name, member_email, member_phone,
          age, gender, is_student, institute_name, course, current_year, cgpa,
          preferred_track, programs_known, ai_ml_experience_level,
          previous_projects, problem_statement_preference, motivation, need_accommodation,
          state_name, city_name, area_name, pincode,
          dob, joined_at
        `)
        .eq('team_id', teamId)
        .eq('member_user_id', memberId)
        .maybeSingle();
      setLoading(false);
      if (error) { setMsg(error.message); return; }
      setM(data);
    })();
  }, [teamId, memberId]);

  return (
    <div className="c_admin-page">
      <div className="c_admin-row">
        <button className="c_admin-btn c_admin-btn--ghost" onClick={() => nav(-1)}>← Back</button>
        <div className="c_admin-grow" />
        <Link to={`/teams/${teamId}`} className="c_admin-btn c_admin-btn--ghost">Team</Link>
        <Link to="/teams" className="c_admin-btn c_admin-btn--ghost">All Teams</Link>
      </div>

      {msg && <div className="c_admin-alert">{msg}</div>}

      <h2 className="c_admin-title">Member details</h2>

      {loading ? (
        <p className="c_admin-dim">Loading…</p>
      ) : !m ? (
        <p className="c_admin-dim">Member not found.</p>
      ) : (
        <div className="c_admin-table">
          <div className="c_admin-thead">
            <div>Field</div><div>Value</div>
          </div>
          <div className="c_admin-tbody">
            <Row k="Name" v={m.member_name} />
            <Row k="Email" v={m.member_email} />
            <Row k="Phone" v={m.member_phone} />
            <Row k="Team ID" v={m.team_id} />
            <Row k="User ID" v={m.member_user_id} />
            <Row k="Joined" v={fmt(m.joined_at)} />

            <Row k="Age" v={m.age ?? '—'} />
            <Row k="Gender" v={m.gender ?? '—'} />
            <Row k="DOB" v={m.dob ?? '—'} />
            <Row k="Student" v={m.is_student ? `Yes${m.institute_name ? ` (${m.institute_name})` : ''}` : 'No'} />
            <Row k="Course" v={m.course ?? '—'} />
            <Row k="Current Year" v={m.current_year ?? '—'} />
            <Row k="CGPA" v={m.cgpa ?? '—'} />
            <Row k="Preferred Track" v={m.preferred_track ?? '—'} />
            <Row k="AI/ML Experience" v={m.ai_ml_experience_level ?? '—'} />
            <Row k="Programs Known" v={Array.isArray(m.programs_known) ? m.programs_known.join(', ') : (m.programs_known ?? '—')} />
            <Row k="Previous Projects" v={m.previous_projects ?? '—'} />
            <Row k="Problem Statement Pref." v={m.problem_statement_preference ?? '—'} />
            <Row k="Motivation" v={m.motivation ?? '—'} />
            <Row k="Need Accommodation" v={m.need_accommodation ? 'Yes' : 'No'} />

            <Row k="State" v={m.state_name ?? '—'} />
            <Row k="City" v={m.city_name ?? '—'} />
            <Row k="Area" v={m.area_name ?? '—'} />
            <Row k="Pincode" v={m.pincode ?? '—'} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="c_admin-rowline">
      <div><b>{k}</b></div>
      <div>{v}</div>
    </div>
  );
}
