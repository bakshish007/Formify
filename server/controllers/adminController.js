const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const { asyncHandler } = require("../middleware/asyncHandler");
const User = require("../models/User");
const Group = require("../models/Group");
const StudentSubmission = require("../models/StudentSubmission");
const AdminOverrideLog = require("../models/AdminOverrideLog");
const StudentMark = require("../models/StudentMark");
const GroupMark = require("../models/GroupMark");
const { tryAllocateSupervisor } = require("../utils/allocation");

function normRoll(v) {
  return String(v || "").trim().toUpperCase();
}

async function resolveGroupByParam(groupIdParam) {
  const raw = String(groupIdParam || "").trim();
  if (!raw) return null;
  return (
    (mongoose.Types.ObjectId.isValid(raw) ? await Group.findById(raw) : null) ||
    (await Group.findOne({ groupId: raw.toUpperCase() }))
  );
}

// POST /api/admin/users  (create Student/Teacher/Admin)
const createUser = asyncHandler(async (req, res) => {
  const { rollNumber, name, password, role, teacherCapacity } = req.body || {};
  const roll = normRoll(rollNumber);

  if (!roll || !name || !password || !role) {
    return res.status(400).json({ message: "rollNumber, name, password, role are required" });
  }

  const existing = await User.findOne({ rollNumber: roll });
  if (existing) return res.status(409).json({ message: "rollNumber already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const doc = await User.create({
    rollNumber: roll,
    name: String(name).trim(),
    role,
    passwordHash,
    teacherCapacity: role === "Teacher" ? Number(teacherCapacity || 0) : 0
  });

  return res.status(201).json({
    user: { id: doc._id, rollNumber: doc.rollNumber, name: doc.name, role: doc.role, teacherCapacity: doc.teacherCapacity }
  });
});

// PATCH /api/admin/teachers/:teacherId/capacity
const updateTeacherCapacity = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { teacherCapacity } = req.body || {};
  const cap = Number(teacherCapacity);
  if (!Number.isFinite(cap) || cap < 0) return res.status(400).json({ message: "Invalid capacity" });

  const teacher = await User.findOneAndUpdate(
    { _id: teacherId, role: "Teacher" },
    { $set: { teacherCapacity: cap } },
    { new: true }
  ).select("rollNumber name role teacherCapacity assignedGroupsCount");

  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  res.json({ teacher });
});

// GET /api/admin/teachers
const listTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: "Teacher" })
    .sort({ rollNumber: 1 })
    .select("_id rollNumber name role teacherCapacity assignedGroupsCount");
  res.json({ teachers });
});

// PATCH /api/admin/teachers/:teacherId (full update: name, rollNumber, password, teacherCapacity)
const updateTeacher = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { name, rollNumber, password, teacherCapacity } = req.body || {};

  const teacher = await User.findOne({ _id: teacherId, role: "Teacher" });
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });

  const updates = {};
  if (name !== undefined && String(name).trim()) updates.name = String(name).trim();
  if (rollNumber !== undefined) {
    const roll = normRoll(rollNumber);
    if (!roll) return res.status(400).json({ message: "rollNumber cannot be empty" });
    const existing = await User.findOne({ rollNumber: roll, _id: { $ne: teacherId } });
    if (existing) return res.status(409).json({ message: "rollNumber already exists" });
    updates.rollNumber = roll;
  }
  if (password !== undefined && String(password).trim()) {
    updates.passwordHash = await bcrypt.hash(String(password).trim(), 10);
  }
  if (teacherCapacity !== undefined) {
    const cap = Number(teacherCapacity);
    if (!Number.isFinite(cap) || cap < 0) return res.status(400).json({ message: "Invalid capacity" });
    updates.teacherCapacity = cap;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  const updated = await User.findByIdAndUpdate(teacherId, { $set: updates }, { new: true })
    .select("_id rollNumber name role teacherCapacity assignedGroupsCount");
  res.json({ teacher: updated });
});

// DELETE /api/admin/teachers/:teacherId
const deleteTeacher = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  const teacher = await User.findOne({ _id: teacherId, role: "Teacher" });
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });

  // Unassign from all groups they supervise
  await Group.updateMany(
    { assignedSupervisor: teacherId },
    {
      $unset: { assignedSupervisor: 1 },
      $set: {
        status: "Pending",
        flaggedForAdmin: true,
        flagReason: "Supervisor removed. Reassign required."
      }
    }
  );

  // Remove from teacherPreferences in groups
  await Group.updateMany(
    { teacherPreferences: teacherId },
    { $pull: { teacherPreferences: teacherId } }
  );

  await User.findByIdAndDelete(teacherId);
  res.json({ message: "Teacher deleted" });
});

// GET /api/admin/students
const listStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: "Student" })
    .sort({ rollNumber: 1 })
    .select("_id rollNumber name role createdAt");
  res.json({ students });
});

