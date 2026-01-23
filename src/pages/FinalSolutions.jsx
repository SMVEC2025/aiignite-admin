import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const solutionFields = [
  'id',
  'problem_statement',
  'project_title',
  'project_description',
  'tools_used',
  'github_repo_link',
  'live_link',
  'demo_video_link',
  'created_at',
  'team_id',
  'document_link',
  'is_shortlisted',
];

const hiddenPopupFields = new Set([
  'id',
  'live_link',
  'demo_video_link',
  'github_repo_link',
  'document_link',
  'team_id',
]);

const linkFields = [
  { key: 'live_link', label: 'Open Live Link' },
  { key: 'demo_video_link', label: 'Open Demo Video' },
  { key: 'github_repo_link', label: 'Open GitHub Repo' },
  { key: 'document_link', label: 'Open Document' },
];

const exportExtraFields = [
  'team_members_names',
  'team_members_phones',
  'team_members_cities',
  'team_members_institutions',
];

function formatExportValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toJoinedList(values) {
  const out = values.filter(Boolean);
  if (!out.length) return '';
  return [...new Set(out.map(String))].join(', ');
}

function formatIndiaDateTime(value) {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function renderCell(value) {
  if (value === null || value === undefined || value === '') return <span className="c_admin-dim">—</span>;
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return (
      <a className="c_admin-link" href={value} target="_blank" rel="noreferrer">
        {value}
      </a>
    );
  }
  if (typeof value === 'object') {
    return (
      <span className="c_admin-code">
        {JSON.stringify(value)}
      </span>
    );
  }
  return String(value);
}

function formatTeamId(value) {
  if (!value) return '';
  const s = String(value);
  return s.slice(0, 5);
}

