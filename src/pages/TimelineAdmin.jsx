// src/pages/TimelineAdmin.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const STATUS_OPTIONS = ['upcoming', 'past'];

export default function TimelineAdmin() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({
    status: 'upcoming',
    title: '',
    subtitle: '',
    display_time: '',
    start_at: ''         // datetime-local value
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('aiignite_timeline')
      .select('id, status, title, subtitle, display_time, start_at, created_at')
      .order('start_at', { ascending: true, nullsFirst: false });
    setLoading(false);
    if (error) return setMsg(error.message);

    const list = data || [];
    const upcoming = list
      .filter(x => (x.status || '').toLowerCase() === 'upcoming')
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    const past = list
      .filter(x => (x.status || '').toLowerCase() !== 'upcoming')
      .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

    setItems([...upcoming, ...past]);
  }

  useEffect(() => { load(); }, []);

  function validStatus(s) {
    return STATUS_OPTIONS.includes(String(s || '').toLowerCase());
  }

  // Convert DB timestamptz -> <input type="datetime-local"> value
  function tsToLocalInput(v) {
    if (!v) return '';
    try {
      const d = new Date(v);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  // Convert datetime-local -> ISO string (UTC) for DB
  function localInputToISO(v) {
    if (!v) return null;
    try {
      // v like "2025-08-20T13:30"
      const iso = new Date(v).toISOString(); // converts local time to UTC ISO (e.g., 2025-08-20T08:00:00.000Z)
      return iso;
    } catch {
      return null;
    }
  }

  async function create(e) {
    e.preventDefault();
    setMsg('');
    if (!draft.title.trim()) return setMsg('Title is required.');
    if (!validStatus(draft.status)) return setMsg('Status must be upcoming or past.');
    if (!draft.start_at) return setMsg('Starts at is required.');

    const payload = {
      status: draft.status.toLowerCase(),
      title: draft.title.trim(),
      subtitle: draft.subtitle || '',
      display_time: draft.display_time || '',
      start_at: localInputToISO(draft.start_at) // timestamptz
    };

    const { error } = await supabase.from('aiignite_timeline').insert(payload);
    if (error) return setMsg(error.message);

    setDraft({ status: 'upcoming', title: '', subtitle: '', display_time: '', start_at: '' });
    load();
  }

  async function update(item) {
    if (!item.title?.trim()) { setMsg('Title is required.'); return; }
    if (!validStatus(item.status)) { setMsg('Status must be upcoming or past.'); return; }
    if (!item.start_at) { setMsg('Starts at is required.'); return; }

    const { error } = await supabase
      .from('aiignite_timeline')
      .update({
        status: item.status.toLowerCase(),
        title: item.title.trim(),
        subtitle: item.subtitle || '',
        display_time: item.display_time || '',
        start_at: item.start_at // must be ISO string
      })
      .eq('id', item.id);

    if (error) return setMsg(error.message);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this timeline item?')) return;
    const { error } = await supabase.from('aiignite_timeline').delete().eq('id', id);
    if (error) return setMsg(error.message);
    setItems(list => list.filter(x => x.id !== id));
  }

  function fmtUpdated(v) {
    try { return new Date(v).toLocaleString('en-IN'); } catch { return v || ''; }
  }
  function fmtDisplayTime(v) {
    return (v || '').trim() || '—';
  }
  function fmtStartsAt(v) {
    try { return new Date(v).toLocaleString('en-IN'); } catch { return v || ''; }
  }

  return (
    <div className="c_admin-page">
      <h2 className="c_admin-title">Timeline</h2>
      {msg && <div className="c_admin-alert">{msg}</div>}

      {/* Create new */}
      <form className="c_admin-form" onSubmit={create} style={{ marginBottom: 12 }}>
        <label className="c_admin-label">Status</label>
        <select
          className="c_admin-input"
          value={draft.status}
          onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
          required
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          className="c_admin-input"
          placeholder="Title"
          value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          required
        />

        <input
          className="c_admin-input"
          placeholder="Subtitle (optional)"
          value={draft.subtitle}
          onChange={e => setDraft(d => ({ ...d, subtitle: e.target.value }))}
        />

        <input
          className="c_admin-input"
          placeholder="Display time (e.g., 7:00 PM IST)"
          value={draft.display_time}
          onChange={e => setDraft(d => ({ ...d, display_time: e.target.value }))}
        />

        <label className="c_admin-label">Starts at</label>
        <input
          className="c_admin-input"
          type="datetime-local"
          value={draft.start_at}
          onChange={e => setDraft(d => ({ ...d, start_at: e.target.value }))}
          required
        />

        <button className="c_admin-btn">Add item</button>
      </form>

      {/* List */}
      {loading ? <p className="c_admin-dim">Loading…</p> : (
        <ul className="c_admin-list">
          {items.map(it => (
            <Row
              key={it.id}
              item={it}
              onSave={update}
              onDelete={remove}
              tsToLocalInput={tsToLocalInput}
              localInputToISO={localInputToISO}
              fmtUpdated={fmtUpdated}
              fmtDisplayTime={fmtDisplayTime}
              fmtStartsAt={fmtStartsAt}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ item, onSave, onDelete, tsToLocalInput, localInputToISO, fmtUpdated, fmtDisplayTime, fmtStartsAt }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(item.status || 'upcoming');
  const [title, setTitle] = useState(item.title || '');
  const [subtitle, setSubtitle] = useState(item.subtitle || '');
  const [displayTime, setDisplayTime] = useState(item.display_time || '');
  const [startsAtLocal, setStartsAtLocal] = useState(tsToLocalInput(item.start_at)); // datetime-local

  function cancel() {
    setStatus(item.status || 'upcoming');
    setTitle(item.title || '');
    setSubtitle(item.subtitle || '');
    setDisplayTime(item.display_time || '');
    setStartsAtLocal(tsToLocalInput(item.start_at));
    setEditing(false);
  }

  async function save() {
    await onSave({
      id: item.id,
      status,
      title,
      subtitle,
      display_time: displayTime,
      start_at: localInputToISO(startsAtLocal) // ISO string for DB (timestamptz)
    });
    setEditing(false);
  }

  return (
    <li className="c_admin-item">
      {!editing ? (
        <>
          <div className="c_admin-item__head">
            <h4 className="c_admin-item__title">{item.title}</h4>
            <span className="c_admin-item__time">{fmtDisplayTime(item.display_time)}</span>
          </div>
          {item.subtitle && <p className="c_admin-item__body">{item.subtitle}</p>}
          <div className="c_admin-row">
            <span className={`c_admin-pill ${status === 'upcoming' ? 'ok' : 'off'}`}>{status}</span>
            <span className="c_admin-dim">Starts {fmtStartsAt(item.start_at)}</span>
            <span className="c_admin-dim">Updated {fmtUpdated(item.created_at)}</span>
            <div className="c_admin-grow" />
            <button className="c_admin-btn c_admin-btn--ghost" onClick={() => setEditing(true)}>Edit</button>
            <button className="c_admin-btn c_admin-btn--danger" onClick={() => onDelete(item.id)}>Delete</button>
          </div>
        </>
      ) : (
        <>
          <label className="c_admin-label">Status</label>
          <select className="c_admin-input" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input className="c_admin-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
          <input className="c_admin-input" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtitle" />
          <input className="c_admin-input" value={displayTime} onChange={e => setDisplayTime(e.target.value)} placeholder="Display time (e.g., 7:00 PM IST)" />

          <label className="c_admin-label">Starts at</label>
          <input
            className="c_admin-input"
            type="datetime-local"
            value={startsAtLocal}
            onChange={e => setStartsAtLocal(e.target.value)}
          />

          <div className="c_admin-row">
            <button className="c_admin-btn" onClick={save}>Save</button>
            <button className="c_admin-btn c_admin-btn--ghost" onClick={cancel}>Cancel</button>
          </div>
        </>
      )}
    </li>
  );
}
