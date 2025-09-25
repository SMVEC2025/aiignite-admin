import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Sessions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    status: 'upcoming',
    youtube_url: '',
    thumbnail_url: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // For editing
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  // Load all sessions
  async function load() {
    setLoading(true);
    setMsg('');
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    setLoading(false);
    if (error) setMsg(error.message);
    else setItems(data || []);
  }

  useEffect(() => { load(); }, []);

  // Create session
  async function handleCreate(e) {
    e.preventDefault();
    setMsg('');
    if (!draft.title.trim() || !draft.date || !draft.time || !draft.youtube_url) {
      setMsg('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('sessions').insert({
      title: draft.title.trim(),
      description: draft.description.trim(),
      date: draft.date,
      time: draft.time,
      status: draft.status,
      youtube_url: draft.youtube_url.trim(),
      thumbnail_url: draft.thumbnail_url.trim(),
      is_published: true,
      created_at: new Date().toISOString()
    });
    setSubmitting(false);
    if (error) setMsg(error.message);
    else {
      setDraft({ title: '', description: '', date: '', time: '', status: 'upcoming', youtube_url: '', thumbnail_url: '' });
      load();
    }
  }

  // Start editing
  function startEdit(s) {
    setEditingId(s.id);
    setEditDraft({
      title: s.title || '',
      description: s.description || '',
      date: s.date || '',
      time: s.time || '',
      status: s.status || 'upcoming',
      youtube_url: s.youtube_url || '',
      thumbnail_url: s.thumbnail_url || ''
    });
  }

  // Save edit
  async function handleEditSave(id) {
    setMsg('');
    if (!editDraft.title.trim() || !editDraft.date || !editDraft.time || !editDraft.youtube_url) {
      setMsg('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('sessions').update({
      title: editDraft.title.trim(),
      description: editDraft.description.trim(),
      date: editDraft.date,
      time: editDraft.time,
      status: editDraft.status,
      youtube_url: editDraft.youtube_url.trim(),
      thumbnail_url: editDraft.thumbnail_url.trim(),
    }).eq('id', id);
    setSubmitting(false);
    if (error) setMsg(error.message);
    else {
      setEditingId(null);
      setEditDraft({});
      load();
    }
  }

  // Cancel editing
  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  // Delete session
  async function handleDelete(id) {
    if (!window.confirm('Delete this session?')) return;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) setMsg(error.message);
    else load();
  }

  return (
    <div className="c_admin-page">
      <h2 className="c_admin-title">Manage Sessions</h2>
      {msg && <div className="c_admin-alert">{msg}</div>}

      {/* Create session */}
      <form className="c_admin-form" onSubmit={handleCreate} style={{ marginBottom: 24 }}>
        <input className="c_admin-input" placeholder="Session Title" value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} required />

        <textarea className="c_admin-input" placeholder="Description" value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} rows={3} />

        <div className="c_admin-row" style={{ gap: 12 }}>
          <input className="c_admin-input" type="date" value={draft.date}
            onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} required style={{ maxWidth: 180 }} />
          <input className="c_admin-input" type="time" value={draft.time}
            onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} required style={{ maxWidth: 140 }} />
          <select className="c_admin-input" value={draft.status}
            onChange={e => setDraft(d => ({ ...d, status: e.target.value }))} style={{ maxWidth: 150 }}>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="past">Past</option>
          </select>
        </div>
        <input className="c_admin-input" placeholder="YouTube URL" value={draft.youtube_url}
          onChange={e => setDraft(d => ({ ...d, youtube_url: e.target.value }))} required />
        <input className="c_admin-input" placeholder="Thumbnail Image URL" value={draft.thumbnail_url}
          onChange={e => setDraft(d => ({ ...d, thumbnail_url: e.target.value }))} />

        <button className="c_admin-btn" disabled={submitting}>{submitting ? 'Adding…' : 'Add Session'}</button>
      </form>

      {/* List all sessions */}
      <div className="c_admin-table">
        <div className="c_admin-thead c_admin-grid" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 160px' }}>
          <div>Title</div>
          <div>Date</div>
          <div>Status</div>
          <div>YouTube URL</div>
          <div>Action</div>
        </div>
        <div className="c_admin-tbody">
          {loading ? <div className="c_admin-dim">Loading…</div> :
            items.length === 0 ? <div className="c_admin-dim" style={{ padding: 12 }}>No sessions found.</div> :
              items.map(s => (
                editingId === s.id ? (
                  <div className="c_admin-grid c_admin-rowline" key={s.id} style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 160px', alignItems: 'center' }}>
                    {/* Edit Mode */}
                    <div>
                      <input className="c_admin-input" value={editDraft.title}
                        onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} />
                      <textarea className="c_admin-input" value={editDraft.description}
                        onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} rows={2} />
                    </div>
                    <div>
                      <input className="c_admin-input" type="date" value={editDraft.date}
                        onChange={e => setEditDraft(d => ({ ...d, date: e.target.value }))} style={{ maxWidth: 120 }} />
                      <input className="c_admin-input" type="time" value={editDraft.time}
                        onChange={e => setEditDraft(d => ({ ...d, time: e.target.value }))} style={{ maxWidth: 90 }} />
                    </div>
                    <div>
                      <select className="c_admin-input" value={editDraft.status}
                        onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))} style={{ maxWidth: 110 }}>
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="past">Past</option>
                      </select>
                    </div>
                    <div>
                      <input className="c_admin-input" value={editDraft.youtube_url}
                        onChange={e => setEditDraft(d => ({ ...d, youtube_url: e.target.value }))} style={{ marginBottom: 6 }} />
                      <input className="c_admin-input" value={editDraft.thumbnail_url}
                        onChange={e => setEditDraft(d => ({ ...d, thumbnail_url: e.target.value }))} placeholder="Thumbnail URL" />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="c_admin-btn" style={{ fontSize: 13 }} onClick={() => handleEditSave(s.id)} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
                      <button className="c_admin-btn c_admin-btn--ghost" type="button" onClick={cancelEdit} style={{ fontSize: 13 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="c_admin-grid c_admin-rowline" key={s.id} style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 160px', alignItems: 'center' }}>
                    {/* Readonly row */}
                    <div>
                      <b>{s.title}</b><br />
                      <small className="c_admin-dim">{s.description}</small>
                    </div>
                    <div>{s.date} <span className="c_admin-dim">{s.time}</span></div>
                    <div><span className="c_admin-pill">{s.status}</span></div>
                    <div>
                      <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" className="c_admin-link">{s.youtube_url}</a>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="c_admin-btn" type="button" style={{ fontSize: 13 }} onClick={() => startEdit(s)}>Edit</button>
                      <button className="c_admin-btn c_admin-btn--danger" type="button" style={{ fontSize: 13 }} onClick={() => handleDelete(s.id)}>Delete</button>
                    </div>
                  </div>
                )
              ))}
        </div>
      </div>
    </div>
  );
}