// PATCH /api/admin/students/:studentId
const updateStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { name, rollNumber, password } = req.body || {};

  const student = await User.findOne({ _id: studentId, role: "Student" });
  if (!student) return res.status(404).json({ message: "Student not found" });

  const updates = {};
  if (name !== undefined && String(name).trim()) updates.name = String(name).trim();
  if (rollNumber !== undefined) {
    const roll = normRoll(rollNumber);
    if (!roll) return res.status(400).json({ message: "rollNumber cannot be empty" });
    const existing = await User.findOne({ rollNumber: roll, _id: { $ne: studentId } });
    if (existing) return res.status(409).json({ message: "rollNumber already exists" });
    updates.rollNumber = roll;
  }
  if (password !== undefined && String(password).trim()) {
    updates.passwordHash = await bcrypt.hash(String(password).trim(), 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  const updated = await User.findByIdAndUpdate(studentId, { $set: updates }, { new: true })
    .select("_id rollNumber name role");
  res.json({ student: updated });
});

// DELETE /api/admin/students/:studentId
const deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await User.findOne({ _id: studentId, role: "Student" });
  if (!student) return res.status(404).json({ message: "Student not found" });

  const studentRoll = student.rollNumber;

  // Remove from groups
  const groups = await Group.find({ memberRollNumbers: studentRoll });
  for (const g of groups) {
    g.members = (g.members || []).filter((id) => id.toString() !== studentId);
    g.memberRollNumbers = (g.memberRollNumbers || []).filter((r) => normRoll(r) !== normRoll(studentRoll));
    if (g.leaderId?.toString() === studentId) {
      g.leaderId = g.members[0] || null;
    }
    if (g.members.length === 0) {
      await Group.findByIdAndDelete(g._id);
    } else {
      await g.save();
    }
  }

  // Delete student submissions
  await StudentSubmission.deleteMany({ studentId });

  await User.findByIdAndDelete(studentId);
  res.json({ message: "Student deleted" });
});

// GET /api/admin/groups
const listAllGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find()
    .sort({ createdAt: 1 })
    .populate([
      { path: "leaderId", select: "rollNumber name" },
      { path: "members", select: "rollNumber name" },
      { path: "assignedSupervisor", select: "rollNumber name" },
      { path: "teacherPreferences", select: "rollNumber name" }
    ]);
  res.json({ groups });
});

// GET /api/admin/groups/flagged
const listFlaggedGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ flaggedForAdmin: true })
    .sort({ createdAt: 1 })
    .populate([
      { path: "leaderId", select: "rollNumber name" },
      { path: "members", select: "rollNumber name" },
      { path: "assignedSupervisor", select: "rollNumber name" },
      { path: "teacherPreferences", select: "rollNumber name" }
    ]);
  res.json({ groups });
});

// PATCH /api/admin/groups/:groupId/reset-supervisor
const resetGroupSupervisor = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { reason } = req.body || {};

  const group = await resolveGroupByParam(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });

  const oldSupervisorId = group.assignedSupervisor ? group.assignedSupervisor.toString() : null;
  if (oldSupervisorId) {
    await User.updateOne(
      { _id: oldSupervisorId, role: "Teacher" },
      [
        {
          $set: {
            assignedGroupsCount: { $max: [0, { $subtract: ["$assignedGroupsCount", 1] }] }
          }
        }
      ]
    );
  }

  group.assignedSupervisor = undefined;
  group.status = "Pending";
  group.flaggedForAdmin = true;
  group.flagReason = reason || "Supervisor reset by admin. Reassign required.";
  await group.save();

  const populated = await Group.findById(group._id).populate([
    { path: "leaderId", select: "rollNumber name" },
    { path: "members", select: "rollNumber name" },
    { path: "assignedSupervisor", select: "rollNumber name" }
  ]);

  res.json({ group: populated });
});

// DELETE /api/admin/groups/:groupId
const deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await resolveGroupByParam(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });

  const oldSupervisorId = group.assignedSupervisor ? group.assignedSupervisor.toString() : null;
  if (oldSupervisorId) {
    await User.updateOne(
      { _id: oldSupervisorId, role: "Teacher" },
      [
        {
          $set: {
            assignedGroupsCount: { $max: [0, { $subtract: ["$assignedGroupsCount", 1] }] }
          }
        }
      ]
    );
  }

  await StudentSubmission.deleteMany({ groupId: group._id });
  await StudentMark.deleteMany({ groupId: group._id });
  await GroupMark.deleteMany({ groupId: group._id });

  await Group.findByIdAndDelete(group._id);
  res.json({ message: "Group deleted" });
});

