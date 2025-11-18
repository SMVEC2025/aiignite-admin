import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function MentoringSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("mentoring_sessions")
      .select(
        `
        id,
        team_id,
        team_name,
        mentor_id,
        mentor_name,
        mentor_designation,
        slot_date,
        start_time,
        end_time,
        status,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMsg("Failed to load mentoring sessions.");
    } else {
      setSessions(data || []);
    }

    setLoading(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  }

  function formatSlot(session) {
    const date = session.slot_date ? formatDate(session.slot_date) : "";
    const time =
      session.start_time && session.end_time
        ? `${session.start_time} – ${session.end_time}`
        : "";
    if (!date && !time) return "-";
    return `${date}${date && time ? " | " : ""}${time}`;
  }

  return (
    <div className="admin-mentoring-sessions">
      <div className="ams-header">
        <h2>Mentoring Sessions</h2>
        <button
          type="button"
          className="ams-refresh-btn"
          onClick={fetchSessions}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMsg && <div className="ams-error">{errorMsg}</div>}

      {loading && sessions.length === 0 ? (
        <div className="ams-loading">Loading mentoring sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="ams-empty">No mentoring sessions found.</div>
      ) : (
        <div className="ams-table-wrapper">
          <table className="ams-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Mentor Selected</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Booked On</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr key={session.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="ams-team">
                      <div className="ams-team-name">
                        {session.team_name || "-"}
                      </div>
                      {session.team_id && (
                        <div className="ams-team-id">
                          ID: {session.team_id}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="ams-mentor">
                      <div className="ams-mentor-name">
                        {session.mentor_name || "-"}
                      </div>
                      {session.mentor_designation && (
                        <div className="ams-mentor-designation">
                          {session.mentor_designation}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{formatSlot(session)}</td>
                  <td>{session.status || "-"}</td>
                  <td>{formatDate(session.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MentoringSessions;
