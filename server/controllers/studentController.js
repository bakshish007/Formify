const { asyncHandler } = require("../middleware/asyncHandler");
const mongoose = require("mongoose");
const User = require("../models/User");
const Group = require("../models/Group");
const StudentSubmission = require("../models/StudentSubmission");
const { tryAllocateSupervisor } = require("../utils/allocation");

function normRoll(v) {
  return String(v || "").trim().toUpperCase();
}

function uniqueNonEmpty(arr) {
  const set = new Set();
  for (const v of arr) {
    const x = normRoll(v);
    if (x) set.add(x);
  }
  return Array.from(set);
}

async function populateGroupForStudent(group) {
  await group.populate([
    { path: "leaderId", select: "rollNumber name role" },
    { path: "members", select: "rollNumber name role" },
    { path: "assignedSupervisor", select: "rollNumber name role teacherCapacity assignedGroupsCount" }
  ]);
  return group;
}

// POST /api/student/submit
// Form-data: all new form fields + optional synopsis/presentation files.
const submitProject = asyncHandler(async (req, res) => {
  const student = req.user;
  const studentRoll = normRoll(student.rollNumber);

  const {
    name,
    universityRollNo,
    mobile,
    member1Roll,
    member2Roll,
    member1Name,
    member2Name,
    projectDomain,
    projectDomainOther,
    tentativeProjectTitle,
    projectDescription,
    technologyStack,
    expectedOutcomes,
    previousExperience,
    agreement,
    sdgMapping,
    pref1,
    pref2,
    pref3,
    comments
  } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
  if (!universityRollNo || !universityRollNo.trim()) return res.status(400).json({ message: "University Roll No. is required" });
  const mobileStr = String(mobile || "").replace(/\D/g, "");
  if (mobileStr.length !== 10) return res.status(400).json({ message: "Mobile Number must be 10 digits" });
  if (!member1Roll || !member1Roll.trim()) return res.status(400).json({ message: "1st Group Member University Roll Number is required" });
  if (!member2Roll || !member2Roll.trim()) return res.status(400).json({ message: "2nd Group Member University Roll Number is required" });
  if (!member1Name || !member1Name.trim()) return res.status(400).json({ message: "1st Group Member Name is required" });
  if (!member2Name || !member2Name.trim()) return res.status(400).json({ message: "2nd Group Member Name is required" });
  if (!projectDomain || !projectDomain.trim()) return res.status(400).json({ message: "Project Domain is required" });
  const domainValue = projectDomain === "Other" ? (projectDomainOther || "Other").trim() : projectDomain.trim();
  if (!domainValue) return res.status(400).json({ message: "Project Domain (or Other detail) is required" });
  if (!tentativeProjectTitle || !tentativeProjectTitle.trim()) return res.status(400).json({ message: "Tentative Project Title is required" });
  if (!projectDescription || !projectDescription.trim()) return res.status(400).json({ message: "Project Description is required" });
  if (!technologyStack || !technologyStack.trim()) return res.status(400).json({ message: "Technology Stack is required" });
  if (!expectedOutcomes || !expectedOutcomes.trim()) return res.status(400).json({ message: "Expected Outcomes is required" });
  if (agreement !== "true" && agreement !== true) return res.status(400).json({ message: "Agreement to continue as Major Project is required" });
  if (!sdgMapping || !sdgMapping.trim()) return res.status(400).json({ message: "Project Title / Objectives Map With SDGs is required" });
  if (!pref1 || !pref1.trim()) return res.status(400).json({ message: "Supervisor Preference Priority 1 is required" });
  if (!pref2 || !pref2.trim()) return res.status(400).json({ message: "Supervisor Preference Priority 2 is required" });
  if (!pref3 || !pref3.trim()) return res.status(400).json({ message: "Supervisor Preference Priority 3 is required" });

  const partnerRolls = uniqueNonEmpty([member1Roll, member2Roll]);
  if (partnerRolls.includes(studentRoll)) {
    return res.status(400).json({ message: "Group member roll numbers cannot include your own roll number" });
  }

  const prefIds = [pref1, pref2, pref3].map((id) => String(id).trim()).filter(Boolean);
  if (new Set(prefIds).size !== 3) {
    return res.status(400).json({ message: "All three supervisor preferences must be distinct" });
  }

  const validIds = prefIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length !== 3) {
    return res.status(400).json({ message: "Invalid teacher ID format" });
  }

  const prefTeachers = await User.find({
    role: "Teacher",
    _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) }
  }).select("_id rollNumber name");

  if (prefTeachers.length !== 3) {
    return res.status(400).json({ message: "One or more supervisor preferences are invalid" });
  }

  const teacherPreferenceIds = validIds.map((id) => {
    const t = prefTeachers.find((p) => p._id.toString() === id);
    return t ? t._id : null;
  }).filter(Boolean);

  if (teacherPreferenceIds.length !== 3) {
    return res.status(400).json({ message: "All supervisor preferences must be valid teachers" });
  }

  const synopsis = req.files?.synopsis?.[0];
  const presentation = req.files?.presentation?.[0];
  const fileToObj = (f) =>
    f
      ? {
          originalName: f.originalname,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          path: `/uploads/${f.filename}`
        }
      : undefined;

  const rollsToMatch = uniqueNonEmpty([studentRoll, ...partnerRolls]);
  const groups = await Group.find({
    $or: [
      { memberRollNumbers: { $in: rollsToMatch } },
      { expectedPartnerRollNumbers: { $in: rollsToMatch } }
    ]
  }).sort({ createdAt: 1 });

  let group = null;
  if (groups.length > 1) {
    await StudentSubmission.create({
      studentId: student._id,
      name: name.trim(),
      universityRollNo: normRoll(universityRollNo),
      mobile: mobileStr,
      member1Roll: normRoll(member1Roll),
      member2Roll: normRoll(member2Roll),
      member1Name: member1Name.trim(),
      member2Name: member2Name.trim(),
      projectDomain: projectDomain.trim(),
      projectDomainOther: projectDomain === "Other" ? (projectDomainOther || "").trim() : undefined,
      tentativeProjectTitle: tentativeProjectTitle.trim(),
      projectDescription: projectDescription.trim(),
      technologyStack: technologyStack.trim(),
      expectedOutcomes: expectedOutcomes.trim(),
      previousExperience: previousExperience ? previousExperience.trim() : undefined,
      agreement: true,
      sdgMapping: sdgMapping.trim(),
      supervisorPreference: prefRoll,
      comments: comments ? comments.trim() : undefined,
      synopsisFile: fileToObj(synopsis),
      presentationFile: fileToObj(presentation)
    });
    return res.status(409).json({ message: "Multiple groups matched these rolls. Admin review required." });
  }
  if (groups.length === 1) group = groups[0];

  const existingForStudent = await Group.findOne({ memberRollNumbers: studentRoll });
  if (existingForStudent && (!group || existingForStudent._id.toString() !== group._id.toString())) {
    await StudentSubmission.create({
      studentId: student._id,
      groupId: existingForStudent._id,
      name: name.trim(),
      universityRollNo: normRoll(universityRollNo),
      mobile: mobileStr,
      member1Roll: normRoll(member1Roll),
      member2Roll: normRoll(member2Roll),
      member1Name: member1Name.trim(),
      member2Name: member2Name.trim(),
      projectDomain: projectDomain.trim(),
      projectDomainOther: projectDomain === "Other" ? (projectDomainOther || "").trim() : undefined,
      tentativeProjectTitle: tentativeProjectTitle.trim(),
      projectDescription: projectDescription.trim(),
      technologyStack: technologyStack.trim(),
      expectedOutcomes: expectedOutcomes.trim(),
      previousExperience: previousExperience ? previousExperience.trim() : undefined,
      agreement: true,
      sdgMapping: sdgMapping.trim(),
      supervisorPreference: prefRoll,
      comments: comments ? comments.trim() : undefined,
      synopsisFile: fileToObj(synopsis),
      presentationFile: fileToObj(presentation)
    });
    return res.status(409).json({ message: "You are already in another group." });
  }

  if (!group) {
    group = await Group.create({
      leaderId: student._id,
      members: [student._id],
      memberRollNumbers: [studentRoll],
      expectedPartnerRollNumbers: partnerRolls,
      universalProjectTitle: tentativeProjectTitle.trim(),
      domain: domainValue,
      techStack: technologyStack.trim(),
      projectDescription: projectDescription.trim(),
      expectedOutcomes: expectedOutcomes.trim(),
      sdgMapping: sdgMapping.trim(),
      projectDomainOther: projectDomain === "Other" ? (projectDomainOther || "").trim() : undefined,
      teacherPreferences: teacherPreferenceIds,
      status: "Pending"
    });
    const { teacher } = await tryAllocateSupervisor({ teacherPreferenceIds });
    if (teacher) {
      group.assignedSupervisor = teacher._id;
      group.status = "Allocated";
      group.flaggedForAdmin = false;
      group.flagReason = undefined;
    } else {
      group.status = "Pending";
      group.flaggedForAdmin = true;
      group.flagReason = "No preferred teacher had available capacity.";
    }
    await group.save();
  } else {
    const alreadyMember = group.members.some((id) => id.toString() === student._id.toString());
    if (!alreadyMember) group.members.push(student._id);
    if (!group.memberRollNumbers.includes(studentRoll)) group.memberRollNumbers.push(studentRoll);
    for (const r of partnerRolls) {
      if (!group.expectedPartnerRollNumbers.includes(r) && !group.memberRollNumbers.includes(r)) {
        group.expectedPartnerRollNumbers.push(r);
      }
    }
    await group.save();
  }

  // If the student is editing/resubmitting without choosing new files,
  // carry forward the most recent previously-uploaded files so they don't have to re-upload.
  const prev = await StudentSubmission.findOne({
    groupId: group._id,
    studentId: student._id,
    name: { $exists: true, $ne: "" }
  }).sort({ submissionTimestamp: -1, createdAt: -1 });

  const synopsisObj = fileToObj(synopsis) || prev?.synopsisFile;
  const presentationObj = fileToObj(presentation) || prev?.presentationFile;

  // Keep only ONE submission per student per group.
  // Re-submissions overwrite the existing record and bump submissionTimestamp.
  const submission = await StudentSubmission.findOneAndUpdate(
    { groupId: group._id, studentId: student._id },
    {
      $set: {
        name: name.trim(),
        universityRollNo: normRoll(universityRollNo),
        mobile: mobileStr,
        member1Roll: normRoll(member1Roll),
        member2Roll: normRoll(member2Roll),
        member1Name: member1Name.trim(),
        member2Name: member2Name.trim(),
        projectDomain: projectDomain.trim(),
        projectDomainOther: projectDomain === "Other" ? (projectDomainOther || "").trim() : undefined,
        tentativeProjectTitle: tentativeProjectTitle.trim(),
        projectDescription: projectDescription.trim(),
        technologyStack: technologyStack.trim(),
        expectedOutcomes: expectedOutcomes.trim(),
        previousExperience: previousExperience ? previousExperience.trim() : undefined,
        agreement: true,
        sdgMapping: sdgMapping.trim(),
        teacherPreferences: teacherPreferenceIds,
        comments: comments ? comments.trim() : undefined,
        synopsisFile: synopsisObj,
        presentationFile: presentationObj,
        submissionTimestamp: new Date()
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Clean up any historical duplicates (from older behavior).
  await StudentSubmission.deleteMany({
    groupId: group._id,
    studentId: student._id,
    _id: { $ne: submission._id }
  });

  await populateGroupForStudent(group);
  return res.status(201).json({ group, submissionId: submission._id });
});

// GET /api/student/me
const getMyGroup = asyncHandler(async (req, res) => {
  const studentRoll = normRoll(req.user.rollNumber);
  const group = await Group.findOne({ memberRollNumbers: studentRoll });
  if (!group) return res.json({ group: null });
  await populateGroupForStudent(group);
  return res.json({ group });
});

// POST /api/student/upload (upload files after group exists)
const uploadMyFiles = asyncHandler(async (req, res) => {
  const studentRoll = normRoll(req.user.rollNumber);
  const group = await Group.findOne({ memberRollNumbers: studentRoll });
  if (!group) return res.status(404).json({ message: "No group found for this student" });

  const synopsis = req.files?.synopsis?.[0];
  const presentation = req.files?.presentation?.[0];
  if (!synopsis && !presentation) {
    return res.status(400).json({ message: "Upload at least one file: synopsis or presentation" });
  }

  const fileToObj = (f) =>
    f
      ? {
          originalName: f.originalname,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          path: `/uploads/${f.filename}`
        }
      : undefined;

  // IMPORTANT: do not create a new "file-only" submission.
  // Attach uploads to the student's latest real submission to avoid blank duplicates.
  const latestReal = await StudentSubmission.findOne({
    groupId: group._id,
    studentId: req.user._id,
    name: { $exists: true, $ne: "" }
  }).sort({ submissionTimestamp: -1, createdAt: -1 });

  if (!latestReal) {
    return res.status(404).json({ message: "No existing submission found to attach files. Please submit the form first." });
  }

  if (synopsis) latestReal.synopsisFile = fileToObj(synopsis);
  if (presentation) latestReal.presentationFile = fileToObj(presentation);
  await latestReal.save();

  await populateGroupForStudent(group);
  return res.status(200).json({ group, submissionId: latestReal._id });
});

// GET /api/student/submissions/latest
const getLatestMySubmission = asyncHandler(async (req, res) => {
  const studentRoll = normRoll(req.user.rollNumber);
  const group = await Group.findOne({ memberRollNumbers: studentRoll }).select("_id");
  if (!group) return res.json({ submission: null });

  const submission = await StudentSubmission.findOne({
    groupId: group._id,
    studentId: req.user._id,
    name: { $exists: true, $ne: "" }
  })
    .populate("teacherPreferences", "_id rollNumber name")
    .sort({ submissionTimestamp: -1, createdAt: -1 });
  return res.json({ submission: submission || null });
});

// GET /api/student/teachers
const listTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: "Teacher" })
    .sort({ name: 1 })
    .select("_id rollNumber name teacherCapacity assignedGroupsCount");
  res.json({ teachers });
});

module.exports = { submitProject, getMyGroup, uploadMyFiles, getLatestMySubmission, listTeachers };