// PATCH /api/admin/groups/:groupId/override-supervisor
const overrideSupervisor = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { supervisorId, reason, force } = req.body || {};
  if (!supervisorId) return res.status(400).json({ message: "supervisorId is required" });

  const group = await resolveGroupByParam(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });

  const oldSupervisorId = group.assignedSupervisor ? group.assignedSupervisor.toString() : null;
  if (oldSupervisorId && oldSupervisorId === String(supervisorId)) {
    const populatedSame = await Group.findById(group._id).populate([
      { path: "leaderId", select: "rollNumber name" },
      { path: "members", select: "rollNumber name" },
      { path: "assignedSupervisor", select: "rollNumber name teacherCapacity assignedGroupsCount" }
    ]);
    return res.json({ group: populatedSame });
  }

  const sup = await User.findOne({ _id: supervisorId, role: "Teacher" }).select(
    "_id rollNumber name teacherCapacity assignedGroupsCount"
  );
  if (!sup) return res.status(400).json({ message: "Supervisor must be a Teacher" });

  const before = { assignedSupervisor: group.assignedSupervisor, status: group.status, flaggedForAdmin: group.flaggedForAdmin };

  // Capacity accounting:
  // - decrement old supervisor count (if any and different)
  // - increment new supervisor count (respect capacity unless force=true)
  if (oldSupervisorId) {
    await User.updateOne(
      { _id: oldSupervisorId, role: "Teacher" },
      [
        {
          $set: {
            assignedGroupsCount: { $max: [0, { $subtract: ["$assignedGroupsCount", 1] }] }
          }
        }
      ]
    );
  }

  if (force) {
    await User.updateOne({ _id: sup._id, role: "Teacher" }, { $inc: { assignedGroupsCount: 1 } });
  } else {
    const { teacher } = await tryAllocateSupervisor({ teacherPreferenceIds: [sup._id] });
    if (!teacher) {
      return res.status(409).json({ message: "Selected supervisor has no remaining capacity. Use force override." });
    }
  }

  group.assignedSupervisor = sup._id;
  group.status = "Allocated";
  group.flaggedForAdmin = false;
  group.flagReason = undefined;
  await group.save();

  await AdminOverrideLog.create({
    adminId: req.user._id,
    groupId: group._id,
    action: "override-supervisor",
    from: before,
    to: { assignedSupervisor: sup._id, status: group.status, flaggedForAdmin: group.flaggedForAdmin },
    reason
  });

  const populated = await Group.findById(group._id).populate([
    { path: "leaderId", select: "rollNumber name" },
    { path: "members", select: "rollNumber name" },
    { path: "assignedSupervisor", select: "rollNumber name" }
  ]);

  res.json({ group: populated });
});

// GET /api/admin/override-logs
const listOverrideLogs = asyncHandler(async (req, res) => {
  const logs = await AdminOverrideLog.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate([
      { path: "adminId", select: "rollNumber name" },
      { path: "groupId", select: "groupId universalProjectTitle" }
    ]);
  res.json({ logs });
});

// GET /api/admin/export/groups
const exportGroupsExcel = asyncHandler(async (req, res) => {
  const groups = await Group.find()
    .sort({ createdAt: 1 })
    .populate([
      { path: "leaderId", select: "rollNumber name" },
      { path: "members", select: "rollNumber name" },
      { path: "assignedSupervisor", select: "rollNumber name" }
    ]);

  const rows = groups.map((g) => ({
    GroupID: g.groupId,
    Status: g.status,
    Flagged: g.flaggedForAdmin ? "YES" : "NO",
    FlagReason: g.flagReason || "",
    LeaderRoll: g.leaderId?.rollNumber || "",
    LeaderName: g.leaderId?.name || "",
    Members: (g.members || []).map((m) => `${m.rollNumber} - ${m.name}`).join(" | "),
    UniversalTitle: g.universalProjectTitle,
    Domain: g.domain,
    TechStack: g.techStack,
    SupervisorRoll: g.assignedSupervisor?.rollNumber || "",
    SupervisorName: g.assignedSupervisor?.name || "",
    CreatedAt: g.createdAt?.toISOString?.() || ""
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, "Groups");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=\"formify-groups.xlsx\"");
  return res.send(buf);
});

// GET /api/admin/groups/:groupId/submissions
const getGroupSubmissions = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await Group.findById(groupId).select("_id");
  if (!group) return res.status(404).json({ message: "Group not found" });

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

// GET /api/admin/submissions
const getAllSubmissions = asyncHandler(async (req, res) => {
  const submissions = await StudentSubmission.find({ name: { $exists: true, $ne: "" } })
    .sort({ submissionTimestamp: -1, createdAt: -1 })
    .populate("studentId", "rollNumber name")
    .populate("groupId", "groupId universalProjectTitle");
  // Return only the latest submission per student (students are in one group).
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

module.exports = {
  createUser,
  updateTeacherCapacity,
  updateTeacher,
  deleteTeacher,
  listTeachers,
  listStudents,
  updateStudent,
  deleteStudent,
  listAllGroups,
  listFlaggedGroups,
  resetGroupSupervisor,
  deleteGroup,
  overrideSupervisor,
  listOverrideLogs,
  exportGroupsExcel,
  getGroupSubmissions,
  getAllSubmissions
};

