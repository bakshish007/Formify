const { asyncHandler } = require("../middleware/asyncHandler");
const Group = require("../models/Group");
const StudentSubmission = require("../models/StudentSubmission");
const StudentMark = require("../models/StudentMark");

// GET /api/teacher/groups
const listMyGroups = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const groups = await Group.find({ assignedSupervisor: teacherId })
    .sort({ createdAt: 1 })
    .populate([
      { path: "leaderId", select: "rollNumber name" },
      { path: "members", select: "rollNumber name" },
      { path: "assignedSupervisor", select: "rollNumber name" }
    ]);
  res.json({ groups });
});

// GET /api/teacher/groups/:groupId/submissions/latest
const getLatestSubmissionForGroup = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId).select("_id assignedSupervisor");
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!group.assignedSupervisor || group.assignedSupervisor.toString() !== teacherId.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const sub = await StudentSubmission.findOne({
    groupId: group._id,
    name: { $exists: true, $ne: "" }
  }).sort({ submissionTimestamp: -1, createdAt: -1 });
  return res.json({ submission: sub || null });
});

// GET /api/teacher/groups/:groupId/submissions
const getAllSubmissionsForGroup = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId).select("_id assignedSupervisor");
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!group.assignedSupervisor || group.assignedSupervisor.toString() !== teacherId.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const submissions = await StudentSubmission.find({
    groupId: group._id,
    name: { $exists: true, $ne: "" }
  })
    .sort({ submissionTimestamp: -1, createdAt: -1 })
    .populate("studentId", "rollNumber name");

  // Return only the latest submission per student.
  const seen = new Set();
  const latestPerStudent = [];
  for (const sub of submissions || []) {
    const sid = sub.studentId?._id?.toString?.() || sub.studentId?.toString?.();
    if (!sid) continue;
    if (seen.has(sid)) continue;
    seen.add(sid);
    latestPerStudent.push(sub);
  }

  return res.json({ submissions: latestPerStudent });
});

// GET /api/teacher/groups/:groupId/marks
const getMyMarks = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .select("_id assignedSupervisor members")
    .populate("members", "rollNumber name");
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!group.assignedSupervisor || group.assignedSupervisor.toString() !== teacherId.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const marks = await StudentMark.find({
    groupId: group._id,
    teacherId
  }).select("studentId marks updatedAt");

  const marksByStudent = Object.fromEntries(marks.map((m) => [m.studentId.toString(), { marks: m.marks, updatedAt: m.updatedAt }]));

  const students = (group.members || []).map((m) => ({
    _id: m._id,
    rollNumber: m.rollNumber,
    name: m.name,
    marks: marksByStudent[m._id.toString()]?.marks ?? null,
    updatedAt: marksByStudent[m._id.toString()]?.updatedAt ?? null
  }));

  return res.json({ students });
});

// PATCH /api/teacher/groups/:groupId/marks/:studentId
const upsertStudentMark = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const { groupId, studentId } = req.params;
  const { marks } = req.body || {};

  const score = Number(marks);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return res.status(400).json({ message: "marks must be a number between 0 and 100" });
  }

  const group = await Group.findById(groupId).select("_id assignedSupervisor members");
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!group.assignedSupervisor || group.assignedSupervisor.toString() !== teacherId.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const isMember = (group.members || []).some((m) => m.toString() === studentId);
  if (!isMember) return res.status(400).json({ message: "Student is not a member of this group" });

  const mark = await StudentMark.findOneAndUpdate(
    { groupId: group._id, studentId, teacherId },
    { $set: { marks: score } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select("studentId marks updatedAt");

  return res.json({ mark });
});

module.exports = { listMyGroups, getLatestSubmissionForGroup, getAllSubmissionsForGroup, getMyMarks, upsertStudentMark };

