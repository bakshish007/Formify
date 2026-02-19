import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import TopNav from "../components/TopNav";

export default function TeacherDashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [latest, setLatest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [marksByStudent, setMarksByStudent] = useState({});
  const [saving, setSaving] = useState(null);
  const [showSubmissions, setShowSubmissions] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/teacher/groups");
        setGroups(data.groups || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openGroup(g) {
    setSelected(g);
    setShowSubmissions(false);
    try {
      const [s, m, allSubs] = await Promise.all([
        api.get(`/api/teacher/groups/${g._id}/submissions/latest`),
        api.get(`/api/teacher/groups/${g._id}/marks`),
        api.get(`/api/teacher/groups/${g._id}/submissions`)
      ]);
      setLatest(s.data.submission);
      setSubmissions(allSubs.data.submissions || []);
      setStudents(m.data.students || []);
      const initial = {};
      (m.data.students || []).forEach((st) => {
        initial[st._id] = st.marks ?? "";
      });
      setMarksByStudent(initial);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load group details");
    }
  }

  async function saveMarks(e, studentId) {
    e.preventDefault();
    if (!selected) return;
    const val = marksByStudent[studentId];
    if (val === "" || val == null) return;
    setSaving(studentId);
    try {
      const { data } = await api.patch(`/api/teacher/groups/${selected._id}/marks/${studentId}`, {
        marks: Number(val)
      });
      setStudents((prev) =>
        prev.map((s) =>
          s._id === studentId ? { ...s, marks: data.mark.marks, updatedAt: data.mark.updatedAt } : s
        )
      );
      setMarksByStudent((p) => ({ ...p, [studentId]: data.mark.marks }));
      toast.success("Marks saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/50">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 safe-bottom">
        <div className="mb-6 sm:mb-8">
          <h1 className="page-title">Teacher Dashboard</h1>
          <p className="page-subtitle">Groups allocated to you.</p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="card">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
            ) : groups.length ? (
              <div className="space-y-2">
                {groups.map((g) => (
                  <button
                    key={g._id}
                    className={`w-full rounded-xl border p-4 text-left transition-all hover:bg-slate-50 ${
                      selected?._id === g._id ? "border-primary-500 bg-primary-50/30 ring-2 ring-primary-500/20" : "border-slate-200"
                    }`}
                    onClick={() => openGroup(g)}
                  >
                    <div className="font-semibold text-slate-900">{g.groupId}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-600">{g.universalProjectTitle}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Members: {(g.members || []).map((m) => m.rollNumber).join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-600">No groups assigned yet.</div>
            )}
          </div>

          <div className="card">
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-600">Select a group to view files and enter marks.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="section-title">Group Details</div>
                  <button
                    className="btn-secondary min-w-0 text-sm"
                    onClick={() => setShowSubmissions(!showSubmissions)}
                  >
                    {showSubmissions ? "Hide Forms" : "View Student Forms"}
                  </button>
                </div>

                {showSubmissions ? (
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-slate-700">Student Form Submissions</div>
                    {submissions.length ? (
                      <div className="max-h-[400px] space-y-3 overflow-y-auto">
                        {submissions.map((sub, idx) => (
                          <div key={sub._id || idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <div className="mb-3 flex flex-col gap-1 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="font-medium text-slate-900">
                                {sub.studentId?.name || "Unknown"} ({sub.studentId?.rollNumber || "—"})
                              </div>
                              <div className="text-xs text-slate-500">
                                {sub.submissionTimestamp ? new Date(sub.submissionTimestamp).toLocaleString() : ""}
                              </div>
                            </div>
                            <div className="grid gap-2 text-sm">
                              <div><span className="font-medium text-slate-700">Name:</span> {sub.name || "—"}</div>
                              <div><span className="font-medium text-slate-700">Roll No:</span> {sub.universityRollNo || "—"}</div>
                              <div><span className="font-medium text-slate-700">Mobile:</span> {sub.mobile || "—"}</div>
                              <div><span className="font-medium text-slate-700">Member 1:</span> {sub.member1Name || "—"} ({sub.member1Roll || "—"})</div>
                              <div><span className="font-medium text-slate-700">Member 2:</span> {sub.member2Name || "—"} ({sub.member2Roll || "—"})</div>
                              <div><span className="font-medium text-slate-700">Project Domain:</span> {sub.projectDomain || "—"}{sub.projectDomainOther ? ` - ${sub.projectDomainOther}` : ""}</div>
                              <div><span className="font-medium text-slate-700">Tentative Title:</span> {sub.tentativeProjectTitle || "—"}</div>
                              <div><span className="font-medium text-slate-700">Description:</span> <span className="text-slate-600">{sub.projectDescription || "—"}</span></div>
                              <div><span className="font-medium text-slate-700">Tech Stack:</span> {sub.technologyStack || "—"}</div>
                              <div><span className="font-medium text-slate-700">Expected Outcomes:</span> <span className="text-slate-600">{sub.expectedOutcomes || "—"}</span></div>
                              {sub.previousExperience && <div><span className="font-medium text-slate-700">Previous Experience:</span> <span className="text-slate-600">{sub.previousExperience}</span></div>}
                              <div><span className="font-medium text-slate-700">SDG Mapping:</span> {sub.sdgMapping || "—"}</div>
                              <div><span className="font-medium text-slate-700">Supervisor Preference:</span> {sub.supervisorPreference || "—"}</div>
                              {sub.comments && <div><span className="font-medium text-slate-700">Comments:</span> <span className="text-slate-600">{sub.comments}</span></div>}
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
                      <div className="py-8 text-center text-sm text-slate-500">No submissions yet.</div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="section-title">Latest files</div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-700">Synopsis:</span>
                          {latest?.synopsisFile?.path ? (
                            <a
                              className="text-primary-600 underline hover:text-primary-700"
                              href={`${import.meta.env.VITE_API_URL}${latest.synopsisFile.path}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-700">Presentation:</span>
                          {latest?.presentationFile?.path ? (
                            <a
                              className="text-primary-600 underline hover:text-primary-700"
                              href={`${import.meta.env.VITE_API_URL}${latest.presentationFile.path}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="section-title">Internal marks (not visible to students)</div>
                      <p className="mt-1 text-xs text-slate-600">Enter marks for each student individually.</p>
                      <div className="mt-4 space-y-3">
                        {students.map((st) => (
                          <form
                            key={st._id}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                            onSubmit={(e) => saveMarks(e, st._id)}
                          >
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-900">{st.name}</div>
                                <div className="text-xs text-slate-500">{st.rollNumber}</div>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    inputMode="numeric"
                                    placeholder="0-100"
                                    className="input-field w-full sm:w-28"
                                    value={marksByStudent[st._id] ?? ""}
                                    onChange={(e) =>
                                      setMarksByStudent((p) => ({
                                        ...p,
                                        [st._id]: e.target.value === "" ? "" : e.target.value
                                      }))
                                    }
                                  />
                                  <button
                                    type="submit"
                                    disabled={saving === st._id}
                                    className="btn-primary whitespace-nowrap"
                                  >
                                    {saving === st._id ? "Saving..." : "Save"}
                                  </button>
                                </div>

                                <div className="text-xs text-slate-500 sm:text-right">
                                  {st.updatedAt ? (
                                    <span>Updated: {new Date(st.updatedAt).toLocaleString()}</span>
                                  ) : (
                                    <span className="text-slate-400">Not graded yet</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </form>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
