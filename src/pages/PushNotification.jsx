import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminBroadcast() {
  const [fields, setFields] = useState({
    title: '',
    body: '',
    url: '',
    tag: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Helper for input changes
  function onChange(e) {
    const { name, value } = e.target;
    setFields(f => ({ ...f, [name]: value }));
  }

  async function send(e) {
    e.preventDefault();
    setMsg('');
    if (!fields.title.trim() || !fields.body.trim()) {
      setMsg('Title and message are required.');
      return;
    }
    setSubmitting(true);

    // (optional) ensure signed in as admin (else skip this check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMsg('Sign in first.');
      setSubmitting(false);
      return;
    }

    // Call edge function
    const { data, error } = await supabase.functions.invoke('notify-all', {
      body: {
        title: fields.title.trim(),
        body: fields.body.trim(),
        data: fields.url ? { url: fields.url.trim() } : {},
        tag: fields.tag.trim() || undefined
      }
    });
    setSubmitting(false);
    if (error) setMsg(error.message);
    else setMsg(`Sent: ${data.sent}, Failed: ${data.failed}, Removed: ${data.removed}`);
  }

  return (
    <div className="c_admin-page" style={{ minHeight: "80vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div className="c_admin-card" style={{ maxWidth: 500, width: '100%' }}>
        <h2 className="c_admin-title"> Push Notification</h2>
        <form className="c_admin-form" onSubmit={send} autoComplete="off" style={{ gap: 18 }}>
          <label className="c_admin-label">
            Title <span style={{ color: "#e94444" }}>*</span>
          </label>
          <input
            className="c_admin-input"
            name="title"
            maxLength={100}
            value={fields.title}
            onChange={onChange}
            placeholder="e.g. SMVEC Update"
            required
          />

          <label className="c_admin-label">
            Message <span style={{ color: "#e94444" }}>*</span>
          </label>
          <textarea
            className="c_admin-input"
            name="body"
            maxLength={280}
            value={fields.body}
            onChange={onChange}
            placeholder="Your notification message"
            rows={3}
            required
          />

          <label className="c_admin-label">URL to open (optional)</label>
          <input
            className="c_admin-input"
            name="url"
            value={fields.url}
            onChange={onChange}
            placeholder="/announcements or https://..."
          />

          <label className="c_admin-label">
            Tag (optional, for grouping/updating notifications)
          </label>
          <input
            className="c_admin-input"
            name="tag"
            value={fields.tag}
            onChange={onChange}
            placeholder="e.g. annc-1"
          />

          <button className="c_admin-btn" disabled={submitting}>
            {submitting ? "Sending…" : "Send Notification"}
          </button>
        </form>
      </div>
    </div>
  );
}
