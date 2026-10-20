// ============================================================
// SchoolPickerModal — pick existing or create new, with fuzzy-match
// guard to prevent accidental duplicates.
// Now includes inline edit (rename) and delete per school.
// Depends on: Icon.js (Input/Field/Select/smallBtn), helpers.js (similarityRatio),
//             bankAPI.js (schoolsAPI), storage.js (useSchoolsVersion)
// ============================================================
const { useState: useState_school, useMemo: useMemo_school, useEffect: useEffect_school } = React;

window.SchoolPickerModal = function SchoolPickerModal({ onClose, onSelect, onCreate, t, currentSchoolId, requireSelection }) {
  window.useSchoolsVersion();
  const schools = window.schoolsAPI.all();
  const [mode, setMode] = useState_school("pick"); // 'pick' | 'create' | 'manage'
  const [newName, setNewName] = useState_school("");
  const [creating, setCreating] = useState_school(false);
  const [confirmAnyway, setConfirmAnyway] = useState_school(false);
  const [error, setError] = useState_school("");

  // Dropdown selection state
  const [pickedId, setPickedId] = useState_school(
    currentSchoolId || (schools[0] && schools[0].school_id) || ""
  );

  // Edit state
  const [editingId, setEditingId] = useState_school(null);
  const [editName, setEditName] = useState_school("");
  const [saving, setSaving] = useState_school(false);
  const [deletingId, setDeletingId] = useState_school(null); // id pending delete confirm

  useEffect_school(() => {
    if (!pickedId && schools[0]) setPickedId(schools[0].school_id);
  }, [schools.length]);

  // Near-duplicate suggestions for new name
  const suggestions = useMemo_school(() => {
    const q = newName.trim();
    if (!q) return [];
    return schools
      .map(s => ({ ...s, ratio: window.similarityRatio(q, s.name) }))
      .filter(s => s.ratio >= 0.85 && s.ratio < 1)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3);
  }, [newName, schools]);

  const exactMatch = useMemo_school(() => {
    const q = newName.trim().toLowerCase();
    return schools.find(s => String(s.name || "").trim().toLowerCase() === q);
  }, [newName, schools]);

  // Near-duplicate suggestions for edit name (excluding the school being edited)
  const editSuggestions = useMemo_school(() => {
    if (!editName.trim() || !editingId) return [];
    return schools
      .filter(s => s.school_id !== editingId)
      .map(s => ({ ...s, ratio: window.similarityRatio(editName.trim(), s.name) }))
      .filter(s => s.ratio >= 0.85)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 2);
  }, [editName, editingId, schools]);

  function handleChoose() {
    const found = schools.find(s => s.school_id === pickedId);
    if (found) onSelect(found);
  }

  async function handleCreate() {
    setError("");
    if (!newName.trim()) return;
    if (exactMatch) { onSelect(exactMatch); return; }
    if (suggestions.length > 0 && !confirmAnyway) { setConfirmAnyway(true); return; }
    setCreating(true);
    try {
      const res = await onCreate(newName.trim());
      onSelect({ school_id: res.schoolId, name: res.name });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(school) {
    setEditingId(school.school_id);
    setEditName(school.name);
    setDeletingId(null);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setError("");
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editingId) return;
    setSaving(true);
    setError("");
    try {
      await window.schoolsAPI.rename(editingId, editName.trim());
      setEditingId(null);
      setEditName("");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(schoolId) {
    if (deletingId !== schoolId) {
      // First click — show confirm
      setDeletingId(schoolId);
      setEditingId(null);
      return;
    }
    // Second click — confirmed
    setSaving(true);
    setError("");
    try {
      await window.schoolsAPI.remove(schoolId);
      setDeletingId(null);
      // If this was the active school, clear it
      if (currentSchoolId === schoolId) {
        // parent will re-show picker since school list no longer contains it
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  const isSv = !t.schoolPickerTitle?.startsWith("Choose");

  return (
    <div onClick={requireSelection ? undefined : onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 150,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 480, width: "100%", padding: 22, maxHeight: "85vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>🏫 {t.schoolPickerTitle}</h2>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {mode !== "manage" && schools.length > 0 && (
              <button
                onClick={() => { setMode("manage"); setEditingId(null); setDeletingId(null); setError(""); }}
                style={{ ...window.smallBtn, fontSize: 11 }}
                title={isSv ? "Hantera skolor" : "Manage schools"}
              >
                ✏️ {isSv ? "Hantera" : "Manage"}
              </button>
            )}
            {mode === "manage" && (
              <button onClick={() => { setMode("pick"); setEditingId(null); setDeletingId(null); setError(""); }} style={{ ...window.smallBtn, fontSize: 11 }}>
                ← {t.back}
              </button>
            )}
            {!requireSelection && (
              <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-tertiary)" }}>×</button>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          {requireSelection ? t.schoolPickerWelcome : t.schoolPickerDesc}
        </p>

        {/* ── PICK MODE ── */}
        {mode === "pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {schools.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12, fontStyle: "italic", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)" }}>
                {t.schoolNoneYet}
              </div>
            ) : (
              <>
                <window.Select value={pickedId} onChange={(e) => setPickedId(e.target.value)}>
                  <option value="">{t.schoolPickPrompt}</option>
                  {schools.map(s => (
                    <option key={s.school_id} value={s.school_id}>{s.name}</option>
                  ))}
                </window.Select>
                <button onClick={handleChoose} disabled={!pickedId} style={{
                  width: "100%", padding: "9px 12px", fontSize: 13, fontWeight: 500,
                  background: pickedId ? "var(--accent)" : "var(--bg-secondary)",
                  color: pickedId ? "#fff" : "var(--text-tertiary)",
                  border: "1px solid " + (pickedId ? "var(--accent)" : "var(--border-default)"),
                  borderRadius: "var(--radius-md)",
                  cursor: pickedId ? "pointer" : "not-allowed",
                }}>
                  {t.schoolUseExisting || (isSv ? "Använd denna skola" : "Use this school")}
                </button>
              </>
            )}
            <div style={{ borderTop: "1px dashed var(--border-default)", paddingTop: 10 }}>
              <button onClick={() => { setMode("create"); setError(""); }} style={{
                width: "100%", padding: "9px 12px", fontSize: 13, fontWeight: 500,
                background: "var(--accent-bg)", color: "var(--accent)",
                border: "1px solid var(--accent-bg)", borderRadius: "var(--radius-md)", cursor: "pointer",
              }}>
                + {t.schoolCreateNew}
              </button>
            </div>
          </div>
        )}

        {/* ── CREATE MODE ── */}
        {mode === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <window.Field label={t.schoolNameLabel} hint={t.schoolNameHint}>
              <window.Input value={newName} onChange={(e) => { setNewName(e.target.value); setConfirmAnyway(false); }}
                placeholder="Bromma Skola" autoFocus />
            </window.Field>

            {exactMatch && (
              <div style={{ padding: "8px 12px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                ℹ {t.schoolAlreadyExists}: <strong>{exactMatch.name}</strong>
              </div>
            )}

            {!exactMatch && suggestions.length > 0 && (
              <div style={{ padding: "10px 12px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--warning-text)", marginBottom: 6 }}>
                  ⚠ {t.schoolMaybeDuplicate}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {suggestions.map(s => (
                    <button key={s.school_id} onClick={() => onSelect(s)} style={{
                      textAlign: "left", padding: "5px 8px", fontSize: 12,
                      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-primary)",
                    }}>
                      ↗ {s.name} <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>({Math.round(s.ratio * 100)}% {t.schoolSimilar})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: "8px 12px", background: "var(--warning-bg)", color: "var(--warning-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <button onClick={() => { setMode("pick"); setNewName(""); setError(""); }} style={window.smallBtn}>← {t.back}</button>
              <button onClick={handleCreate} disabled={!newName.trim() || creating} style={{
                ...window.smallBtn, padding: "7px 14px",
                background: "var(--accent)", color: "#fff", borderColor: "var(--accent)",
                opacity: (!newName.trim() || creating) ? 0.5 : 1,
                cursor: (!newName.trim() || creating) ? "not-allowed" : "pointer",
              }}>
                {creating ? t.schoolCreating
                  : exactMatch ? t.schoolUseExisting
                  : (suggestions.length > 0 && !confirmAnyway) ? t.schoolConfirmCreate
                  : t.schoolCreateButton}
              </button>
            </div>
          </div>
        )}

        {/* ── MANAGE MODE ── */}
        {mode === "manage" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>
              {isSv ? "Klicka på en skola för att byta namn eller radera." : "Click a school to rename or delete."}
            </div>

            {error && (
              <div style={{ padding: "8px 12px", background: "var(--danger-bg)", color: "var(--danger-text)", borderRadius: "var(--radius-sm)", fontSize: 12, marginBottom: 4 }}>
                {error}
              </div>
            )}

            {schools.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12, fontStyle: "italic" }}>
                {t.schoolNoneYet}
              </div>
            )}

            {schools.map(school => {
              const isEditing = editingId === school.school_id;
              const isDeleting = deletingId === school.school_id;
              const isCurrent = currentSchoolId === school.school_id;

              return (
                <div key={school.school_id} style={{
                  border: `1px solid ${isCurrent ? "var(--accent)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  background: isCurrent ? "var(--accent-bg)" : "var(--bg-surface)",
                }}>
                  {/* Collapsed row */}
                  {!isEditing && !isDeleting && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                        {school.name}
                        {isCurrent && (
                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "var(--bg-surface)", padding: "1px 6px", borderRadius: 8, border: "1px solid var(--accent)" }}>
                            {isSv ? "aktiv" : "active"}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => startEdit(school)}
                        style={{ ...window.smallBtn, padding: "4px 9px", fontSize: 11 }}
                        title={isSv ? "Byt namn" : "Rename"}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => { setDeletingId(school.school_id); setEditingId(null); }}
                        style={{ ...window.smallBtn, padding: "4px 9px", fontSize: 11, color: "var(--danger-text)" }}
                        title={isSv ? "Radera" : "Delete"}
                      >
                        🗑
                      </button>
                    </div>
                  )}

                  {/* Edit row */}
                  {isEditing && (
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <window.Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      />
                      {editSuggestions.length > 0 && (
                        <div style={{ fontSize: 11, color: "var(--warning-text)", background: "var(--warning-bg)", padding: "6px 8px", borderRadius: "var(--radius-sm)" }}>
                          ⚠ {isSv ? "Liknar befintlig skola:" : "Similar to existing:"} {editSuggestions.map(s => s.name).join(", ")}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={cancelEdit} style={window.smallBtn}>
                          {isSv ? "Avbryt" : "Cancel"}
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editName.trim() || saving || editName.trim() === school.name}
                          style={{
                            ...window.smallBtn, padding: "5px 12px",
                            background: "var(--accent)", color: "#fff", borderColor: "var(--accent)",
                            opacity: (!editName.trim() || saving || editName.trim() === school.name) ? 0.5 : 1,
                            cursor: (!editName.trim() || saving || editName.trim() === school.name) ? "not-allowed" : "pointer",
                          }}
                        >
                          {saving ? "…" : (isSv ? "Spara" : "Save")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete confirm row */}
                  {isDeleting && (
                    <div style={{ padding: "10px 12px", background: "var(--danger-bg)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--danger-text)", fontWeight: 500 }}>
                        {isSv ? `Radera "${school.name}"?` : `Delete "${school.name}"?`}
                        {isCurrent && (
                          <span style={{ display: "block", fontSize: 11, fontWeight: 400, marginTop: 2 }}>
                            {isSv ? "⚠ Detta är din aktiva skola." : "⚠ This is your active school."}
                          </span>
                        )}
                      </span>
                      <button onClick={() => setDeletingId(null)} style={window.smallBtn}>
                        {isSv ? "Avbryt" : "Cancel"}
                      </button>
                      <button
                        onClick={() => handleDelete(school.school_id)}
                        disabled={saving}
                        style={{
                          ...window.smallBtn, padding: "5px 12px",
                          background: "var(--danger-text)", color: "#fff", borderColor: "var(--danger-text)",
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        {saving ? "…" : (isSv ? "Ja, radera" : "Yes, delete")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ borderTop: "1px dashed var(--border-default)", paddingTop: 10, marginTop: 4 }}>
              <button onClick={() => { setMode("create"); setError(""); }} style={{
                width: "100%", padding: "9px 12px", fontSize: 13, fontWeight: 500,
                background: "var(--accent-bg)", color: "var(--accent)",
                border: "1px solid var(--accent-bg)", borderRadius: "var(--radius-md)", cursor: "pointer",
              }}>
                + {t.schoolCreateNew}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
