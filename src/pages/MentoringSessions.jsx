import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import axios from "axios";
function MentoringSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // For editing meet_url
  const [meetUrlsById, setMeetUrlsById] = useState({});
  const [savingMeetForId, setSavingMeetForId] = useState(null);

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
        mentor_id,
        mentor_name,
        mentor_designation,
        slot_date,
        start_time,
        end_time,
        status,
        meet_url,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMsg("Failed to load mentoring sessions.");
      setSessions([]);
    } else {
      setSessions(data || []);
      // Initialize local meet_url state per session
      const map = {};
      (data || []).forEach((s) => {
        map[s.id] = s.meet_url || "";
      });
      setMeetUrlsById(map);
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

  function handleMeetUrlChange(sessionId, value) {
    setMeetUrlsById((prev) => ({
      ...prev,
      [sessionId]: value,
    }));
  }

  async function handleSaveMeetUrl(session) {
    const sessionId = session.id;
    const teamId = session.team_id;
    const mentorId = session.mentor_id;
    const meetUrl = (meetUrlsById[sessionId] || "").trim();

    if (!meetUrl) {
      alert("Please enter a valid Google Meet URL before saving.");
      return;
    }

    setSavingMeetForId(sessionId);
    setErrorMsg("");

    try {
      // 1) Update the meet_url in mentoring_sessions
      const { error: updateError } = await supabase
        .from("mentoring_sessions")
        .update({ meet_url: meetUrl })
        .eq("id", sessionId);

      if (updateError) {
        console.error(updateError);
        setErrorMsg("Failed to update Meet link for this session.");
        return;
      }

      // 2) Fetch team member emails by team_id
      let teamMemberEmails = [];
      if (teamId) {
        const { data: teamMembers, error: teamError } = await supabase
          .from("team_members")
          .select("member_email")
          .eq("team_id", teamId);

        if (teamError) {
          console.error(teamError);
        } else if (teamMembers && teamMembers.length > 0) {
          console.log(teamMembers)
          teamMemberEmails = teamMembers
            .map((m) => m.member_email)
            .filter((member_email) => !!member_email);
        }
      }

      // 3) Fetch mentor email by mentor_id
      let mentorEmail = null;
      if (mentorId) {
        const { data: mentor, error: mentorError } = await supabase
          .from("mentors")
          .select("email")
          .eq("id", mentorId)
          .single();

        if (mentorError) {
          console.error(mentorError);
        } else if (mentor && mentor.email) {
          mentorEmail = mentor.email;
        }
      }

      // 4) Build email list
      const allEmails = [
        ...teamMemberEmails,
        mentorEmail,
      ].filter(Boolean);
      // 5) Invoke Supabase Edge Function to send emails (you must implement this function)
      if (allEmails.length > 0) {
        const { error: fnError } = await axios.post("https://agribackend.vercel.app/api/send-email-hackathon",
          {
            emails: allEmails,
            meet_url: meetUrl,
            team_id: teamId,
            mentor_id: mentorId,
            mentor_name: session.mentor_name,
            slot_date: session.slot_date,
            start_time: session.start_time,
            end_time: session.end_time,
          }
        );

        if (fnError) {
          console.error(fnError);
          // We don't block UI on email failure, but we show a soft error
          setErrorMsg(
            "Meet link updated, but failed to send some email notifications."
          );
        } else {
          // Optional: show success feedback
          // alert("Meet link updated and emails sent successfully.");
          alert('Mail sent successfully')
        }
      }

      // 6) Refresh sessions to keep UI in sync
      await fetchSessions();
    } finally {
      setSavingMeetForId(null);
    }
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
                <th>Meet Link</th>
                <th>Booked On</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr key={session.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="ams-team">

                      {session.team_id && (
                        <div className="ams-team-id">
                          {session.team_id}
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
                  <td>
                    <div className="ams-meet-url">
                      <input
                        type="url"
                        placeholder="Paste Google Meet link"
                        value={meetUrlsById[session.id] || ""}
                        onChange={(e) =>
                          handleMeetUrlChange(session.id, e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="ams-meet-save-btn"
                        onClick={() => handleSaveMeetUrl(session)}
                        disabled={savingMeetForId === session.id}
                      >
                        {savingMeetForId === session.id
                          ? "Saving..."
                          : session.meet_url
                            ? "Update"
                            : "Save"}
                      </button>
                    </div>
                  </td>
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
