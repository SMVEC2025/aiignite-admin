// src/pages/AnnouncementsAdmin.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AnnouncementsAdmin() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({ title: '', body: '', is_published: true });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, is_published, posted_at, updated_at')
      .order('posted_at', { ascending: false });
    setLoading(false);
    if (error) return setMsg(error.message);
    setItems(data || []);
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setMsg('');
    if (!draft.title.trim() || !draft.body.trim()) return setMsg('Title and message are required.');
    const { error } = await supabase.rpc('post_announcement', {
      p_title: draft.title.trim(), p_body: draft.body, p_is_published: draft.is_published
    });
    if (error) return setMsg(error.message);
    setDraft({ title: '', body: '', is_published: true });
    load();
  }
  async function update(item) {
    const { error } = await supabase.rpc('update_announcement', {
      p_id: item.id, p_title: item.title, p_body: item.body, p_is_published: item.is_published
    });
    if (error) return setMsg(error.message);
    load();
  }
  async function remove(id) {
    if (!confirm('Delete announcement?')) return;
    const { error } = await supabase.rpc('delete_announcement', { p_id: id });
    if (error) return setMsg(error.message);
    setItems(list => list.filter(x => x.id !== id));
  }

  function fmt(dt){ try{ return new Date(dt).toLocaleString('en-IN',{dateStyle:'medium', timeStyle:'short'});}catch{return dt;} }

  return (
    <div className="c_admin-page">
      <h2 className="c_admin-title">Announcements</h2>
      {msg && <div className="c_admin-alert">{msg}</div>}

      <form className="c_admin-form" onSubmit={create} style={{marginBottom:12}}>
        <input className="c_admin-input" placeholder="Title" value={draft.title}
               onChange={e=>setDraft(d=>({...d,title:e.target.value}))} required />
        <textarea className="c_admin-input" placeholder="Message" rows={4} value={draft.body}
                  onChange={e=>setDraft(d=>({...d,body:e.target.value}))} required />
        <label className="c_admin-check">
          <input type="checkbox" checked={draft.is_published}
                 onChange={e=>setDraft(d=>({...d,is_published:e.target.checked}))}/>
          Published
        </label>
        <button className="c_admin-btn">Post</button>
      </form>

      {loading ? <p className="c_admin-dim">Loading…</p> : (
        <ul className="c_admin-list">
          {items.map(it => <Row key={it.id} item={it} onSave={update} onDelete={remove} fmt={fmt} />)}
        </ul>
      )}
    </div>
  );
}

function Row({ item, onSave, onDelete, fmt }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [pub, setPub] = useState(item.is_published);

  function cancel(){ setTitle(item.title); setBody(item.body); setPub(item.is_published); setEditing(false); }
  async function save(){ await onSave({ id:item.id, title, body, is_published: pub }); setEditing(false); }

  return (
    <li className={`c_admin-item ${!item.is_published?'is-unpub':''}`}>
      {!editing ? (
        <>
          <div className="c_admin-item__head">
            <h4 className="c_admin-item__title">{item.title}</h4>
            <time className="c_admin-item__time">{fmt(item.posted_at)}</time>
          </div>
          <p className="c_admin-item__body">{item.body}</p>
          <div className="c_admin-row">
            <span className={`c_admin-pill ${item.is_published?'ok':'off'}`}>{item.is_published?'Published':'Unpublished'}</span>
            <span className="c_admin-dim">Updated {fmt(item.updated_at)}</span>
            <div className="c_admin-grow" />
            <button className="c_admin-btn c_admin-btn--ghost" onClick={()=>setEditing(true)}>Edit</button>
            <button className="c_admin-btn c_admin-btn--danger" onClick={()=>onDelete(item.id)}>Delete</button>
          </div>
        </>
      ) : (
        <>
          <input className="c_admin-input" value={title} onChange={e=>setTitle(e.target.value)} />
          <textarea className="c_admin-input" rows={3} value={body} onChange={e=>setBody(e.target.value)} />
          <label className="c_admin-check">
            <input type="checkbox" checked={pub} onChange={e=>setPub(e.target.checked)} />
            Published
          </label>
          <div className="c_admin-row">
            <button className="c_admin-btn" onClick={save}>Save</button>
            <button className="c_admin-btn c_admin-btn--ghost" onClick={cancel}>Cancel</button>
          </div>
        </>
      )}
    </li>
  );
}