export default function FinalSolutions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState([]);
  const [activeRow, setActiveRow] = useState(null);
  const [shortlistingId, setShortlistingId] = useState(null);
  const [showShortlistedOnly, setShowShortlistedOnly] = useState(false);
  const [exporting, setExporting] = useState('');

  async function load() {
    setLoading(true);
    setMsg('');
    const { data, error } = await supabase
      .from('project_submissions')
      .select(solutionFields.join(','))
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) setMsg(error.message);
    else setRows(data || []);
  }

  async function markShortlist(id) {
    const ok = window.confirm('Mark this submission as shortlisted?');
    if (!ok) return;
    setMsg('');
    setShortlistingId(id);
    const { error } = await supabase
      .from('project_submissions')
      .update({ is_shortlisted: true })
      .eq('id', id);
    setShortlistingId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, is_shortlisted: true } : row)));
  }

  async function undoShortlist(id) {
    const ok = window.confirm('Remove this submission from shortlist?');
    if (!ok) return;
    setMsg('');
    setShortlistingId(id);
    const { error } = await supabase
      .from('project_submissions')
      .update({ is_shortlisted: false })
      .eq('id', id);
    setShortlistingId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, is_shortlisted: false } : row)));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setSelected((prev) => prev.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  const visibleRows = showShortlistedOnly ? rows.filter((row) => row.is_shortlisted) : rows;

  const allSelected = useMemo(
    () => visibleRows.length > 0 && visibleRows.every((row) => selected.includes(row.id)),
    [visibleRows, selected]
  );

  function toggleAll(checked) {
    const visibleIds = visibleRows.map((row) => row.id);
    if (checked) {
      setSelected((prev) => [...new Set([...prev, ...visibleIds])]);
    } else {
      setSelected((prev) => prev.filter((id) => !visibleIds.includes(id)));
    }
  }

  function toggleOne(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.includes(row.id)),
    [rows, selected]
  );

  async function exportSelected(format) {
    if (selectedRows.length === 0) return;
    setExporting(format);
    setMsg('');
    try {
      const teamIds = [...new Set(selectedRows.map((r) => r.team_id).filter(Boolean))];
      let teamMap = new Map();
      if (teamIds.length) {
        const { data, error } = await supabase
          .from('team_members')
          .select('team_id, member_name, member_phone, city_name, institute_name')
          .in('team_id', teamIds);
        if (error) throw error;
        teamMap = data.reduce((acc, row) => {
          if (!acc.has(row.team_id)) acc.set(row.team_id, []);
          acc.get(row.team_id).push(row);
          return acc;
        }, new Map());
      }

      const exportFields = [...solutionFields, ...exportExtraFields];
      const pdfFields = [
        'team_id',
        'team_members_names',
        'team_members_phones',
        'team_members_cities',
        'team_members_institutions',
      ];
      const exportRows = selectedRows.map((row) => {
        const members = teamMap.get(row.team_id) || [];
        const withMembers = {
          ...row,
          team_members_names: toJoinedList(members.map((m) => m.member_name)),
          team_members_phones: toJoinedList(members.map((m) => m.member_phone)),
          team_members_cities: toJoinedList(members.map((m) => m.city_name)),
          team_members_institutions: toJoinedList(members.map((m) => m.institute_name)),
        };
        return exportFields.reduce((acc, field) => {
          acc[field] = formatExportValue(withMembers[field]);
          return acc;
        }, {});
      });

      if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Final Solutions');
        XLSX.writeFile(workbook, 'final-solutions-selected.xlsx');
        return;
      }
      if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const head = [pdfFields.map((f) => f.replace(/_/g, ' '))];
        const body = exportRows.map((row) => pdfFields.map((f) => formatExportValue(row[f])));
        doc.text('Final Solutions (Selected)', 40, 40);
        autoTable(doc, {
          head,
          body,
          startY: 60,
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [245, 247, 248], textColor: 20 },
        });
        doc.save('final-solutions-selected.pdf');
      }
    } catch (err) {
      setMsg(err?.message || 'Failed to export.');
    } finally {
      setExporting('');
    }
  }

  return (
    <div className="c_admin-page c_admin-page--solutions">
      <div className="c_admin-row c_admin-row--space">
        <div>
          <h2 className="c_admin-title">Final Solutions</h2>
          <div className="c_admin-dim">Project submissions from Supabase.</div>
        </div>
        <div className="c_admin-row" style={{ gap: 8 }}>
          <button
            className="c_admin-btn c_admin-btn--ghost"
            onClick={() => setShowShortlistedOnly((prev) => !prev)}
          >
            {showShortlistedOnly ? 'Show all' : 'View only shortlisted'}
          </button>
          <button className="c_admin-btn c_admin-btn--ghost" onClick={load}>Reload</button>
          <span className="c_admin-dim" style={{ marginLeft: 8 }}>
            Selected: {selected.filter((id) => visibleRows.some((r) => r.id === id)).length}
          </span>
          <button
            className="c_admin-btn c_admin-btn--ghost"
            onClick={() => exportSelected('xlsx')}
            disabled={selected.length === 0 || exporting}
          >
            {exporting === 'xlsx' ? 'Exportingâ€¦' : 'Export Excel'}
          </button>
          <button
            className="c_admin-btn c_admin-btn--ghost"
            onClick={() => exportSelected('pdf')}
            disabled={selected.length === 0 || exporting}
          >
            {exporting === 'pdf' ? 'Exportingâ€¦' : 'Export PDF'}
          </button>
        </div>
      </div>

      {msg && <div className="c_admin-alert">{msg}</div>}

      <div className="c_admin-table-wrap">
        {loading ? (
          <div className="c_admin-dim" style={{ padding: 14 }}>Loading…</div>
        ) : visibleRows.length === 0 ? (
          <div className="c_admin-dim" style={{ padding: 14 }}>No submissions found.</div>
        ) : (
          <table className="c_admin-table c_admin-table--clean">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th>team id</th>
                <th>project title</th>
                <th>created at</th>
                <th>view solution</th>
                <th>team members</th>
                <th>shortlist</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => (
                <tr key={row.id ?? idx} className={row.is_shortlisted ? 'is-shortlisted' : undefined}>
                  <td className="c_admin-cell">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleOne(row.id)}
                    />
                  </td>
                  <td className="c_admin-cell">{renderCell(formatTeamId(row.team_id))}</td>
                  <td className="c_admin-cell">{renderCell(row.project_title)}</td>
                  <td className="c_admin-cell">
                    {renderCell(formatIndiaDateTime(row.created_at))}
                  </td>
                  <td className="c_admin-cell c_admin-cell--center">
                    <button className="c_admin-btn c_admin-btn--ghost" onClick={() => setActiveRow(row)}>
                      View solution
                    </button>
                  </td>
                  <td className="c_admin-cell c_admin-cell--center">
                    {row.team_id ? (
                      <Link
                        className="c_admin-btn c_admin-btn--ghost"
                        to={`/teams/${encodeURIComponent(row.team_id)}`}
                      >
                        Team members
                      </Link>
                    ) : (
                      <span className="c_admin-dim">â€”</span>
                    )}
                  </td>
                  <td className="c_admin-cell c_admin-cell--center">
                    {row.is_shortlisted ? (
                      <button
                        className="c_admin-btn c_admin-btn--ghost"
                        onClick={() => undoShortlist(row.id)}
                        disabled={shortlistingId === row.id}
                      >
                        {shortlistingId === row.id ? 'Undoing…' : 'Undo shortlist'}
                      </button>
                    ) : (
                      <button
                        className="c_admin-btn"
                        onClick={() => markShortlist(row.id)}
                        disabled={shortlistingId === row.id}
                      >
                        {shortlistingId === row.id ? 'Marking…' : 'Mark as shortlist'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activeRow && (
        <div className="c_modal-backdrop" onClick={() => setActiveRow(null)}>
          <div className="c_modal" onClick={(e) => e.stopPropagation()}>
            <div className="c_modal-head">
              <div>
                <div className="c_modal-title">Solution Details</div>
                <div className="c_modal-sub">Team {activeRow.team_id}</div>
              </div>
              <button className="c_admin-btn c_admin-btn--ghost" onClick={() => setActiveRow(null)}>
                Close
              </button>
            </div>
            <div className="c_modal-main">
              <div className="c_modal-detail__title">{activeRow.project_title || 'Untitled'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 14px' }}>
                {linkFields.map(({ key, label }) => (
                  activeRow[key] ? (
                    <a
                      key={key}
                      className="c_admin-btn c_admin-btn--ghost"
                      href={activeRow[key]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {label}
                    </a>
                  ) : null
                ))}
              </div>
              <div className="c_modal-kv">
                {solutionFields
                  .filter((field) => !hiddenPopupFields.has(field))
                  .map((field) => (
                    <div className="c_modal-kv__row" key={field}>
                      <div className="c_modal-kv__k">{field.replace(/_/g, ' ')}</div>
                      <div className="c_modal-kv__v">
                        {field === 'created_at'
                          ? renderCell(formatIndiaDateTime(activeRow[field]))
                          : renderCell(activeRow[field])}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
