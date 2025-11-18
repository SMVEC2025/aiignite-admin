// Mentors.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function Mentors() {
  const [mentors, setMentors] = useState([]);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [slots, setSlots] = useState([
    { id: 1, slot_date: "", start_time: "", end_time: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // NEW: for adding slots to existing mentors
  const [newSlotsByMentor, setNewSlotsByMentor] = useState({});
  // NEW: for editing/deleting slots
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editingSlotValues, setEditingSlotValues] = useState({
    slot_date: "",
    start_time: "",
    end_time: "",
  });
  const [slotSaving, setSlotSaving] = useState(false);

  useEffect(() => {
    fetchMentors();
  }, []);

  async function fetchMentors() {
    const { data, error } = await supabase
      .from("mentors")
      .select("id, name, designation, mentor_slots(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMsg("Failed to load mentors.");
      return;
    }

    setErrorMsg("");
    setMentors(data || []);
  }

  function addSlotRow() {
    setSlots((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        slot_date: "",
        start_time: "",
        end_time: "",
      },
    ]);
  }

  function removeSlotRow(rowId) {
    setSlots((prev) => prev.filter((s) => s.id !== rowId));
  }

  function updateSlot(rowId, field, value) {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === rowId ? { ...slot, [field]: value } : slot
      )
    );
  }

  async function handleCreateMentor(e) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter mentor name.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 1) Create mentor
      const { data: mentor, error: mentorError } = await supabase
        .from("mentors")
        .insert([{ name, designation }])
        .select()
        .single();

      if (mentorError || !mentor) {
        console.error(mentorError);
        setErrorMsg("Failed to create mentor.");
        setLoading(false);
        return;
      }

      // 2) Prepare valid slots (allow multiple slots per day)
      const validSlots = slots.filter(
        (s) => s.slot_date && s.start_time && s.end_time
      );

      if (validSlots.length > 0) {
        const { error: slotError } = await supabase
          .from("mentor_slots")
          .insert(
            validSlots.map((s) => ({
              mentor_id: mentor.id,
              slot_date: s.slot_date,
              start_time: s.start_time,
              end_time: s.end_time,
              is_booked: false,
            }))
          );

        if (slotError) {
          console.error(slotError);
          setErrorMsg(
            "Mentor created but failed to save slots. Check column names in mentor_slots."
          );
        }
      }

      // 3) Reset form & reload list
      setName("");
      setDesignation("");
      setSlots([{ id: 1, slot_date: "", start_time: "", end_time: "" }]);
      await fetchMentors();
      alert("Mentor and slots saved successfully ✅");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return dateStr; // already YYYY-MM-DD
  }

  /* ---------- NEW: ADD SLOT FOR EXISTING MENTOR ---------- */

  function handleNewSlotChange(mentorId, field, value) {
    setNewSlotsByMentor((prev) => ({
      ...prev,
      [mentorId]: {
        ...(prev[mentorId] || {
          slot_date: "",
          start_time: "",
          end_time: "",
        }),
        [field]: value,
      },
    }));
  }

  async function handleAddSlotForMentor(mentorId) {
    const slot = newSlotsByMentor[mentorId] || {};
    if (!slot.slot_date || !slot.start_time || !slot.end_time) {
      alert("Please fill date, start time and end time.");
      return;
    }

    setSlotSaving(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.from("mentor_slots").insert([
        {
          mentor_id: mentorId,
          slot_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_booked: false,
        },
      ]);

      if (error) {
        console.error(error);
        setErrorMsg("Failed to add slot.");
        return;
      }

      // clear form for that mentor
      setNewSlotsByMentor((prev) => ({
        ...prev,
        [mentorId]: { slot_date: "", start_time: "", end_time: "" },
      }));

      await fetchMentors();
    } finally {
      setSlotSaving(false);
    }
  }

  /* ---------- NEW: EDIT EXISTING SLOT ---------- */

  function startEditSlot(slot) {
    setEditingSlotId(slot.id);
    setEditingSlotValues({
      slot_date: slot.slot_date || "",
      start_time: slot.start_time || "",
      end_time: slot.end_time || "",
    });
  }

  function cancelEditSlot() {
    setEditingSlotId(null);
    setEditingSlotValues({
      slot_date: "",
      start_time: "",
      end_time: "",
    });
  }

  function updateEditingSlotField(field, value) {
    setEditingSlotValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveEditedSlot(slotId) {
    if (
      !editingSlotValues.slot_date ||
      !editingSlotValues.start_time ||
      !editingSlotValues.end_time
    ) {
      alert("Please fill date, start time and end time.");
      return;
    }

    setSlotSaving(true);
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("mentor_slots")
        .update({
          slot_date: editingSlotValues.slot_date,
          start_time: editingSlotValues.start_time,
          end_time: editingSlotValues.end_time,
        })
        .eq("id", slotId);

      if (error) {
        console.error(error);
        setErrorMsg("Failed to update slot.");
        return;
      }

      await fetchMentors();
      cancelEditSlot();
    } finally {
      setSlotSaving(false);
    }
  }

  /* ---------- NEW: DELETE SLOT ---------- */

  async function deleteSlot(slotId) {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;

    setSlotSaving(true);
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("mentor_slots")
        .delete()
        .eq("id", slotId);

      if (error) {
        console.error(error);
        setErrorMsg("Failed to delete slot.");
        return;
      }

      await fetchMentors();
    } finally {
      setSlotSaving(false);
    }
  }

  return (
    <div className="admin-mentor-page">
      <h2>Mentors & Slots</h2>

      {/* CREATE MENTOR + INITIAL SLOTS */}
      <form className="admin-mentor-form" onSubmit={handleCreateMentor}>
        <div className="form-row">
          <label>Mentor Name</label>
          <input
            type="text"
            placeholder="e.g., John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <label>Designation</label>
          <input
            type="text"
            placeholder="e.g., AI Architect, Company XYZ"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
        </div>

        <div className="slots-section">
          <div className="slots-header">
            <h3>Available Slots</h3>
            <p className="slots-subtitle">
              Add multiple time slots (you can add many for the same day).
            </p>
            <button
              type="button"
              className="add-slot-btn"
              onClick={addSlotRow}
            >
              + Add Slot
            </button>
          </div>

          {slots.map((slot) => (
            <div className="slot-row" key={slot.id}>
              <div className="slot-field">
                <label>Date</label>
                <input
                  type="date"
                  value={slot.slot_date}
                  onChange={(e) =>
                    updateSlot(slot.id, "slot_date", e.target.value)
                  }
                  required
                />
              </div>
              <div className="slot-field">
                <label>Start Time</label>
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) =>
                    updateSlot(slot.id, "start_time", e.target.value)
                  }
                  required
                />
              </div>
              <div className="slot-field">
                <label>End Time</label>
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) =>
                    updateSlot(slot.id, "end_time", e.target.value)
                  }
                  required
                />
              </div>
              {slots.length > 1 && (
                <button
                  type="button"
                  className="remove-slot-btn"
                  onClick={() => removeSlotRow(slot.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Saving..." : "Save Mentor & Slots"}
        </button>
      </form>

      {errorMsg && <div className="error-text">{errorMsg}</div>}

      <hr />

      {/* EXISTING MENTORS + SLOT MANAGEMENT */}
      <h3>Existing Mentors & Slots</h3>
      <div className="mentor-list">
        {mentors.length === 0 ? (
          <p>No mentors added yet.</p>
        ) : (
          mentors.map((m) => {
            const newSlot = newSlotsByMentor[m.id] || {
              slot_date: "",
              start_time: "",
              end_time: "",
            };

            return (
              <div className="mentor-card" key={m.id}>
                <h4>{m.name}</h4>
                <p className="mentor-designation">{m.designation}</p>

                {/* Existing slots */}
                {(!m.mentor_slots || m.mentor_slots.length === 0) ? (
                  <p className="no-slots">No slots configured.</p>
                ) : (
                  <ul className="slot-list">
                    {m.mentor_slots.map((slot) => {
                      const isEditing = editingSlotId === slot.id;

                      return (
                        <li key={slot.id} className="slot-list-item">
                          {isEditing ? (
                            <>
                              <input
                                type="date"
                                value={editingSlotValues.slot_date}
                                onChange={(e) =>
                                  updateEditingSlotField(
                                    "slot_date",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="time"
                                value={editingSlotValues.start_time}
                                onChange={(e) =>
                                  updateEditingSlotField(
                                    "start_time",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="time"
                                value={editingSlotValues.end_time}
                                onChange={(e) =>
                                  updateEditingSlotField(
                                    "end_time",
                                    e.target.value
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="slot-save-btn"
                                disabled={slotSaving}
                                onClick={() => saveEditedSlot(slot.id)}
                              >
                                {slotSaving ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                className="slot-cancel-btn"
                                onClick={cancelEditSlot}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span>
                                {formatDate(slot.slot_date)} |{" "}
                                {slot.start_time} – {slot.end_time}{" "}
                                {slot.is_booked && (
                                  <span className="slot-badge">Booked</span>
                                )}
                              </span>
                              <button
                                type="button"
                                className="slot-edit-btn"
                                onClick={() => startEditSlot(slot)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="slot-delete-btn"
                                disabled={slotSaving}
                                onClick={() => deleteSlot(slot.id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Add new slot for this mentor */}
                <div className="mentor-add-slot">
                  <h5>Add Slot</h5>
                  <div className="slot-row">
                    <div className="slot-field">
                      <label>Date</label>
                      <input
                        type="date"
                        value={newSlot.slot_date}
                        onChange={(e) =>
                          handleNewSlotChange(m.id, "slot_date", e.target.value)
                        }
                      />
                    </div>
                    <div className="slot-field">
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={newSlot.start_time}
                        onChange={(e) =>
                          handleNewSlotChange(
                            m.id,
                            "start_time",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="slot-field">
                      <label>End Time</label>
                      <input
                        type="time"
                        value={newSlot.end_time}
                        onChange={(e) =>
                          handleNewSlotChange(
                            m.id,
                            "end_time",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="add-slot-btn"
                      disabled={slotSaving}
                      onClick={() => handleAddSlotForMentor(m.id)}
                    >
                      {slotSaving ? "Saving..." : "Add Slot"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Mentors;
