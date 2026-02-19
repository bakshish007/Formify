import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import TopNav from "../components/TopNav";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("groups"); // users | groups | forms
  const [groups, setGroups] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [selectedGroupSubmissions, setSelectedGroupSubmissions] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingCap, setSavingCap] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);

  const [newUser, setNewUser] = useState({
    rollNumber: "",
    name: "",
    password: "",
    role: "Student",
    teacherCapacity: 5
  });

  const [override, setOverride] = useState({ groupId: "", supervisorId: "", force: false, reason: "" });

  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentForm, setEditStudentForm] = useState({ name: "", rollNumber: "", password: "" });
  const [savingStudent, setSavingStudent] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(null);

  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ name: "", rollNumber: "", password: "", teacherCapacity: 5 });
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState(null);

  const [resettingGroup, setResettingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);

  const teacherOptions = useMemo(() => {
    return teachers.map((t) => ({
      id: t._id,
      label: `${t.rollNumber} - ${t.name} (${t.assignedGroupsCount}/${t.teacherCapacity})`
    }));
  }, [teachers]);

  async function load() {
    setLoading(true);
    try {
      const [g, f, t, st, s] = await Promise.all([
        api.get("/api/admin/groups"),
        api.get("/api/admin/groups/flagged"),
        api.get("/api/admin/teachers"),
        api.get("/api/admin/students"),
        api.get("/api/admin/submissions")
      ]);

      setGroups(g.data.groups || []);
      setFlagged(f.data.groups || []);
      setTeachers(t.data.teachers || []);
      setStudents(st.data.students || []);
      setAllSubmissions(s.data.submissions || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function viewGroupSubmissions(groupId) {
    setSelectedGroupId(groupId);
    setShowSubmissions(true);
    try {
      const { data } = await api.get(`/api/admin/groups/${groupId}/submissions`);
      setSelectedGroupSubmissions(data.submissions || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load submissions");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function exportExcel() {
    try {
      const res = await api.get("/api/admin/export/groups", { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "formify-groups.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Export failed");
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/api/admin/users", newUser);
      toast.success("User created");
      setNewUser({ rollNumber: "", name: "", password: "", role: "Student", teacherCapacity: 5 });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function updateCapacity(teacherId, teacherCapacity) {
    setSavingCap(true);
    try {
      await api.patch(`/api/admin/teachers/${teacherId}/capacity`, { teacherCapacity });
      toast.success("Capacity updated");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSavingCap(false);
    }
  }

  function openEditStudent(student) {
    setEditingStudent(student);
    setEditStudentForm({ name: student.name, rollNumber: student.rollNumber, password: "" });
  }

  function closeEditStudent() {
    setEditingStudent(null);
    setEditStudentForm({ name: "", rollNumber: "", password: "" });
  }

  async function saveStudent(e) {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingStudent(true);
    try {
      const payload = { name: editStudentForm.name, rollNumber: editStudentForm.rollNumber };
      if (editStudentForm.password) payload.password = editStudentForm.password;
      await api.patch(`/api/admin/students/${editingStudent._id}`, payload);
      toast.success("Student updated");
      closeEditStudent();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSavingStudent(false);
    }
  }

  function openEditTeacher(teacher) {
    setEditingTeacher(teacher);
    setEditTeacherForm({ name: teacher.name, rollNumber: teacher.rollNumber, password: "", teacherCapacity: teacher.teacherCapacity ?? 5 });
  }

  function closeEditTeacher() {
    setEditingTeacher(null);
    setEditTeacherForm({ name: "", rollNumber: "", password: "", teacherCapacity: 5 });
  }

  async function saveTeacher(e) {
    e.preventDefault();
    if (!editingTeacher) return;
    setSavingTeacher(true);
    try {
      const payload = { name: editTeacherForm.name, rollNumber: editTeacherForm.rollNumber, teacherCapacity: editTeacherForm.teacherCapacity };
      if (editTeacherForm.password) payload.password = editTeacherForm.password;
      await api.patch(`/api/admin/teachers/${editingTeacher._id}`, payload);
      toast.success("Teacher updated");
      closeEditTeacher();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSavingTeacher(false);
    }
  }

  async function confirmDeleteTeacher(teacher) {
    if (!window.confirm(`Delete teacher ${teacher.name} (${teacher.rollNumber})? Groups they supervise will be unassigned and flagged for review.`)) return;
    setDeletingTeacher(teacher._id);
    try {
      await api.delete(`/api/admin/teachers/${teacher._id}`);
      toast.success("Teacher deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingTeacher(null);
    }
  }

  async function confirmDeleteStudent(student) {
    if (!window.confirm(`Delete student ${student.name} (${student.rollNumber})? This will remove them from groups and delete their submissions.`)) return;
    setDeletingStudent(student._id);
    try {
      await api.delete(`/api/admin/students/${student._id}`);
      toast.success("Student deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingStudent(null);
    }
  }

  async function overrideSupervisor(e) {
    e.preventDefault();
    if (!override.groupId || !override.supervisorId) return toast.error("Select group and supervisor");
    setOverriding(true);
    try {
      await api.patch(`/api/admin/groups/${override.groupId}/override-supervisor`, {
        supervisorId: override.supervisorId,
        reason: override.reason,
        force: override.force
      });
      toast.success("Supervisor overridden");
      setOverride({ groupId: "", supervisorId: "", force: false, reason: "" });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Override failed");
    } finally {
      setOverriding(false);
    }
  }

  async function resetSupervisorForGroup(group) {
    const label = group?.groupId || "this group";
    if (!window.confirm(`Reset supervisor for ${label}? This will set status to Pending and require reassignment.`)) return;
    setResettingGroup(group._id);
    try {
      await api.patch(`/api/admin/groups/${group._id}/reset-supervisor`, { reason: "Supervisor reset by admin." });
      toast.success("Supervisor reset");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reset failed");
    } finally {
      setResettingGroup(null);
    }
  }

  async function deleteGroupRow(group) {
    const label = group?.groupId || "this group";
    if (!window.confirm(`Delete ${label}? This will delete the group and remove all related submissions and marks.`)) return;
    setDeletingGroup(group._id);
    try {
      await api.delete(`/api/admin/groups/${group._id}`);
      toast.success("Group deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingGroup(null);
    }
  }

  const modalClass = "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4";
  const modalContentClass = "w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl sm:border";

  return (
    <div className="min-h-full bg-slate-50/50">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 safe-bottom">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Monitor groups, allocations, and export Excel.</p>
          </div>
          <button className="btn-primary shrink-0" onClick={exportExcel}>
            Export Excel
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-white p-1 shadow-card sm:w-auto">
            {[
              { id: "users", label: "Users" },
              { id: "groups", label: "Groups" },
              { id: "forms", label: "Forms" }
            ].map((t) => (
              <button
                key={t.id}
                className={`min-h-[44px] flex-1 rounded-xl px-4 text-sm font-semibold transition sm:flex-none ${
                  activeTab === t.id ? "bg-primary-600 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setActiveTab(t.id)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600 sm:flex sm:items-center sm:gap-4 sm:text-sm">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="font-semibold text-slate-900">{students.length}</div>
              <div className="text-slate-500">Students</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="font-semibold text-slate-900">{teachers.length}</div>
              <div className="text-slate-500">Teachers</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="font-semibold text-slate-900">{groups.length}</div>
              <div className="text-slate-500">Groups</div>
            </div>
          </div>
        </div>

        {activeTab === "users" && (
          <>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="card">
              <div className="mb-4">
                <div className="section-title">Create user</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">Students / Teachers</div>
              </div>

            <form className="grid gap-3" onSubmit={createUser}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Roll number</label>
                  <input
                    className="input-field"
                    value={newUser.rollNumber}
                    onChange={(e) => setNewUser((p) => ({ ...p, rollNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name</label>
                  <input
                    className="input-field"
                    value={newUser.name}
                    onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Role</label>
                  <select
                    className="input-field"
                    value={newUser.role}
                    onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option>Student</option>
                    <option>Teacher</option>
                  </select>
                </div>
              </div>

              {newUser.role === "Teacher" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Teacher capacity</label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={newUser.teacherCapacity}
                    onChange={(e) => setNewUser((p) => ({ ...p, teacherCapacity: Number(e.target.value) }))}
                  />
                </div>
              ) : null}

              <button disabled={creating} type="submit" className="btn-primary">
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
          </div>

            <div className="card">
              <div className="mb-4">
                <div className="section-title">Teachers</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">Capacity management</div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                </div>
              ) : teachers.length ? (
                <div className="space-y-3">
                  {teachers.map((t) => (
                    <div
                      key={t._id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 text-sm">
                        <div className="truncate font-medium">
                          {t.rollNumber} — {t.name}
                        </div>
                        <div className="text-slate-500">
                          Assigned: {t.assignedGroupsCount} / Capacity: {t.teacherCapacity}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            className="input-field w-28"
                            defaultValue={t.teacherCapacity}
                            onBlur={(e) => updateCapacity(t._id, Number(e.target.value))}
                            disabled={savingCap}
                          />
                          <span className="text-xs text-slate-500">Blur</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="btn-secondary min-h-0 min-w-0 px-3 py-2 text-xs" onClick={() => openEditTeacher(t)}>
                            Edit
                          </button>
                          <button
                            className="btn-danger min-h-0 min-w-0 px-3 py-2 text-xs"
                            onClick={() => confirmDeleteTeacher(t)}
                            disabled={deletingTeacher === t._id}
                          >
                            {deletingTeacher === t._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-600">No teachers yet.</div>
              )}

            {editingTeacher && (
              <div className={modalClass} onClick={closeEditTeacher}>
                <div className={modalContentClass} onClick={(e) => e.stopPropagation()}>
                  <div className="mb-4 text-lg font-semibold text-slate-900">Edit Teacher</div>
                  <form className="grid gap-3" onSubmit={saveTeacher}>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Roll Number</label>
                      <input
                        className="input-field"
                        value={editTeacherForm.rollNumber}
                        onChange={(e) => setEditTeacherForm((p) => ({ ...p, rollNumber: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Name</label>
                      <input
                        className="input-field"
                        value={editTeacherForm.name}
                        onChange={(e) => setEditTeacherForm((p) => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Capacity</label>
                      <input
                        type="number"
                        min={0}
                        className="input-field"
                        value={editTeacherForm.teacherCapacity}
                        onChange={(e) => setEditTeacherForm((p) => ({ ...p, teacherCapacity: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">New Password (leave blank to keep)</label>
                      <input
                        type="password"
                        className="input-field"
                        value={editTeacherForm.password}
                        onChange={(e) => setEditTeacherForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                      <button type="submit" disabled={savingTeacher} className="btn-primary">
                        {savingTeacher ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={closeEditTeacher} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
          </div>

          <div className="mt-6 card">
            <div className="mb-4">
              <div className="section-title">Manage students</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">Edit, delete students</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
            ) : students.length ? (
              <div className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Roll Number</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st) => (
                      <tr key={st._id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{st.rollNumber}</td>
                        <td className="py-3 pr-4">{st.name}</td>
                        <td className="py-3 pr-4 sm:text-right">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                            <button className="btn-secondary min-h-0 min-w-0 px-3 py-2 text-xs" onClick={() => openEditStudent(st)}>
                              Edit
                            </button>
                            <button
                              className="btn-danger min-h-0 min-w-0 px-3 py-2 text-xs"
                              onClick={() => confirmDeleteStudent(st)}
                              disabled={deletingStudent === st._id}
                            >
                              {deletingStudent === st._id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-slate-600">No students yet.</div>
            )}

          {editingStudent && (
            <div className={modalClass} onClick={closeEditStudent}>
              <div className={modalContentClass} onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 text-lg font-semibold text-slate-900">Edit Student</div>
                <form className="grid gap-3" onSubmit={saveStudent}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Roll Number</label>
                    <input
                      className="input-field"
                      value={editStudentForm.rollNumber}
                      onChange={(e) => setEditStudentForm((p) => ({ ...p, rollNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Name</label>
                    <input
                      className="input-field"
                      value={editStudentForm.name}
                      onChange={(e) => setEditStudentForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">New Password (leave blank to keep)</label>
                    <input
                      type="password"
                      className="input-field"
                      value={editStudentForm.password}
                      onChange={(e) => setEditStudentForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <button type="submit" disabled={savingStudent} className="btn-primary">
                      {savingStudent ? "Saving..." : "Save"}
                    </button>
                    <button type="button" onClick={closeEditStudent} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          </div>
          </>
        )}

        {activeTab === "groups" && (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <div className="card">
            <div className="mb-4">
              <div className="section-title">Flagged groups</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">Override supervisor</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
            ) : flagged.length ? (
              <div className="space-y-3">
                {flagged.map((g) => (
                  <div key={g._id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="font-medium">
                        {g.groupId} — {g.universalProjectTitle}
                      </div>
                      <div className="text-slate-500">{g.flagReason || "Needs review"}</div>
                    </div>
                    <button
                      className="btn-secondary mt-3 min-w-0"
                      onClick={() => setOverride((p) => ({ ...p, groupId: g._id }))}
                    >
                      Select for override
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-600">No flagged groups.</div>
            )}

            <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4" onSubmit={overrideSupervisor}>
              <div className="section-title">Override form</div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Selected group</label>
                <input
                  className="input-field"
                  value={override.groupId}
                  onChange={(e) => setOverride((p) => ({ ...p, groupId: e.target.value }))}
                  placeholder="Paste group _id or click Select above"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Supervisor</label>
                <select
                  className="input-field"
                  value={override.supervisorId}
                  onChange={(e) => setOverride((p) => ({ ...p, supervisorId: e.target.value }))}
                >
                  <option value="">Select teacher</option>
                  {teacherOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
                <input
                  className="input-field"
                  value={override.reason}
                  onChange={(e) => setOverride((p) => ({ ...p, reason: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={override.force}
                  onChange={(e) => setOverride((p) => ({ ...p, force: e.target.checked }))}
                />
                Force override (ignore capacity)
              </label>
              <button disabled={overriding} type="submit" className="btn-primary">
                {overriding ? "Overriding..." : "Override"}
              </button>
              <div className="text-xs text-slate-500">Tip: if capacity is full, enable force override.</div>
            </form>
          </div>

          <div className="card">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="section-title">All groups</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">Operational view</div>
              </div>
              <button
                className="btn-secondary min-w-0 text-sm"
                onClick={() => setShowSubmissions(!showSubmissions)}
              >
                {showSubmissions ? "Hide All Forms" : "View All Student Forms"}
              </button>
            </div>

            {showSubmissions ? (
              <div className="space-y-4">
                <div className="text-sm font-medium text-slate-700">All Student Form Submissions ({allSubmissions.length})</div>
                {allSubmissions.length ? (
                  <div className="max-h-[500px] space-y-3 overflow-y-auto sm:max-h-[600px]">
                    {allSubmissions.map((sub, idx) => (
                      <div key={sub._id || idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="mb-3 flex items-center justify-between border-b pb-2">
                          <div className="font-medium">
                            {sub.studentId?.name || "Unknown"} ({sub.studentId?.rollNumber || "—"})
                          </div>
                          <div className="text-xs text-slate-500">
                            Group: {sub.groupId?.groupId || "—"} | {sub.submissionTimestamp ? new Date(sub.submissionTimestamp).toLocaleString() : ""}
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div><span className="font-medium">Name:</span> {sub.name || "—"}</div>
                          <div><span className="font-medium">Roll No:</span> {sub.universityRollNo || "—"}</div>
                          <div><span className="font-medium">Mobile:</span> {sub.mobile || "—"}</div>
                          <div><span className="font-medium">Member 1:</span> {sub.member1Name || "—"} ({sub.member1Roll || "—"})</div>
                          <div><span className="font-medium">Member 2:</span> {sub.member2Name || "—"} ({sub.member2Roll || "—"})</div>
                          <div><span className="font-medium">Project Domain:</span> {sub.projectDomain || "—"}{sub.projectDomainOther ? ` - ${sub.projectDomainOther}` : ""}</div>
                          <div><span className="font-medium">Tentative Title:</span> {sub.tentativeProjectTitle || "—"}</div>
                          <div><span className="font-medium">Description:</span> <span className="text-slate-600">{sub.projectDescription || "—"}</span></div>
                          <div><span className="font-medium">Tech Stack:</span> {sub.technologyStack || "—"}</div>
                          <div><span className="font-medium">Expected Outcomes:</span> <span className="text-slate-600">{sub.expectedOutcomes || "—"}</span></div>
                          {sub.previousExperience && <div><span className="font-medium">Previous Experience:</span> <span className="text-slate-600">{sub.previousExperience}</span></div>}
                          <div><span className="font-medium">SDG Mapping:</span> {sub.sdgMapping || "—"}</div>
                          <div><span className="font-medium">Supervisor Preference:</span> {sub.supervisorPreference || "—"}</div>
                          {sub.comments && <div><span className="font-medium">Comments:</span> <span className="text-slate-600">{sub.comments}</span></div>}
                          {(sub.synopsisFile?.path || sub.presentationFile?.path) && (
                            <div className="mt-2 flex gap-3">
                              {sub.synopsisFile?.path && (
                                <a className="text-xs underline" href={`${import.meta.env.VITE_API_URL}${sub.synopsisFile.path}`} target="_blank" rel="noreferrer">Synopsis</a>
                              )}
                              {sub.presentationFile?.path && (
                                <a className="text-xs underline" href={`${import.meta.env.VITE_API_URL}${sub.presentationFile.path}`} target="_blank" rel="noreferrer">Presentation</a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-600">No submissions yet.</div>
                )}
              </div>
            ) : (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                  </div>
                ) : groups.length ? (
                  <>
                    {/* Mobile: stacked group cards */}
                    <div className="space-y-3 sm:hidden">
                      {groups.map((g) => (
                        <div key={g._id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">{g.groupId}</div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                g.status === "Allocated"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {g.status}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            Leader: {g.leaderId?.rollNumber || "—"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Members: {(g.members || []).map((m) => m.rollNumber).join(", ") || "—"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Supervisor: {g.assignedSupervisor?.rollNumber || "—"}
                          </div>
                          {g.flaggedForAdmin && (
                            <div className="mt-2 text-xs font-medium text-amber-700">
                              Flagged: {g.flagReason || "Review"}
                            </div>
                          )}
                          <div className="mt-3 flex flex-col gap-2">
                            <button
                              className="text-primary-600 text-xs font-medium underline hover:text-primary-700 text-left"
                              onClick={() => viewGroupSubmissions(g._id)}
                            >
                              View Forms
                            </button>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="btn-secondary min-h-0 min-w-0 flex-1 px-3 py-2 text-xs"
                                onClick={() => resetSupervisorForGroup(g)}
                                disabled={!g.assignedSupervisor || resettingGroup === g._id}
                                title={!g.assignedSupervisor ? "No supervisor assigned" : "Reset supervisor"}
                              >
                                {resettingGroup === g._id ? "Resetting..." : "Reset"}
                              </button>
                              <button
                                className="btn-danger min-h-0 min-w-0 flex-1 px-3 py-2 text-xs"
                                onClick={() => deleteGroupRow(g)}
                                disabled={deletingGroup === g._id}
                              >
                                {deletingGroup === g._id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: table view */}
                    <div className="table-scroll hidden sm:block">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b text-xs uppercase text-slate-500">
                          <tr>
                            <th className="py-2 pr-4">Group</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Leader</th>
                            <th className="py-2 pr-4">Members</th>
                            <th className="py-2 pr-4">Supervisor</th>
                            <th className="py-2 pr-4">Flag</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((g) => (
                            <tr key={g._id} className="border-b last:border-0">
                              <td className="py-3 pr-4 font-medium">{g.groupId}</td>
                              <td className="py-3 pr-4">{g.status}</td>
                              <td className="py-3 pr-4">{g.leaderId?.rollNumber}</td>
                              <td className="py-3 pr-4">{(g.members || []).map((m) => m.rollNumber).join(", ")}</td>
                              <td className="py-3 pr-4">{g.assignedSupervisor?.rollNumber || "—"}</td>
                              <td className="py-3 pr-4">
                                {g.flaggedForAdmin ? (
                                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                                    Review
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="py-3 pr-4 sm:text-right">
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                  <button
                                    className="text-primary-600 text-xs font-medium underline hover:text-primary-700"
                                    onClick={() => viewGroupSubmissions(g._id)}
                                  >
                                    View Forms
                                  </button>
                                  <button
                                    className="btn-secondary min-h-0 min-w-0 px-3 py-2 text-xs"
                                    onClick={() => resetSupervisorForGroup(g)}
                                    disabled={!g.assignedSupervisor || resettingGroup === g._id}
                                    title={!g.assignedSupervisor ? "No supervisor assigned" : "Reset supervisor"}
                                  >
                                    {resettingGroup === g._id ? "Resetting..." : "Reset"}
                                  </button>
                                  <button
                                    className="btn-danger min-h-0 min-w-0 px-3 py-2 text-xs"
                                    onClick={() => deleteGroupRow(g)}
                                    disabled={deletingGroup === g._id}
                                  >
                                    {deletingGroup === g._id ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-600">No groups yet.</div>
                )}
              </>
            )}
          </div>
        </div>
        )}

        {activeTab === "groups" && showSubmissions && selectedGroupSubmissions.length > 0 && (
          <div className="mt-4 card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Group submissions</div>
                <div className="mt-1 text-lg font-semibold">Student Forms</div>
              </div>
              <button
                className="btn-secondary min-w-0 text-sm"
                onClick={() => {
                  setShowSubmissions(false);
                  setSelectedGroupSubmissions([]);
                  setSelectedGroupId(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="max-h-[600px] space-y-3 overflow-y-auto">
              {selectedGroupSubmissions.map((sub, idx) => (
                <div key={sub._id || idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center justify-between border-b pb-2">
                    <div className="font-medium">
                      {sub.studentId?.name || "Unknown"} ({sub.studentId?.rollNumber || "—"})
                    </div>
                    <div className="text-xs text-slate-500">
                      {sub.submissionTimestamp ? new Date(sub.submissionTimestamp).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div><span className="font-medium">Name:</span> {sub.name || "—"}</div>
                    <div><span className="font-medium">Roll No:</span> {sub.universityRollNo || "—"}</div>
                    <div><span className="font-medium">Mobile:</span> {sub.mobile || "—"}</div>
                    <div><span className="font-medium">Member 1:</span> {sub.member1Name || "—"} ({sub.member1Roll || "—"})</div>
                    <div><span className="font-medium">Member 2:</span> {sub.member2Name || "—"} ({sub.member2Roll || "—"})</div>
                    <div><span className="font-medium">Project Domain:</span> {sub.projectDomain || "—"}{sub.projectDomainOther ? ` - ${sub.projectDomainOther}` : ""}</div>
                    <div><span className="font-medium">Tentative Title:</span> {sub.tentativeProjectTitle || "—"}</div>
                    <div><span className="font-medium">Description:</span> <span className="text-slate-600">{sub.projectDescription || "—"}</span></div>
                    <div><span className="font-medium">Tech Stack:</span> {sub.technologyStack || "—"}</div>
                    <div><span className="font-medium">Expected Outcomes:</span> <span className="text-slate-600">{sub.expectedOutcomes || "—"}</span></div>
                    {sub.previousExperience && <div><span className="font-medium">Previous Experience:</span> <span className="text-slate-600">{sub.previousExperience}</span></div>}
                    <div><span className="font-medium">SDG Mapping:</span> {sub.sdgMapping || "—"}</div>
                    <div><span className="font-medium">Supervisor Preference:</span> {sub.supervisorPreference || "—"}</div>
                    {sub.comments && <div><span className="font-medium">Comments:</span> <span className="text-slate-600">{sub.comments}</span></div>}
                    {(sub.synopsisFile?.path || sub.presentationFile?.path) && (
                      <div className="mt-2 flex gap-3">
                        {sub.synopsisFile?.path && (
                          <a className="text-xs underline" href={`${import.meta.env.VITE_API_URL}${sub.synopsisFile.path}`} target="_blank" rel="noreferrer">Synopsis</a>
                        )}
                        {sub.presentationFile?.path && (
                          <a className="text-xs underline" href={`${import.meta.env.VITE_API_URL}${sub.presentationFile.path}`} target="_blank" rel="noreferrer">Presentation</a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "forms" && (
          <div className="card">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="section-title">All student forms</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">Latest submissions</div>
              </div>
              <div className="text-sm text-slate-600">{allSubmissions.length} entries</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
            ) : allSubmissions.length ? (
              <div className="max-h-[650px] space-y-3 overflow-y-auto">
                {allSubmissions.map((sub, idx) => (
                  <div key={sub._id || idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="mb-3 flex flex-col gap-1 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-medium text-slate-900">
                        {sub.studentId?.name || "Unknown"} ({sub.studentId?.rollNumber || "—"})
                      </div>
                      <div className="text-xs text-slate-500">
                        Group: {sub.groupId?.groupId || "—"} | {sub.submissionTimestamp ? new Date(sub.submissionTimestamp).toLocaleString() : ""}
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div><span className="font-medium">Title:</span> {sub.tentativeProjectTitle || "—"}</div>
                      <div><span className="font-medium">Domain:</span> {sub.projectDomain || "—"}{sub.projectDomainOther ? ` - ${sub.projectDomainOther}` : ""}</div>
                      <div><span className="font-medium">Tech Stack:</span> {sub.technologyStack || "—"}</div>
                      <div><span className="font-medium">SDG:</span> {sub.sdgMapping || "—"}</div>
                      {(sub.synopsisFile?.path || sub.presentationFile?.path) && (
                        <div className="mt-2 flex flex-wrap gap-3">
                          {sub.synopsisFile?.path && (
                            <a className="text-primary-600 underline hover:text-primary-700" href={`${import.meta.env.VITE_API_URL}${sub.synopsisFile.path}`} target="_blank" rel="noreferrer">Synopsis</a>
                          )}
                          {sub.presentationFile?.path && (
                            <a className="text-primary-600 underline hover:text-primary-700" href={`${import.meta.env.VITE_API_URL}${sub.presentationFile.path}`} target="_blank" rel="noreferrer">Presentation</a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-600">No submissions yet.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

