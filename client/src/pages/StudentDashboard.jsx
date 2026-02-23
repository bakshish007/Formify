import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";

const PROJECT_DOMAINS = [
  "Industry-Based Project",
  "Research-Based Project",
  "Institute-Based Project",
  "Academics-Based Project",
  "Social Impact Project",
  "Other"
];

const SDG_OPTIONS = [
  "SDG 1 – No Poverty",
  "SDG 2 – Zero Hunger",
  "SDG 3 – Good Health and Well-being",
  "SDG 4 – Quality Education",
  "SDG 5 – Gender Equality",
  "SDG 6 – Clean Water and Sanitation",
  "SDG 7 – Affordable and Clean Energy",
  "SDG 8 – Decent Work and Economic Growth",
  "SDG 9 – Industry, Innovation and Infrastructure",
  "SDG 10 – Reduced Inequalities",
  "SDG 11 – Sustainable Cities and Communities",
  "SDG 12 – Responsible Consumption and Production",
  "SDG 13 – Climate Action",
  "SDG 14 – Life Below Water",
  "SDG 15 – Life on Land",
  "SDG 16 – Peace, Justice and Strong Institutions",
  "SDG 17 – Partnerships for the Goals"
];

function wordCount(str) {
  return str ? str.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function StudentDashboard() {
  const { user: authUser } = useAuth();
  const [group, setGroup] = useState(null);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState("view"); // "view" or "edit"

  const [name, setName] = useState("");
  const [universityRollNo, setUniversityRollNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [member1Roll, setMember1Roll] = useState("");
  const [member2Roll, setMember2Roll] = useState("");
  const [member1Name, setMember1Name] = useState("");
  const [member2Name, setMember2Name] = useState("");
  const [projectDomain, setProjectDomain] = useState("");
  const [projectDomainOther, setProjectDomainOther] = useState("");
  const [tentativeProjectTitle, setTentativeProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [technologyStack, setTechnologyStack] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState("");
  const [previousExperience, setPreviousExperience] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [sdgMapping, setSdgMapping] = useState("");
  const [pref1, setPref1] = useState("");
  const [pref2, setPref2] = useState("");
  const [pref3, setPref3] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [comments, setComments] = useState("");
  const [synopsis, setSynopsis] = useState(null);
  const [presentation, setPresentation] = useState(null);

  useEffect(() => {
    if (authUser) {
      setName(authUser.name || "");
      setUniversityRollNo(authUser.rollNumber || "");
    }
  }, [authUser]);

  async function fetchMe() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/student/me");
      setGroup(data.group);
      const latestRes = await api.get("/api/student/submissions/latest");
      setLatest(latestRes.data.submission);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function populateFormFromSubmission(submission) {
    if (!submission) return;
    setName(submission.name || "");
    setUniversityRollNo(submission.universityRollNo || "");
    setMobile(submission.mobile || "");
    setMember1Roll(submission.member1Roll || "");
    setMember2Roll(submission.member2Roll || "");
    setMember1Name(submission.member1Name || "");
    setMember2Name(submission.member2Name || "");
    setProjectDomain(submission.projectDomain || "");
    setProjectDomainOther(submission.projectDomainOther || "");
    setTentativeProjectTitle(submission.tentativeProjectTitle || "");
    setProjectDescription(submission.projectDescription || "");
    setTechnologyStack(submission.technologyStack || "");
    setExpectedOutcomes(submission.expectedOutcomes || "");
    setPreviousExperience(submission.previousExperience || "");
    setAgreement(submission.agreement || false);
    setSdgMapping(submission.sdgMapping || "");
    if (submission.teacherPreferences && submission.teacherPreferences.length >= 3) {
      // Handle both populated objects and raw IDs
      const pref1Id = submission.teacherPreferences[0]?._id || submission.teacherPreferences[0];
      const pref2Id = submission.teacherPreferences[1]?._id || submission.teacherPreferences[1];
      const pref3Id = submission.teacherPreferences[2]?._id || submission.teacherPreferences[2];
      setPref1(pref1Id ? String(pref1Id) : "");
      setPref2(pref2Id ? String(pref2Id) : "");
      setPref3(pref3Id ? String(pref3Id) : "");
    } else {
      setPref1("");
      setPref2("");
      setPref3("");
    }
    setComments(submission.comments || "");
  }

  function handleEditClick() {
    populateFormFromSubmission(latest);
    setViewMode("edit");
  }

  function handleCancelEdit() {
    setViewMode("view");
    // Reset form to empty or keep current values
  }

  useEffect(() => {
    fetchMe();
    (async () => {
      try {
        const { data } = await api.get("/api/student/teachers");
        setTeachers(data.teachers || []);
      } catch (err) {
        toast.error("Failed to load teachers");
      }
    })();
  }, []);

  const descWordCount = wordCount(projectDescription);
  const descOverLimit = descWordCount > 500;

  function handleMobileChange(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 10);
    setMobile(v);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (descOverLimit) {
      toast.error("Project Description must be maximum 500 words");
      return;
    }
    if (!agreement) {
      toast.error("Please confirm the agreement to continue as Major Project");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("universityRollNo", universityRollNo);
      fd.append("mobile", mobile);
      fd.append("member1Roll", member1Roll);
      fd.append("member2Roll", member2Roll);
      fd.append("member1Name", member1Name);
      fd.append("member2Name", member2Name);
      fd.append("projectDomain", projectDomain);
      if (projectDomain === "Other") fd.append("projectDomainOther", projectDomainOther);
      fd.append("tentativeProjectTitle", tentativeProjectTitle);
      fd.append("projectDescription", projectDescription);
      fd.append("technologyStack", technologyStack);
      fd.append("expectedOutcomes", expectedOutcomes);
      if (previousExperience) fd.append("previousExperience", previousExperience);
      fd.append("agreement", agreement ? "true" : "false");
      fd.append("sdgMapping", sdgMapping);
      fd.append("pref1", pref1);
      fd.append("pref2", pref2);
      fd.append("pref3", pref3);
      if (comments) fd.append("comments", comments);
      if (synopsis) fd.append("synopsis", synopsis);
      if (presentation) fd.append("presentation", presentation);

      const { data } = await api.post("/api/student/submit", fd);
      setGroup(data.group);
      const latestRes = await api.get("/api/student/submissions/latest");
      setLatest(latestRes.data.submission);
      setViewMode("view");
      toast.success("Submitted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "input-field";
  const labelClass = "block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-full bg-slate-50/50">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 safe-bottom">
        <div className="mb-6 sm:mb-8">
          <h1 className="page-title">Student Dashboard</h1>
          <p className="page-subtitle">Submit your project form and track group allocation.</p>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : group ? (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="card">
              <div className="section-title">Group</div>
              <div className="mt-1 text-xl font-semibold">{group.groupId}</div>
              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <span className={group.status === "Allocated" ? "text-primary-600 font-medium" : "text-amber-600 font-medium"}>
                    {group.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Supervisor:</span>{" "}
                  {group.assignedSupervisor ? (
                    <span>
                      {group.assignedSupervisor.name} ({group.assignedSupervisor.rollNumber})
                    </span>
                  ) : (
                    <span className="text-slate-500">Pending</span>
                  )}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="section-title">Locked Project</div>
              <div className="mt-1 text-lg font-semibold">{group.universalProjectTitle}</div>
              <div className="mt-3 grid gap-2 text-sm">
                <div><span className="font-medium">Domain:</span> {group.domain}</div>
                <div><span className="font-medium">Tech Stack:</span> {group.techStack}</div>
              </div>
            </div>
            <div className="card md:col-span-2">
              <div className="section-title">Team Members</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(group.members || []).map((m) => (
                  <span key={m._id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {m.name} ({m.rollNumber})
                  </span>
                ))}
              </div>
              {group.flaggedForAdmin && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="font-medium">Flagged for admin review</div>
                  <div className="mt-1">{group.flagReason || "Pending"}</div>
                </div>
              )}
            </div>
            <div className="card md:col-span-2">
              <div className="section-title">Files</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-sm font-medium text-slate-800">Synopsis</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {latest?.synopsisFile?.originalName || "No file uploaded"}
                  </div>
                  <div className="mt-3">
                    {latest?.synopsisFile?.path ? (
                      <a
                        className="btn-secondary w-full justify-center"
                        href={`${import.meta.env.VITE_API_URL}${latest.synopsisFile.path}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <button className="btn-secondary w-full justify-center" disabled type="button">
                        View
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-sm font-medium text-slate-800">Presentation</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {latest?.presentationFile?.originalName || "No file uploaded"}
                  </div>
                  <div className="mt-3">
                    {latest?.presentationFile?.path ? (
                      <a
                        className="btn-secondary w-full justify-center"
                        href={`${import.meta.env.VITE_API_URL}${latest.presentationFile.path}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <button className="btn-secondary w-full justify-center" disabled type="button">
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {latest && (
              <div className="card md:col-span-2">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="section-title">Submitted Form</div>
                  {viewMode === "view" ? (
                    <button onClick={handleEditClick} className="btn-primary min-w-0 shrink-0">
                      Edit Form
                    </button>
                  ) : (
                    <button onClick={handleCancelEdit} className="btn-secondary min-w-0 shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
                {viewMode === "view" ? (
                  <div className="space-y-4 text-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-slate-700">Name:</span>{" "}
                        <span className="text-slate-900">{latest.name || "—"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">University Roll No.:</span>{" "}
                        <span className="text-slate-900">{latest.universityRollNo || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Mobile Number:</span>{" "}
                      <span className="text-slate-900">{latest.mobile || "—"}</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-slate-700">Member 1 Roll:</span>{" "}
                        <span className="text-slate-900">{latest.member1Roll || "—"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Member 2 Roll:</span>{" "}
                        <span className="text-slate-900">{latest.member2Roll || "—"}</span>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-slate-700">Member 1 Name:</span>{" "}
                        <span className="text-slate-900">{latest.member1Name || "—"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Member 2 Name:</span>{" "}
                        <span className="text-slate-900">{latest.member2Name || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Project Domain:</span>{" "}
                      <span className="text-slate-900">
                        {latest.projectDomain || "—"}
                        {latest.projectDomain === "Other" && latest.projectDomainOther && ` (${latest.projectDomainOther})`}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Tentative Project Title:</span>{" "}
                      <span className="text-slate-900">{latest.tentativeProjectTitle || "—"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Project Description:</span>
                      <p className="mt-1 text-slate-900 whitespace-pre-wrap">{latest.projectDescription || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Technology Stack:</span>
                      <p className="mt-1 text-slate-900 whitespace-pre-wrap">{latest.technologyStack || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Expected Outcomes:</span>
                      <p className="mt-1 text-slate-900 whitespace-pre-wrap">{latest.expectedOutcomes || "—"}</p>
                    </div>
                    {latest.previousExperience && (
                      <div>
                        <span className="font-medium text-slate-700">Previous Experience:</span>
                        <p className="mt-1 text-slate-900 whitespace-pre-wrap">{latest.previousExperience}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-slate-700">SDG Mapping:</span>{" "}
                      <span className="text-slate-900">{latest.sdgMapping || "—"}</span>
                    </div>
                    {latest.comments && (
                      <div>
                        <span className="font-medium text-slate-700">Comments:</span>
                        <p className="mt-1 text-slate-900 whitespace-pre-wrap">{latest.comments}</p>
                      </div>
                    )}
                    <div className="pt-2 text-xs text-slate-500">
                      Submitted: {latest.submissionTimestamp ? new Date(latest.submissionTimestamp).toLocaleString() : "—"}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                    <div className="mb-4 text-sm font-medium text-slate-700">Edit your submission below. Click Submit to save changes.</div>
                    <form className="space-y-5" onSubmit={onSubmit}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Name (required)</label>
                          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div>
                          <label className={labelClass}>University Roll No. (required)</label>
                          <input className={inputClass} value={universityRollNo} onChange={(e) => setUniversityRollNo(e.target.value)} placeholder="e.g. 2340123" required />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Mobile Number (required)</label>
                        <input className={inputClass} type="tel" value={mobile} onChange={handleMobileChange} placeholder="10 digits" maxLength={10} required />
                        {mobile.length > 0 && mobile.length !== 10 && <p className="mt-1 text-xs text-amber-600">Must be 10 digits</p>}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>1st Group Member University Roll Number (required)</label>
                          <input className={inputClass} value={member1Roll} onChange={(e) => setMember1Roll(e.target.value)} placeholder="2340123" required />
                        </div>
                        <div>
                          <label className={labelClass}>2nd Group Member University Roll Number (required)</label>
                          <input className={inputClass} value={member2Roll} onChange={(e) => setMember2Roll(e.target.value)} placeholder="2340123" required />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>1st Group Member Name (required)</label>
                          <input className={inputClass} value={member1Name} onChange={(e) => setMember1Name(e.target.value)} required />
                        </div>
                        <div>
                          <label className={labelClass}>2nd Group Member Name (required)</label>
                          <input className={inputClass} value={member2Name} onChange={(e) => setMember2Name(e.target.value)} required />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Project Domain (required)</label>
                        <div className="mt-2 space-y-2">
                          {PROJECT_DOMAINS.map((d) => (
                            <label key={d} className="flex items-center gap-2">
                              <input type="radio" name="projectDomain" checked={projectDomain === d} onChange={() => setProjectDomain(d)} />
                              <span className="text-sm">{d}</span>
                            </label>
                          ))}
                        </div>
                        {projectDomain === "Other" && (
                          <input
                            className={`${inputClass} mt-2`}
                            value={projectDomainOther}
                            onChange={(e) => setProjectDomainOther(e.target.value)}
                            placeholder="Specify other domain"
                          />
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Tentative Project Title (required)</label>
                        <input className={inputClass} value={tentativeProjectTitle} onChange={(e) => setTentativeProjectTitle(e.target.value)} required />
                      </div>

                      <div>
                        <label className={labelClass}>Project Description (required) — max 500 words</label>
                        <textarea className={inputClass} rows={5} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} required />
                        <p className={`mt-1 text-xs ${descOverLimit ? "text-red-600" : "text-slate-500"}`}>
                          {descWordCount} / 500 words
                        </p>
                      </div>

                      <div>
                        <label className={labelClass}>Technology Stack (required)</label>
                        <p className="text-xs text-slate-500">Primary technologies, programming languages, or tools planned.</p>
                        <textarea className={inputClass} rows={2} value={technologyStack} onChange={(e) => setTechnologyStack(e.target.value)} required />
                      </div>

                      <div>
                        <label className={labelClass}>Expected Outcomes (required)</label>
                        <textarea className={inputClass} rows={3} value={expectedOutcomes} onChange={(e) => setExpectedOutcomes(e.target.value)} required />
                      </div>

                      <div>
                        <label className={labelClass}>Previous Experience (optional)</label>
                        <p className="text-xs text-slate-500">Detail any previous project work or projects completed/working on.</p>
                        <textarea className={inputClass} rows={2} value={previousExperience} onChange={(e) => setPreviousExperience(e.target.value)} />
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <label className="flex cursor-pointer items-start gap-2">
                          <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} required />
                          <span className="text-sm">
                            Confirm understanding that the project will continue as a Major Project with same Group in Next Coming Semester. (required)
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className={labelClass}>Project Title / Objectives Map With SDGs (required)</label>
                        <select className={inputClass} value={sdgMapping} onChange={(e) => setSdgMapping(e.target.value)} required>
                          <option value="">Select SDG</option>
                          {SDG_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Supervisor Preference (required)</label>
                        <p className="text-xs text-slate-500 mb-2">Select three teachers in order of preference (Priority 1, 2, 3). All must be distinct.</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600">Priority 1</label>
                            <select className={inputClass} value={pref1} onChange={(e) => setPref1(e.target.value)} required>
                              <option value="">Select teacher</option>
                              {teachers.map((t) => (
                                <option key={t._id} value={t._id} disabled={pref2 === t._id || pref3 === t._id}>
                                  {t.name} {pref2 === t._id || pref3 === t._id ? "— Already selected" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600">Priority 2</label>
                            <select className={inputClass} value={pref2} onChange={(e) => setPref2(e.target.value)} required>
                              <option value="">Select teacher</option>
                              {teachers.map((t) => (
                                <option key={t._id} value={t._id} disabled={pref1 === t._id || pref3 === t._id}>
                                  {t.name} {pref1 === t._id || pref3 === t._id ? "— Already selected" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600">Priority 3</label>
                            <select className={inputClass} value={pref3} onChange={(e) => setPref3(e.target.value)} required>
                              <option value="">Select teacher</option>
                              {teachers.map((t) => (
                                <option key={t._id} value={t._id} disabled={pref1 === t._id || pref2 === t._id}>
                                  {t.name} {pref1 === t._id || pref2 === t._id ? "— Already selected" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {(pref1 && pref2 && pref3) && (pref1 === pref2 || pref1 === pref3 || pref2 === pref3) && (
                          <p className="mt-1 text-xs text-red-600">All three preferences must be distinct</p>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Comments (optional)</label>
                        <textarea className={inputClass} rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Synopsis File (optional)</label>
                          <input className="mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700" type="file" onChange={(e) => setSynopsis(e.target.files?.[0] || null)} />
                          {latest?.synopsisFile?.originalName && (
                            <p className="mt-1 text-xs text-slate-500">Current: {latest.synopsisFile.originalName}</p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Presentation File (optional)</label>
                          <input className="mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700" type="file" onChange={(e) => setPresentation(e.target.files?.[0] || null)} />
                          {latest?.presentationFile?.originalName && (
                            <p className="mt-1 text-xs text-slate-500">Current: {latest.presentationFile.originalName}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="submit"
                          disabled={submitting || descOverLimit || !agreement || !pref1 || !pref2 || !pref3 || pref1 === pref2 || pref1 === pref3 || pref2 === pref3}
                          className="btn-primary"
                        >
                          {submitting ? "Submitting..." : "Submit Changes"}
                        </button>
                        <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="mb-6 rounded-xl bg-primary-50/50 p-4 text-sm text-slate-700">
              If you submit first, your project details will be locked for the group. All fields marked required must be filled.
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Name (required)</label>
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>University Roll No. (required)</label>
                  <input className={inputClass} value={universityRollNo} onChange={(e) => setUniversityRollNo(e.target.value)} placeholder="e.g. 2340123" required />
                </div>
              </div>
              <div>
                <label className={labelClass}>Mobile Number (required)</label>
                <input className={inputClass} type="tel" value={mobile} onChange={handleMobileChange} placeholder="10 digits" maxLength={10} required />
                {mobile.length > 0 && mobile.length !== 10 && <p className="mt-1 text-xs text-amber-600">Must be 10 digits</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>1st Group Member University Roll Number (required)</label>
                  <input className={inputClass} value={member1Roll} onChange={(e) => setMember1Roll(e.target.value)} placeholder="2340123" required />
                </div>
                <div>
                  <label className={labelClass}>2nd Group Member University Roll Number (required)</label>
                  <input className={inputClass} value={member2Roll} onChange={(e) => setMember2Roll(e.target.value)} placeholder="2340123" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>1st Group Member Name (required)</label>
                  <input className={inputClass} value={member1Name} onChange={(e) => setMember1Name(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>2nd Group Member Name (required)</label>
                  <input className={inputClass} value={member2Name} onChange={(e) => setMember2Name(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className={labelClass}>Project Domain (required)</label>
                <div className="mt-2 space-y-2">
                  {PROJECT_DOMAINS.map((d) => (
                    <label key={d} className="flex items-center gap-2">
                      <input type="radio" name="projectDomain" checked={projectDomain === d} onChange={() => setProjectDomain(d)} />
                      <span className="text-sm">{d}</span>
                    </label>
                  ))}
                </div>
                {projectDomain === "Other" && (
                  <input
                    className={`${inputClass} mt-2`}
                    value={projectDomainOther}
                    onChange={(e) => setProjectDomainOther(e.target.value)}
                    placeholder="Specify other domain"
                  />
                )}
              </div>

              <div>
                <label className={labelClass}>Tentative Project Title (required)</label>
                <input className={inputClass} value={tentativeProjectTitle} onChange={(e) => setTentativeProjectTitle(e.target.value)} required />
              </div>

              <div>
                <label className={labelClass}>Project Description (required) — max 500 words</label>
                <textarea className={inputClass} rows={5} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} required />
                <p className={`mt-1 text-xs ${descOverLimit ? "text-red-600" : "text-slate-500"}`}>
                  {descWordCount} / 500 words
                </p>
              </div>

              <div>
                <label className={labelClass}>Technology Stack (required)</label>
                <p className="text-xs text-slate-500">Primary technologies, programming languages, or tools planned.</p>
                <textarea className={inputClass} rows={2} value={technologyStack} onChange={(e) => setTechnologyStack(e.target.value)} required />
              </div>

              <div>
                <label className={labelClass}>Expected Outcomes (required)</label>
                <textarea className={inputClass} rows={3} value={expectedOutcomes} onChange={(e) => setExpectedOutcomes(e.target.value)} required />
              </div>

              <div>
                <label className={labelClass}>Previous Experience (optional)</label>
                <p className="text-xs text-slate-500">Detail any previous project work or projects completed/working on.</p>
                <textarea className={inputClass} rows={2} value={previousExperience} onChange={(e) => setPreviousExperience(e.target.value)} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} required />
                  <span className="text-sm">
                    Confirm understanding that the project will continue as a Major Project with same Group in Next Coming Semester. (required)
                  </span>
                </label>
              </div>

              <div>
                <label className={labelClass}>Project Title / Objectives Map With SDGs (required)</label>
                <select className={inputClass} value={sdgMapping} onChange={(e) => setSdgMapping(e.target.value)} required>
                  <option value="">Select SDG</option>
                  {SDG_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Supervisor Preference (required)</label>
                <p className="text-xs text-slate-500 mb-2">Select three teachers in order of preference (Priority 1, 2, 3). All must be distinct.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-600">Priority 1</label>
                    <select className={inputClass} value={pref1} onChange={(e) => setPref1(e.target.value)} required>
                      <option value="">Select teacher</option>
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id} disabled={pref2 === t._id || pref3 === t._id}>
                          {t.name} {pref2 === t._id || pref3 === t._id ? "— Already selected" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Priority 2</label>
                    <select className={inputClass} value={pref2} onChange={(e) => setPref2(e.target.value)} required>
                      <option value="">Select teacher</option>
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id} disabled={pref1 === t._id || pref3 === t._id}>
                          {t.name} {pref1 === t._id || pref3 === t._id ? "— Already selected" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Priority 3</label>
                    <select className={inputClass} value={pref3} onChange={(e) => setPref3(e.target.value)} required>
                      <option value="">Select teacher</option>
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id} disabled={pref1 === t._id || pref2 === t._id}>
                          {t.name} {pref1 === t._id || pref2 === t._id ? "— Already selected" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {(pref1 && pref2 && pref3) && (pref1 === pref2 || pref1 === pref3 || pref2 === pref3) && (
                  <p className="mt-1 text-xs text-red-600">All three preferences must be distinct</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Comments (optional)</label>
                <textarea className={inputClass} rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting || descOverLimit || !agreement || !pref1 || !pref2 || !pref3 || pref1 === pref2 || pref1 === pref3 || pref2 === pref3}
                  className="btn-primary w-full sm:w-auto"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
